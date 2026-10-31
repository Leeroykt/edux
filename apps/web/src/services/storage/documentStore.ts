"use client";

import { DocumentMeta, DocumentParagraphNode } from "@edux/schema";

export interface StoredDocument {
  meta: DocumentMeta;
  paragraphs: DocumentParagraphNode[];
  timestamp: number;
}

// Global in-memory singleton cache (preserves large documents across SPA transitions)
let inMemoryActiveDoc: StoredDocument | null = null;

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
  paragraphs: DocumentParagraphNode[]
): Promise<void> {
  const docPayload: StoredDocument = {
    meta,
    paragraphs,
    timestamp: Date.now(),
  };

  // 1. Immediately store in fast memory cache
  inMemoryActiveDoc = docPayload;

  // 2. Persist to IndexedDB (asynchronously, supports 100MB+ dissertations)
  try {
    const db = await openIndexedDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.put(docPayload, ACTIVE_KEY);
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
