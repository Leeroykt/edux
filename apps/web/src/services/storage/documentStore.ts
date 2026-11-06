"use client";

import { DocumentMeta, DocumentParagraphNode } from "@edux/schema";
import { EquationMap } from "../../lib/equations";

export interface StoredDocument {
  meta: DocumentMeta;
  paragraphs: DocumentParagraphNode[];
  /** Equations found in the file, keyed by the id used in the text tokens. */
  equations?: EquationMap;
  timestamp: number;
}

// Global in-memory singleton cache (preserves large documents across SPA transitions)
let inMemoryActiveDoc: StoredDocument | null = null;
const byId = new Map<string, StoredDocument>();
const sources = new Map<string, ArrayBuffer>();

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openIndexedDB();
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    try {
      const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** A document saved on this device, by id. */
export async function getStoredDocument(id: string): Promise<StoredDocument | null> {
  const hit = byId.get(id) ?? (inMemoryActiveDoc?.meta.id === id ? inMemoryActiveDoc : null);
  if (hit) return hit;
  const doc = await idbGet<StoredDocument>(`doc:${id}`);
  if (doc) byId.set(id, doc);
  return doc;
}

/** Keeps the Word file a document was uploaded from, so an export can change only what was edited. */
export async function saveSourceFile(id: string, file: ArrayBuffer): Promise<void> {
  sources.set(id, file);
  await idbPut(`source:${id}`, file);
}

export async function getSourceFile(id: string): Promise<ArrayBuffer | null> {
  const hit = sources.get(id);
  if (hit) return hit;
  const file = await idbGet<ArrayBuffer>(`source:${id}`);
  if (file) sources.set(id, file);
  return file;
}

const DB_NAME = "edux_storage_db";
const STORE_NAME = "active_manuscript";
const ACTIVE_KEY = "current_active_doc";

/**
 * Open IndexedDB safely in browser
 */
function openIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Persist document into memory and IndexedDB (eliminates 5MB sessionStorage quota errors)
 */
export async function setActiveDocument(
  meta: DocumentMeta,
  paragraphs: DocumentParagraphNode[],
  equations: EquationMap = {}
): Promise<void> {
  const docPayload: StoredDocument = {
    meta,
    paragraphs,
    equations,
    timestamp: Date.now(),
  };

  // 1. Immediately store in fast memory cache
  inMemoryActiveDoc = docPayload;
  byId.set(meta.id, docPayload);

  // 2. Persist to IndexedDB (asynchronously, supports 100MB+ dissertations)
  try {
    const db = await openIndexedDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.put(docPayload, ACTIVE_KEY);
          // Every document is also kept under its own id, so switching documents never loses its formatting.
          store.put(docPayload, `doc:${meta.id}`);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  } catch (err) {
    console.warn("IndexedDB persistence warning:", err);
  }

  // 3. Fallback to sessionStorage with safe quota handling (never throws)
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("active_document", JSON.stringify(docPayload));
    } catch {
      // Storage quota exceeded on 30k+ word documents; safely ignored since IndexedDB and in-memory cache hold the data
    }
  }
}

/**
 * Retrieve active document from memory cache, IndexedDB, or sessionStorage fallback
 */
export async function getActiveDocument(): Promise<StoredDocument | null> {
  // 1. Return in-memory cache if available
  if (inMemoryActiveDoc) {
    return inMemoryActiveDoc;
  }

  // 2. Load from IndexedDB
  try {
    const db = await openIndexedDB();
    if (db) {
      const doc = await new Promise<StoredDocument | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(ACTIVE_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (doc) {
        inMemoryActiveDoc = doc;
        return doc;
      }
    }
  } catch (err) {
    console.warn("IndexedDB retrieval warning:", err);
  }

  // 3. Fallback to sessionStorage
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem("active_document");
      if (raw) {
        const parsed = JSON.parse(raw);
        inMemoryActiveDoc = parsed;
        return parsed;
      }
    } catch {}
  }

  return null;
}

/**
 * Clear stored document
 */
export async function clearActiveDocument(): Promise<void> {
  inMemoryActiveDoc = null;
  try {
    const db = await openIndexedDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(ACTIVE_KEY);
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem("active_document");
    } catch {}
  }
}
