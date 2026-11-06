import {
  DocumentMeta,
  DocumentParagraphNode,
  SimilarityReport,
  UsageSummary,
  VoiceProfile,
  SuggestionCandidate,
  DocumentStage,
  SentenceScore,
  User,
  DocumentDialect,
  WritingMode,
  CitationStyle
} from "@edux/schema";
import {
  MOCK_DOCUMENT,
  MOCK_PARAGRAPHS,
  MOCK_SUGGESTIONS,
  MOCK_SIMILARITY_REPORT,
  MOCK_USAGE,
  MOCK_VOICE_PROFILE,
  MOCK_EDU_PRO_PAPERS,
  MOCK_USER
} from "./mockData";

const API_BASE = "/api/v1";

export interface ScanProgress {
  documentId: string;
  status: "running" | "done" | "failed";
  total: number;
  done: number;
  cursor: number;
  error?: string;
  overallAiScore?: number;
  scores: SentenceScore[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export class EduxApiClient {
  private token: string | null = null;
  private currentUser: User | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.token = localStorage.getItem("edux_token") || null;
        const cachedUser = localStorage.getItem("edux_user");
        if (cachedUser) {
          this.currentUser = JSON.parse(cachedUser);
        }
      } catch {
        // ignore storage access errors
      }
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      try {
        this.token = localStorage.getItem("edux_token") || null;
      } catch {
        // ignore
      }
    }
    return this.token;
  }

  public setToken(token: string | null, user?: User | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      try {
        if (token) {
          localStorage.setItem("edux_token", token);
        } else {
          localStorage.removeItem("edux_token");
        }
        if (user) {
          this.currentUser = user;
          localStorage.setItem("edux_user", JSON.stringify(user));
        } else if (token === null) {
          this.currentUser = null;
          localStorage.removeItem("edux_user");
        }
      } catch {
        // ignore
      }
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
    if (typeof window !== "undefined") {
      try {
        if (user) {
          localStorage.setItem("edux_user", JSON.stringify(user));
        } else {
          localStorage.removeItem("edux_user");
        }
      } catch {}
    }
  }

  /** Takes over a session the server set as a cookie (after signing in with Google). */
  async resumeSession(): Promise<boolean> {
    return this.refreshAccessToken();
  }

  private refreshing: Promise<boolean> | null = null;

  /** Renews the access token from the httpOnly refresh cookie. One attempt at a time. */
  private refreshAccessToken(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = (async () => {
        try {
          const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
          if (!res.ok) return false;
          const data = await res.json();
          this.setToken(data.accessToken, data.user ?? this.currentUser);
          return true;
        } catch {
          return false;
        } finally {
          setTimeout(() => (this.refreshing = null), 0);
        }
      })();
    }
    return this.refreshing;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (typeof window === "undefined") {
      // Avoid relative URL SSR fetch errors on Node
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const send = () => {
      const headers = new Headers(options.headers || {});
      if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      const token = this.getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const fullUrl = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
      return fetch(fullUrl, { ...options, headers });
    };

    let res = await send();

    // An expired access token is renewed once, quietly, and the request is retried.
    if (res.status === 401 && this.getToken() && !endpoint.startsWith("/auth/")) {
      if (await this.refreshAccessToken()) {
        res = await send();
      }
      if (res.status === 401) {
        // The session really has ended.
        this.setToken(null, null);
        window.dispatchEvent(new CustomEvent("edux:session-expired"));
      }
    }

    return res;
  }

  /* ---------------- AUTHENTICATION ---------------- */
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: "Login failed" } }));
      throw new Error(err.error?.message || "Invalid credentials.");
    }

    const data: AuthResponse = await res.json();
    this.setToken(data.accessToken, data.user);
    return data;
  }

  async register(payload: { name: string; email: string; password: string; role?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: "Registration failed" } }));
      throw new Error(err.error?.message || "Registration failed.");
    }

    const data = await res.json();
    // Best practice: Do NOT set token on register. Require explicit login.
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.fetchWithAuth("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      this.setToken(null, null);
    }
  }

  async getMe(): Promise<{ user: User; usage: UsageSummary } | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await this.fetchWithAuth("/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) this.currentUser = data.user;
        return data;
      }
    } catch (e) {
      console.warn("getMe error:", e);
    }
    return null;
  }

  async updateProfile(patch: { name?: string; institution?: string; fieldOfStudy?: string }): Promise<User> {
    const res = await this.fetchWithAuth("/me", { method: "PATCH", body: JSON.stringify(patch) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || "Your profile could not be saved.");
    this.setCurrentUser(data.user);
    return data.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await this.fetchWithAuth("/auth/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || "Your password could not be changed.");
    }
  }

  /* ---------------- DOCUMENTS API ---------------- */
  async getDocuments(): Promise<DocumentMeta[]> {
    try {
      const res = await this.fetchWithAuth("/documents");
      if (res.ok) {
        const data = await res.json();
        return data.documents || [];
      }
    } catch (err) {
      console.warn("Failed to fetch documents from server:", err);
    }
    return [];
  }

  async getDocument(id: string): Promise<DocumentMeta> {
    if (id === MOCK_DOCUMENT.id) return { ...MOCK_DOCUMENT };
    try {
      const res = await this.fetchWithAuth(`/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        return data.document || data;
      }
    } catch (err) {
      console.warn(`Failed to fetch document ${id}, fallback:`, err);
    }
    return { ...MOCK_DOCUMENT, id };
  }

  async getDocumentStructure(id: string): Promise<DocumentParagraphNode[]> {
    if (id === MOCK_DOCUMENT.id) return JSON.parse(JSON.stringify(MOCK_PARAGRAPHS));
    const res = await this.fetchWithAuth(`/documents/${id}/structure`);
    if (!res.ok) throw new Error("This document could not be loaded from the server.");
    const data = await res.json();
    if (!Array.isArray(data.paragraphs) || data.paragraphs.length === 0) {
      throw new Error("This document has no content on the server.");
    }
    return data.paragraphs;
  }

  async createDocument(payload: {
    id?: string;
    title: string;
    paragraphs: DocumentParagraphNode[];
    folderId?: string;
    ownerDeclaredOwn?: boolean;
  }): Promise<DocumentMeta> {
    // The server only needs structure and text; HTML and images stay in the browser.
    const slim = payload.paragraphs.map((p) => ({
      id: p.id,
      type: p.type,
      styleName: p.styleName,
      sentences: p.sentences.map((s) => ({
        id: s.id,
        text: s.text,
        charStart: s.charStart,
        charEnd: s.charEnd,
        locked: s.locked,
        ignored: s.ignored,
      })),
    }));
    const res = await this.fetchWithAuth("/documents", {
      method: "POST",
      body: JSON.stringify({ ...payload, paragraphs: slim }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: "Create document failed" } }));
      throw new Error(err.error?.message || "Failed to create document.");
    }
    const data = await res.json();
    return data.document;
  }

  /** Scores arrived since `after`, plus overall progress of the background scan. */
  async getScanProgress(docId: string, after = 0): Promise<ScanProgress | "missing" | null> {
    try {
      const res = await this.fetchWithAuth(`/documents/${docId}/scores?after=${after}`);
      if (res.ok) return await res.json();
      if (res.status === 404) return "missing";
    } catch (err) {
      console.warn("Scan progress request failed:", err);
    }
    return null;
  }

  /**
   * Follows a scan over one streaming connection. Resolves "ended" when the
   * server finished the stream, "missing" if the document is gone, and
   * "unavailable" if streaming is not possible so the caller can poll instead.
   */
  async streamScan(
    docId: string,
    after: number,
    onEvent: (event: ScanProgress) => void,
    signal: AbortSignal
  ): Promise<"ended" | "missing" | "unavailable"> {
    try {
      const res = await this.fetchWithAuth(`/documents/${docId}/scores/stream?after=${after}`, { signal });
      if (res.status === 404) return "missing";
      if (!res.ok || !res.body) return "unavailable";

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return "ended";
        buffer += decoder.decode(value, { stream: true });
        let split: number;
        while ((split = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (line) {
            try {
              onEvent(JSON.parse(line.slice(6)));
            } catch {
              // ignore a malformed frame
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return "ended";
      return "unavailable";
    }
  }

  /** Saves typed changes: the paragraphs that changed, the ones removed, and the paragraph order. */
  async syncDocument(
    docId: string,
    payload: {
      nodes: { id: string; type: string; styleName?: string; sentences: { id: string; text: string; locked: boolean; ignored: boolean }[] }[];
      removedNodeIds: string[];
      order: string[];
      wordCount: number;
    }
  ): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth(`/documents/${docId}/sync`, { method: "POST", body: JSON.stringify(payload) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async startScan(docId: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth(`/documents/${docId}/score`, { method: "POST" });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Re-scores one sentence, optionally against replacement text. */
  async rescoreSentence(sentenceId: string, text?: string): Promise<SentenceScore | null> {
    try {
      const res = await this.fetchWithAuth(`/sentences/${sentenceId}/score`, {
        method: "POST",
        body: JSON.stringify(text ? { text } : {}),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.notScored || typeof data.score !== "number") return null;
      return data as SentenceScore;
    } catch {
      return null;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    const res = await this.fetchWithAuth(`/documents/${id}`, {
      method: "DELETE",
    });
    return res.ok;
  }

  async updateDocumentStage(docId: string, stage: DocumentStage): Promise<void> {
    try {
      await this.fetchWithAuth(`/documents/${docId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      });
    } catch (err) {
      console.warn("Failed to update document stage:", err);
    }
  }

  /** Saves a document's language, writing type or referencing style. A document that exists only on this device is skipped quietly. */
  async updateDocumentSettings(
    docId: string,
    patch: { dialect?: DocumentDialect; writingMode?: WritingMode; citationStyle?: CitationStyle }
  ): Promise<void> {
    try {
      await this.fetchWithAuth(`/documents/${docId}`, { method: "PATCH", body: JSON.stringify(patch) });
    } catch (err) {
      console.warn("Failed to save document settings:", err);
    }
  }

  /* ---------------- SUGGESTIONS & REWRITES ---------------- */
  async getSentenceSuggestions(
    sentenceId: string,
    options: {
      tone?: "neutral" | "academic" | "conversational";
      strength?: "light" | "moderate" | "full";
      formality?: number;
      dialect?: "en-GB" | "en-US";
    } = {},
    signal?: AbortSignal
  ): Promise<SuggestionCandidate[]> {
    const res = await this.fetchWithAuth(`/sentences/${sentenceId}/suggest`, {
      method: "POST",
      body: JSON.stringify(options),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || "Could not generate rewrites.");
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.suggestions)) return data.suggestions;
    return [];
  }

  async applySuggestion(
    sentenceId: string,
    payload: { suggestionId?: string; text: string; kind?: "rewrite" | "spelling" }
  ): Promise<{ success: boolean; newVersionId: string }> {
    try {
      const res = await this.fetchWithAuth(`/sentences/${sentenceId}/apply`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Failed to apply suggestion for ${sentenceId}:`, err);
    }
    return { success: true, newVersionId: `v_${Date.now()}` };
  }

  async toggleSentenceLock(sentenceId: string): Promise<{ success: boolean; locked: boolean }> {
    const res = await this.fetchWithAuth(`/sentences/${sentenceId}/lock`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error("Failed to toggle sentence lock.");
    }
    return res.json();
  }

  /* ---------------- REPORTS & METER ---------------- */
  async getSimilarityReport(docId: string): Promise<SimilarityReport> {
    if (docId === MOCK_DOCUMENT.id) return { ...MOCK_SIMILARITY_REPORT, documentId: docId };
    try {
      const res = await this.fetchWithAuth(`/documents/${docId}/reports/latest`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Failed to fetch similarity report:", err);
    }
    return { ...MOCK_SIMILARITY_REPORT, documentId: docId };
  }

  async getUsage(): Promise<UsageSummary> {
    try {
      const res = await this.fetchWithAuth("/usage");
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Failed to fetch usage:", err);
    }
    return MOCK_USAGE;
  }

  async getVoiceProfile(): Promise<VoiceProfile> {
    try {
      const res = await this.fetchWithAuth("/me/voice-profile");
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Failed to fetch voice profile:", err);
    }
    return MOCK_VOICE_PROFILE;
  }

  async getEduProDocuments(): Promise<DocumentMeta[]> {
    try {
      const res = await this.fetchWithAuth("/folders/current/documents");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (err) {
      console.warn("Failed to fetch folder docs:", err);
    }
    return [];
  }

  /* ---------------- DEDICATED MODEL INTEGRATION HOOKS ---------------- */
  async detectSentences(payload: { documentId?: string; sentences: { id: string; text: string }[] }) {
    const res = await this.fetchWithAuth("/models/detect", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async generateModelRewrites(payload: {
    sentenceId: string;
    text: string;
    tone?: string;
    strength?: string;
    contextParagraph?: string;
    dialect?: "en-GB" | "en-US";
  }) {
    const res = await this.fetchWithAuth("/models/rewrite", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async getModelStatus() {
    const res = await this.fetchWithAuth("/models/status");
    return res.json();
  }
}

export const apiClient = new EduxApiClient();
