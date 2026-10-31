import {
  PlanType,
  UserRole,
  DocumentStatus,
  DocumentStage,
  ScoreBand,
  ReasonChip,
  RewriteStrategy,
  SourcePool,
  UsageSummary,
  VoiceProfile
} from "@edux/schema";

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  planType: PlanType;
  role: UserRole;
  country: string;
  timeZone: string;
  trustLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface DbDocument {
  id: string;
  ownerId: string;
  folderId?: string;
  title: string;
  status: DocumentStatus;
  stage: DocumentStage;
  currentVersionId: string;
  ownerDeclaredOwn: boolean;
  wordCount: number;
  pageCount: number;
  dueDate?: string;
  overallAiScore: number;
  similarityScore: number;
  sourceObjectKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbDocumentVersion {
  id: string;
  documentId: string;
  versionNo: number;
  objectKey?: string;
  createdBy: string;
  reason: string;
  createdAt: string;
}

export interface DbDocumentNode {
  id: string;
  documentId: string;
  versionId: string;
  type: 'paragraph' | 'heading' | 'list_item' | 'table_cell' | 'table' | 'blockquote' | 'image';
  styleName?: string;
  orderNo: number;
  xmlPath?: string;
}

export interface DbSentence {
  id: string;
  nodeId: string;
  documentId: string;
  paragraphIndex: number;
  text: string;
  charStart: number;
  charEnd: number;
  locked: boolean;
  ignored: boolean;
}

export interface DbSentenceScore {
  id: string;
  sentenceId: string;
  modelVersion: string;
  score: number;
  band: ScoreBand;
  confidence: number;
  reasons: ReasonChip[];
  modelDetails?: {
    perplexityScore?: number;
    burstinessScore?: number;
    stylometricDelta?: number;
  };
}

export interface DbSuggestion {
  id: string;
  sentenceId: string;
  modelVersion: string;
  text: string;
  strategy: RewriteStrategy;
  meaningScore: number;
  scoreDelta: number;
  plainExplanation: string;
  lockedTokensPreserved: boolean;
}

export interface DbEditEvent {
  id: string;
  sentenceId: string;
  documentId: string;
  userId: string;
  action: 'accept' | 'edit' | 'reject' | 'undo';
  oldText: string;
  newText: string;
  createdAt: string;
}

export interface DbProtectedAtom {
  id: string;
  documentId: string;
  type: 'equation' | 'citation' | 'table' | 'image' | 'field' | 'quote';
  token: string;
  latex?: string;
  originalXmlRef?: string;
  locked: boolean;
}

export interface DbUsageCounter {
  id: string;
  userId: string;
  day: string;
  wordsScoredToday: number;
  dailyWordCap: number;
  suggestionsUsedToday: number;
  dailySuggestionCap: number;
  activePapersCount: number;
  activePapersCap: number;
  resetTime: string;
}

export interface DbFolder {
  id: string;
  ownerId: string;
  name: string;
  clientLabel?: string;
  styleProfileId?: string;
  createdAt: string;
}

export interface DbAuditLog {
  id: string;
  actorId: string;
  action: string;
  target: string;
  ip?: string;
  createdAt: string;
}
