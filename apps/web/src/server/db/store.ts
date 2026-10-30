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

    const initialDocs: DbDocument[] = [
      {
        id: MOCK_DOCUMENT.id,
        ownerId: MOCK_USER.id,
        title: MOCK_DOCUMENT.title,
        status: MOCK_DOCUMENT.status,
        stage: MOCK_DOCUMENT.stage,
        currentVersionId: MOCK_DOCUMENT.currentVersionId,
        ownerDeclaredOwn: MOCK_DOCUMENT.ownerDeclaredOwn,
        wordCount: MOCK_DOCUMENT.wordCount,
        pageCount: MOCK_DOCUMENT.pageCount,
        overallAiScore: MOCK_DOCUMENT.overallAiScore || 0.38,
        similarityScore: MOCK_DOCUMENT.similarityScore || 16,
        createdAt: MOCK_DOCUMENT.createdAt,
        updatedAt: MOCK_DOCUMENT.updatedAt,
      },
      {
        id: "doc_105",
        ownerId: MOCK_USER.id,
        title: "Algorithmic Fairness in Automated Grading Systems.docx",
        status: "ready",
        stage: "uploaded",
        currentVersionId: "v_1",
        ownerDeclaredOwn: true,
        wordCount: 4520,
        pageCount: 14,
        overallAiScore: 0.12,
        similarityScore: 9,
        createdAt: "2026-10-25T10:00:00Z",
        updatedAt: "2026-10-29T14:30:00Z",
      },
      {
        id: "doc_106",
        ownerId: MOCK_USER.id,
        title: "Quantum Key Distribution Protocols in Mesh Networks.docx",
        status: "ready",
        stage: "in_review",
        currentVersionId: "v_2",
        ownerDeclaredOwn: true,
        wordCount: 6100,
        pageCount: 19,
        overallAiScore: 0.65,
        similarityScore: 21,
        createdAt: "2026-10-24T12:00:00Z",
        updatedAt: "2026-10-28T09:15:00Z",
      },
      {
        id: "doc_107",
        ownerId: MOCK_USER.id,
        title: "Ethical Dialectics of Autonomous Machine Translation.docx",
        status: "ready",
        stage: "returned",
        currentVersionId: "v_3",
        ownerDeclaredOwn: true,
        wordCount: 3200,
        pageCount: 10,
        overallAiScore: 0.08,
        similarityScore: 5,
        createdAt: "2026-10-20T08:00:00Z",
        updatedAt: "2026-10-27T16:45:00Z",
      },
    ];

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
      users: [defaultUser],
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

  private async persist(): Promise<void> {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), "utf-8");
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
    this.state.sentences = this.state.sentences.filter((s) => s.documentId !== id);
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
    scores: DbSentenceScore[],
    suggestions: DbSuggestion[]
  ): Promise<void> {
    await this.load();
    // Clear old records for this document
    this.state.nodes = this.state.nodes.filter((n) => n.documentId !== documentId);
    this.state.sentences = this.state.sentences.filter((s) => s.documentId !== documentId);

    this.state.nodes.push(...nodes);
    this.state.sentences.push(...sentences);
    this.state.scores.push(...scores);
    this.state.suggestions.push(...suggestions);
    await this.persist();
  }

  /* ---------------- SCORES & SUGGESTIONS ---------------- */
  async findScoresBySentenceId(sentenceId: string): Promise<DbSentenceScore | null> {
    await this.load();
    return this.state.scores.find((sc) => sc.sentenceId === sentenceId) || null;
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
