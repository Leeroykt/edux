/**
 * eduX Core Schema & API Contract
 * Derived from DocHumanizer & eduX Specification (M0 - M20)
 */

export type PlanType = 'free_trial' | 'individual' | 'edu_pro' | 'pay_per_paper';
export type UserRole = 'user' | 'operator' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  planType: PlanType;
  role: UserRole;
  country?: string;
  timeZone: string;
  trustLevel: number;
  createdAt: string;
}

export type DocumentStatus = 'uploading' | 'scanning' | 'ready' | 'processing' | 'error';
export type DocumentStage = 'uploaded' | 'in_review' | 'returned' | 'closed';

export interface DocumentMeta {
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
  overallAiScore?: number;
  similarityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export type ScoreBand = 'likely_human' | 'uncertain' | 'likely_machine';

export type ReasonChip = 
  | 'uniform_rhythm'
  | 'generic_phrasing'
  | 'stock_transitions'
  | 'low_specificity'
  | 'repetitive_openers'
  | 'academic_formulaic';

export interface SentenceScore {
  sentenceId: string;
  score: number; // 0.0 to 1.0
  band: ScoreBand;
  confidence: number;
  reasons: ReasonChip[];
  modelDetails?: {
    perplexityScore?: number;
    burstinessScore?: number;
    stylometricDelta?: number;
  };
}

export type RewriteStrategy = 
  | 'restructure'
  | 'vary_rhythm'
  | 'replace_generic'
  | 'plain_phrasing'
  | 'split'
  | 'merge'
  | 'academic_tone';

export interface SuggestionCandidate {
  id: string;
  sentenceId: string;
  text: string;
  strategy: RewriteStrategy;
  meaningScore: number; // Entailment pass confidence (0 - 100%)
  scoreDelta: number; // e.g. -65% AI score
  plainExplanation: string;
  lockedTokensPreserved: boolean;
}

export interface ProtectedAtom {
  id: string;
  documentId: string;
  type: 'equation' | 'citation' | 'table' | 'image' | 'field' | 'quote';
  token: string;
  latex?: string; // For equations
  originalXmlRef?: string;
  locked: boolean;
}

export interface DocumentSentence {
  id: string;
  nodeId: string;
  paragraphIndex: number;
  text: string;
  formattedHtml?: string;
  charStart: number;
  charEnd: number;
  locked: boolean;
  ignored: boolean;
  score?: SentenceScore;
  similarityMatchId?: string;
}

export interface DocumentParagraphNode {
  id: string;
  documentId: string;
  type: 'paragraph' | 'heading' | 'list_item' | 'table_cell' | 'table' | 'blockquote' | 'image';
  styleName?: string;
  level?: number;
  listType?: 'bullet' | 'number';
  rawHtml?: string;
  htmlContent?: string;
  tableData?: string[][];
  imageUrl?: string;
  imageCaption?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  isEmptyLine?: boolean;
  pageBreakBefore?: boolean;
  sentences: DocumentSentence[];
  orderNo: number;
}

export type SourcePool = 'open_scholarly' | 'web_index' | 'edux_repository' | 'licensed';

export interface SimilaritySource {
  id: string;
  name: string;
  sourcePool: SourcePool;
  url?: string;
  authors?: string;
  publicationYear?: number;
  matchPercentage: number;
  matchedWordCount: number;
}

export interface SimilarityMatch {
  id: string;
  sentenceId: string;
  sourceId: string;
  similarityScore: number; // 0 - 100%
  sourceSnippet: string;
  originalText: string;
  isQuotedAndCited: boolean;
  isExcluded: boolean;
}

export interface SimilarityReport {
  id: string;
  documentId: string;
  overallPercentage: number;
  aiLikelihoodBand: ScoreBand;
  poolsSearched: SourcePool[];
  matchedSources: SimilaritySource[];
  matches: SimilarityMatch[];
  generatedAt: string;
  exclusionsApplied: {
    excludeQuotes: boolean;
    excludeBibliography: boolean;
    excludeSmallMatches: boolean;
    smallMatchThresholdWords: number;
  };
}

export interface UsageSummary {
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

export interface VoiceProfile {
  id: string;
  ownerId: string;
  label: string;
  sampleCount: number;
  strengthScore: number;
  guideSummary: string;
  frequentPatterns: string[];
}

export interface StyleProfile {
  id: string;
  name: string; // 'APA 7', 'Harvard', 'MLA 9', 'Custom'
  fontFamily: string;
  fontSize: string;
  lineSpacing: number;
  margins: string;
  headingRules: Record<string, string>;
}
