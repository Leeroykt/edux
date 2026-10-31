import {
  DocumentMeta,
  DocumentParagraphNode,
  SimilarityReport,
  UsageSummary,
  VoiceProfile,
  SuggestionCandidate,
  DocumentStage,
  User
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

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (typeof window === "undefined") {
      // Avoid relative URL SSR fetch errors on Node
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const token = this.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const fullUrl = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    let res = await fetch(fullUrl, {
      ...options,
      headers,
    });

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
    try {
      const res = await this.fetchWithAuth(`/documents/${id}/structure`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.paragraphs) && data.paragraphs.length > 0) {
          return data.paragraphs;
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch structure for ${id}, fallback:`, err);
    }
    return JSON.parse(JSON.stringify(MOCK_PARAGRAPHS));
  }

  async createDocument(payload: {
    title: string;
    paragraphs: any[];
    folderId?: string;
    ownerDeclaredOwn?: boolean;
  }): Promise<DocumentMeta> {
    const res = await this.fetchWithAuth("/documents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: "Create document failed" } }));
      throw new Error(err.error?.message || "Failed to create document.");
    }
    const data = await res.json();
    return data.document;
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

  /* ---------------- SUGGESTIONS & REWRITES ---------------- */
  async getSentenceSuggestions(
    sentenceId: string,
    options: {
      tone?: "neutral" | "academic" | "conversational";
      strength?: "light" | "moderate" | "full";
      formality?: number;
    } = {}
  ): Promise<SuggestionCandidate[]> {
    try {
      const res = await this.fetchWithAuth(`/sentences/${sentenceId}/suggest`, {
        method: "POST",
        body: JSON.stringify(options),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.suggestions)) return data.suggestions;
      }
    } catch (err) {
      console.warn(`Failed to fetch suggestions for ${sentenceId}:`, err);
    }

    return MOCK_SUGGESTIONS[sentenceId] || [
      {
        id: `sug_${sentenceId}_gen`,
        sentenceId,
        text: "The empirical results indicate marked variation across sample sets, aligning with theoretical benchmarks.",
        strategy: "academic_tone",
        meaningScore: 97,
        scoreDelta: -65,
        plainExplanation: "Structured sentence for enhanced academic precision and cadence.",
        lockedTokensPreserved: true,
      },
    ];
  }

  async applySuggestion(
    sentenceId: string,
    payload: { suggestionId?: string; text: string }
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
