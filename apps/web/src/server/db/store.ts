import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import {
  DbUser,
  DbSession,
  DbDocument,
  DbDocumentVersion,
  DbDocumentNode,
  DbSentence,
  DbSentenceScore,
  DbSuggestion,
  DbEditEvent,
  DbProtectedAtom,
  DbUsageCounter,
  DbFolder,
  DbAuditLog
} from "./schema";
import {
  MOCK_USER,
  MOCK_DOCUMENT,
  MOCK_PARAGRAPHS,
  MOCK_SUGGESTIONS,
  MOCK_USAGE
} from "../../services/api/mockData";

export interface DatabaseState {
  users: DbUser[];
  sessions: DbSession[];
  documents: DbDocument[];
  versions: DbDocumentVersion[];
  nodes: DbDocumentNode[];
  sentences: DbSentence[];
  scores: DbSentenceScore[];
  suggestions: DbSuggestion[];
  edits: DbEditEvent[];
  atoms: DbProtectedAtom[];
  usage: DbUsageCounter[];
  folders: DbFolder[];
  auditLogs: DbAuditLog[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "edux_store.json");

class DatabaseStore {
  private state: DatabaseState;
  private isLoaded: boolean = false;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): DatabaseState {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync("academic123", salt);

    const defaultUser: DbUser = {
      id: MOCK_USER.id,
      email: MOCK_USER.email,
      passwordHash,
      name: MOCK_USER.name,
      planType: MOCK_USER.planType,
      role: MOCK_USER.role,
      country: "United Kingdom",
      timeZone: MOCK_USER.timeZone,
      trustLevel: MOCK_USER.trustLevel,
      createdAt: MOCK_USER.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const initialDocs: DbDocument[] = [];

    const initialNodes: DbDocumentNode[] = [];
    const initialSentences: DbSentence[] = [];
    const initialScores: DbSentenceScore[] = [];

    MOCK_PARAGRAPHS.forEach((p, pIdx) => {
      initialNodes.push({
        id: p.id,
        documentId: p.documentId,
        versionId: "v_03",
        type: p.type,
        styleName: p.styleName,
        orderNo: p.orderNo,
      });

      p.sentences.forEach((s) => {
        initialSentences.push({
          id: s.id,
          nodeId: s.nodeId,
          documentId: p.documentId,
          paragraphIndex: pIdx,
          text: s.text,
          charStart: s.charStart,
          charEnd: s.charEnd,
          locked: s.locked,
          ignored: s.ignored,
        });

        if (s.score) {
          initialScores.push({
            id: `sc_${s.id}`,
            sentenceId: s.id,
            modelVersion: "v1.2-ensemble",
            score: s.score.score,
            band: s.score.band,
            confidence: s.score.confidence,
            reasons: s.score.reasons,
            modelDetails: s.score.modelDetails,
          });
        }
      });
    });

    const initialSuggestions: DbSuggestion[] = [];
    Object.entries(MOCK_SUGGESTIONS).forEach(([sId, candidates]) => {
      candidates.forEach((c) => {
        initialSuggestions.push({
          id: c.id,
          sentenceId: sId,
          modelVersion: "qwen-academic-lora-v2",
          text: c.text,
          strategy: c.strategy,
          meaningScore: c.meaningScore,
          scoreDelta: c.scoreDelta,
          plainExplanation: c.plainExplanation,
          lockedTokensPreserved: c.lockedTokensPreserved,
        });
      });
    });

    const initialUsage: DbUsageCounter = {
      id: "usg_today",
      userId: MOCK_USER.id,
      day: "2026-10-30",
      wordsScoredToday: MOCK_USAGE.wordsScoredToday,
      dailyWordCap: MOCK_USAGE.dailyWordCap,
      suggestionsUsedToday: MOCK_USAGE.suggestionsUsedToday,
      dailySuggestionCap: MOCK_USAGE.dailySuggestionCap,
      activePapersCount: 4,
      activePapersCap: MOCK_USAGE.activePapersCap,
      resetTime: "Midnight GMT (in 1h 45m)",
    };

    return {
      // The demo account exists for local development only.
      users: process.env.NODE_ENV === "production" ? [] : [defaultUser],
      sessions: [],
      documents: initialDocs,
      versions: [
        {
          id: "v_03",
          documentId: MOCK_DOCUMENT.id,
          versionNo: 3,
          createdBy: MOCK_USER.id,
          reason: "Initial import and structure scan",
          createdAt: MOCK_DOCUMENT.createdAt,
        },
      ],
      nodes: initialNodes,
      sentences: initialSentences,
      scores: initialScores,
      suggestions: initialSuggestions,
      edits: [],
      atoms: [
        {
          id: "atom_eq_1",
          documentId: MOCK_DOCUMENT.id,
          type: "equation",
          token: "[[ATOM_OMML_EQ_01]]",
          latex: "Attention(Q, K, V) = softmax\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V",
          locked: true,
        },
      ],
      usage: [initialUsage],
      folders: [
        {
          id: "fld_01",
          ownerId: MOCK_USER.id,
          name: "Doctoral Dissertation Papers",
          clientLabel: "Oxford Research",
          createdAt: "2026-10-01T08:00:00Z",
        },
      ],
      auditLogs: [],
    };
  }

  private async load(): Promise<void> {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.state = JSON.parse(raw);
      } else {
        await this.persist();
      }
    } catch (err) {
      console.warn("Could not load database file, using in-memory state:", err);
    }
    this.isLoaded = true;
  }

  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persisting: Promise<void> = Promise.resolve();

  /**
   * Schedules a write of the whole state. Writes are debounced and run off the
   * request path so a burst of score updates costs one file write, not hundreds.
   */
  private async persist(): Promise<void> {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persisting = this.persisting.then(() => this.writeToDisk());
    }, 250);
  }

  private async writeToDisk(): Promise<void> {
    try {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${DB_FILE}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(this.state), "utf-8");
      await fs.promises.rename(tmp, DB_FILE);
    } catch (err) {
      console.error("Failed to persist database state to disk:", err);
    }
  }

  /* ---------------- USERS ---------------- */
  async findUserByEmail(email: string): Promise<DbUser | null> {
    await this.load();
    return (
      this.state.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      ) || null
    );
  }

  async findUserById(id: string): Promise<DbUser | null> {
    await this.load();
    return this.state.users.find((u) => u.id === id) || null;
  }

  async createUser(user: Omit<DbUser, "id" | "createdAt" | "updatedAt">): Promise<DbUser> {
    await this.load();
    const newUser: DbUser = {
      ...user,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.users.push(newUser);

    // Initial usage quota
    const initialCap = user.planType === "edu_pro" ? 150000 : 30000;
    const initialSugCap = user.planType === "edu_pro" ? 1500 : 300;
    const initialPapersCap = user.planType === "edu_pro" ? 40 : 3;

    this.state.usage.push({
      id: `usg_${newUser.id}_today`,
      userId: newUser.id,
      day: new Date().toISOString().split("T")[0],
      wordsScoredToday: 0,
      dailyWordCap: initialCap,
      suggestionsUsedToday: 0,
      dailySuggestionCap: initialSugCap,
      activePapersCount: 0,
      activePapersCap: initialPapersCap,
      resetTime: "Midnight GMT",
    });

    await this.persist();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
    await this.load();
    const idx = this.state.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.state.users[idx] = {
      ...this.state.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.state.users[idx];
  }

  /* ---------------- SESSIONS ---------------- */
  async createSession(userId: string, token: string, expiresAt: string): Promise<DbSession> {
    await this.load();
    const session: DbSession = {
      id: `sess_${Date.now()}`,
      userId,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    this.state.sessions.push(session);
    await this.persist();
    return session;
  }

  async findSessionByToken(token: string): Promise<DbSession | null> {
    await this.load();
    const now = new Date().toISOString();
    return (
      this.state.sessions.find(
        (s) => s.token === token && s.expiresAt > now
      ) || null
    );
  }

  async deleteSession(token: string): Promise<void> {
    await this.load();
    this.state.sessions = this.state.sessions.filter((s) => s.token !== token);
    await this.persist();
  }

  /* ---------------- DOCUMENTS ---------------- */
  async findDocumentsByOwner(ownerId: string): Promise<DbDocument[]> {
    await this.load();
    return this.state.documents.filter((d) => d.ownerId === ownerId);
  }

  async findDocumentById(id: string): Promise<DbDocument | null> {
    await this.load();
    return this.state.documents.find((d) => d.id === id) || null;
  }

  async createDocument(doc: DbDocument): Promise<DbDocument> {
    await this.load();
    this.state.documents.unshift(doc);
    await this.persist();
    return doc;
  }

  async updateDocument(id: string, updates: Partial<DbDocument>): Promise<DbDocument | null> {
    await this.load();
    const idx = this.state.documents.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    this.state.documents[idx] = {
      ...this.state.documents[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.state.documents[idx];
  }

  async deleteDocument(id: string): Promise<boolean> {
    await this.load();
    const initialLen = this.state.documents.length;
    this.state.documents = this.state.documents.filter((d) => d.id !== id);
    this.state.nodes = this.state.nodes.filter((n) => n.documentId !== id);
    const ids = new Set(this.state.sentences.filter((s) => s.documentId === id).map((s) => s.id));
    this.state.sentences = this.state.sentences.filter((s) => s.documentId !== id);
    this.state.scores = this.state.scores.filter((sc) => !ids.has(sc.sentenceId));
    this.state.suggestions = this.state.suggestions.filter((sg) => !ids.has(sg.sentenceId));
    await this.persist();
    return this.state.documents.length < initialLen;
  }

  /* ---------------- NODES & SENTENCES ---------------- */
  async findNodesByDocumentId(documentId: string): Promise<DbDocumentNode[]> {
    await this.load();
    return this.state.nodes
      .filter((n) => n.documentId === documentId)
      .sort((a, b) => a.orderNo - b.orderNo);
  }

  async findSentencesByDocumentId(documentId: string): Promise<DbSentence[]> {
    await this.load();
    return this.state.sentences.filter((s) => s.documentId === documentId);
  }

  async findSentenceById(sentenceId: string): Promise<DbSentence | null> {
    await this.load();
    return this.state.sentences.find((s) => s.id === sentenceId) || null;
  }

  async updateSentenceText(
    sentenceId: string,
    newText: string,
    userId: string
  ): Promise<DbSentence | null> {
    await this.load();
    const sentence = this.state.sentences.find((s) => s.id === sentenceId);
    if (!sentence) return null;

    const oldText = sentence.text;
    sentence.text = newText;

    // Record edit event
    this.state.edits.unshift({
      id: `edit_${Date.now()}`,
      sentenceId,
      documentId: sentence.documentId,
      userId,
      action: "edit",
      oldText,
      newText,
      createdAt: new Date().toISOString(),
    });

    await this.persist();
    return sentence;
  }

  async toggleSentenceLock(sentenceId: string): Promise<DbSentence | null> {
    await this.load();
    const sentence = this.state.sentences.find((s) => s.id === sentenceId);
    if (!sentence) return null;
    sentence.locked = !sentence.locked;
    await this.persist();
    return sentence;
  }

  async saveDocumentStructure(
    documentId: string,
    nodes: DbDocumentNode[],
    sentences: DbSentence[],
    scores: DbSentenceScore[] = [],
    suggestions: DbSuggestion[] = []
  ): Promise<void> {
    await this.load();
    const oldIds = new Set(
      this.state.sentences.filter((s) => s.documentId === documentId).map((s) => s.id)
    );
    this.state.nodes = this.state.nodes.filter((n) => n.documentId !== documentId);
    this.state.sentences = this.state.sentences.filter((s) => s.documentId !== documentId);
    this.state.scores = this.state.scores.filter((sc) => !oldIds.has(sc.sentenceId));
    this.state.suggestions = this.state.suggestions.filter((sg) => !oldIds.has(sg.sentenceId));

    this.state.nodes.push(...nodes);
    this.state.sentences.push(...sentences);
    this.state.scores.push(...scores);
    this.state.suggestions.push(...suggestions);
    await this.persist();
  }

  /**
   * Applies edits made by typing: the given paragraphs get exactly these sentences,
   * removed paragraphs disappear, and the whole document takes the stated order.
   * A sentence whose wording changed loses its old score and suggestions.
   */
  async syncNodes(
    documentId: string,
    nodes: { id: string; type: DbDocumentNode["type"]; styleName?: string; sentences: DbSentence[] }[],
    removedNodeIds: string[],
    order: string[]
  ): Promise<void> {
    await this.load();
    const dropSentences = (ids: Set<string>) => {
      if (ids.size === 0) return;
      this.state.sentences = this.state.sentences.filter((x) => !ids.has(x.id));
      this.state.scores = this.state.scores.filter((x) => !ids.has(x.sentenceId));
      this.state.suggestions = this.state.suggestions.filter((x) => !ids.has(x.sentenceId));
    };

    // A sentence can move between the paragraphs saved together, so none of these are dropped as "gone".
    const incomingIds = new Set(nodes.flatMap((n) => n.sentences.map((x) => x.id)));

    for (const node of nodes) {
      const existing = this.state.nodes.find((n) => n.documentId === documentId && n.id === node.id);
      if (existing) {
        existing.type = node.type;
        if (node.styleName) existing.styleName = node.styleName;
      } else {
        const versionId = this.state.nodes.find((n) => n.documentId === documentId)?.versionId ?? "v_01";
        this.state.nodes.push({ id: node.id, documentId, versionId, type: node.type, styleName: node.styleName, orderNo: 0 });
      }

      const keep = new Map(node.sentences.map((x) => [x.id, x]));
      const before = this.state.sentences.filter((x) => x.documentId === documentId && x.nodeId === node.id);
      // Sentences that are gone from this paragraph.
      dropSentences(new Set(before.filter((x) => !keep.has(x.id) && !incomingIds.has(x.id)).map((x) => x.id)));
      // Sentences whose wording changed: the score and suggestions described the old words.
      const reworded = new Set(before.filter((x) => keep.has(x.id) && keep.get(x.id)!.text !== x.text).map((x) => x.id));
      if (reworded.size) {
        this.state.scores = this.state.scores.filter((x) => !reworded.has(x.sentenceId));
        this.state.suggestions = this.state.suggestions.filter((x) => !reworded.has(x.sentenceId));
      }
      for (const incoming of node.sentences) {
        const at = this.state.sentences.findIndex((x) => x.id === incoming.id);
        if (at >= 0) this.state.sentences[at] = { ...this.state.sentences[at], ...incoming, documentId };
        else this.state.sentences.push({ ...incoming, documentId });
      }
    }

    // Removed last, so sentences moved into another paragraph are not deleted with the old one.
    for (const nodeId of removedNodeIds) {
      dropSentences(new Set(this.state.sentences.filter((x) => x.documentId === documentId && x.nodeId === nodeId).map((x) => x.id)));
      this.state.nodes = this.state.nodes.filter((n) => !(n.documentId === documentId && n.id === nodeId));
    }

    order.forEach((id, i) => {
      const n = this.state.nodes.find((x) => x.documentId === documentId && x.id === id);
      if (n) n.orderNo = i + 1;
    });
    // Keep each sentence's paragraph position in step with the order.
    const position = new Map(order.map((id, i) => [id, i]));
    this.state.sentences.forEach((x) => {
      if (x.documentId === documentId && position.has(x.nodeId)) x.paragraphIndex = position.get(x.nodeId)!;
    });

    await this.persist();
  }

  /* ---------------- SCORES & SUGGESTIONS ---------------- */
  async findScoresBySentenceId(sentenceId: string): Promise<DbSentenceScore | null> {
    await this.load();
    return this.state.scores.find((sc) => sc.sentenceId === sentenceId) || null;
  }

  async findScoresByDocumentId(documentId: string): Promise<DbSentenceScore[]> {
    await this.load();
    const ids = new Set(
      this.state.sentences.filter((s) => s.documentId === documentId).map((s) => s.id)
    );
    return this.state.scores.filter((sc) => ids.has(sc.sentenceId));
  }

  /** Inserts or replaces scores, one per sentence. */
  async upsertScores(scores: DbSentenceScore[]): Promise<void> {
    await this.load();
    const incoming = new Map(scores.map((sc) => [sc.sentenceId, sc]));
    this.state.scores = this.state.scores.filter((sc) => !incoming.has(sc.sentenceId));
    this.state.scores.push(...scores);
    await this.persist();
  }

  /** Replaces all cached suggestions for one sentence. */
  async replaceSuggestions(sentenceId: string, suggestions: DbSuggestion[]): Promise<void> {
    await this.load();
    this.state.suggestions = this.state.suggestions.filter((sg) => sg.sentenceId !== sentenceId);
    this.state.suggestions.push(...suggestions);
    await this.persist();
  }

  async clearSuggestions(sentenceId: string): Promise<void> {
    await this.replaceSuggestions(sentenceId, []);
  }

  async findSuggestionsBySentenceId(sentenceId: string): Promise<DbSuggestion[]> {
    await this.load();
    return this.state.suggestions.filter((sg) => sg.sentenceId === sentenceId);
  }

  /* ---------------- USAGE & LIMITS ---------------- */
  async getUsageForUser(userId: string): Promise<DbUsageCounter> {
    await this.load();
    let usage = this.state.usage.find((u) => u.userId === userId);
    if (!usage) {
      usage = {
        id: `usg_${userId}_today`,
        userId,
        day: new Date().toISOString().split("T")[0],
        wordsScoredToday: 0,
        dailyWordCap: 30000,
        suggestionsUsedToday: 0,
        dailySuggestionCap: 300,
        activePapersCount: 1,
        activePapersCap: 3,
        resetTime: "Midnight GMT",
      };
      this.state.usage.push(usage);
      await this.persist();
    }
    return usage;
  }

  async incrementUsage(userId: string, words: number, suggestions: number): Promise<DbUsageCounter> {
    await this.load();
    const usage = await this.getUsageForUser(userId);
    usage.wordsScoredToday += words;
    usage.suggestionsUsedToday += suggestions;
    await this.persist();
    return usage;
  }

  /* ---------------- AUDIT LOGS ---------------- */
  async recordAudit(actorId: string, action: string, target: string, ip?: string): Promise<void> {
    await this.load();
    this.state.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      actorId,
      action,
      target,
      ip,
      createdAt: new Date().toISOString(),
    });
    await this.persist();
  }
}

export const db = new DatabaseStore();
