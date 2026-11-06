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
  institution?: string;
  fieldOfStudy?: string;
  createdAt: string;
}

export type DocumentStatus = 'uploading' | 'scanning' | 'ready' | 'processing' | 'error';
export type DocumentStage = 'uploaded' | 'in_review' | 'returned' | 'closed';

/** The English a document is written in. */
export type DocumentDialect = 'en-GB' | 'en-US';
/** What kind of writing a document is. */
export type WritingMode = 'academic' | 'scientific' | 'executive';
/** How sources are cited and listed. */
export type CitationStyle = 'APA 7' | 'Harvard' | 'MLA 9' | 'Chicago' | 'IEEE' | 'Vancouver' | 'None';

export const WRITING_MODES: WritingMode[] = ['academic', 'scientific', 'executive'];
export const CITATION_STYLES: CitationStyle[] = ['APA 7', 'Harvard', 'MLA 9', 'Chicago', 'IEEE', 'Vancouver', 'None'];

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
  /** Chosen per document. A document without them follows the writer's defaults. */
  dialect?: DocumentDialect;
  writingMode?: WritingMode;
  citationStyle?: CitationStyle;
  /** Page setup read from an uploaded Word file. Present only for documents that came from .docx. */
  layout?: DocxLayout;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Word fidelity: what an uploaded .docx looked like                    */
/* ------------------------------------------------------------------ */

/** CSS for one block, written by the Word importer (React style keys, values with units). */
export type BlockStyle = Record<string, string | number>;

/** One section of a Word file: page size, margins, and its headers and footers as HTML. */
export interface DocxSection {
  widthPt: number;
  heightPt: number;
  marginTopPt: number;
  marginRightPt: number;
  marginBottomPt: number;
  marginLeftPt: number;
  headerPt: number;
  footerPt: number;
  /** The first page has its own header and footer. */
  titlePg?: boolean;
  header?: string;
  footer?: string;
  firstHeader?: string;
  firstFooter?: string;
}

export interface DocxLayout {
  sections: DocxSection[];
  /** Word's default tab stop interval. */
  defaultTabPt: number;
  /** CSS font stack and size of the document's default text. */
  defaultFont: string;
  defaultSizePt: number;
}

export interface DocxTabStop {
  /** Position from the left edge of the text column. */
  pos: number;
  align: 'left' | 'center' | 'right' | 'decimal';
  leader?: 'dot' | 'hyphen' | 'underscore' | 'middleDot';
}

export interface DocxTableCell {
  html: string;
  /** Text of the cell when it was imported, to tell whether it has been edited since. */
  text: string;
  style: BlockStyle;
  /** Style of the cell's first paragraph, used to draw an edited cell. */
  firstBlockStyle?: BlockStyle;
  colSpan?: number;
  rowSpan?: number;
}

export interface DocxTableModel {
  style: BlockStyle;
  colWidthsPt: number[];
  rows: { heightPt?: number; exactHeight?: boolean; cells: DocxTableCell[] }[];
}

/** Where a block came from in the original file, so an export can leave it untouched. */
export interface DocxSourceRef {
  /** Element indices from <w:body> down to the block. */
  path: number[];
  /** Fingerprint of the content when imported. */
  sig: string;
  /** Alignment when imported. */
  align?: string;
  /** A paragraph cut by a page break is several nodes: which piece, and how many. */
  part?: number;
  parts?: number;
  /** A new paragraph styled like this source block (for example after pressing Enter). */
  clone?: boolean;
  /** The source paragraph started, or ended, with a page break that is not drawn as a line. */
  leadBreak?: boolean;
  trailBreak?: boolean;
}

export type ScoreBand = 'likely_human' | 'uncertain' | 'likely_machine';

export type ReasonChip = 
  | 'uniform_rhythm'
  | 'generic_phrasing'
  | 'stock_transitions'
  | 'low_specificity'
  | 'repetitive_openers'
  | 'academic_formulaic'
  | 'repetitive_structure'
  | 'cliche_collocations'
  | 'unnatural_symmetry';

/** Which engine produced a score: the connected model service or the built-in reference heuristic. */
export type ScoreEngine = 'model' | 'reference';

export interface SentenceScore {
  sentenceId: string;
  score: number; // 0.0 to 1.0
  band: ScoreBand;
  confidence: number;
  reasons: ReasonChip[];
  engine?: ScoreEngine;
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
  | 'academic_tone'
  | 'scholarly_hedging';

export interface SuggestionCandidate {
  id: string;
  sentenceId: string;
  text: string;
  strategy: RewriteStrategy;
  meaningScore: number; // Entailment pass confidence (0 - 100%)
  scoreDelta: number; // e.g. -65% AI score
  plainExplanation: string;
  lockedTokensPreserved: boolean;
  engine?: ScoreEngine;
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
  /** True once a rewrite or edit has replaced the original wording. */
  edited?: boolean;
  /** Wording before the first edit, kept so exports can show a tracked change. */
  originalText?: string;
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
  /** Set when Enter split this paragraph in the middle of a word, so Backspace can rejoin it without a space. */
  splitMidWord?: boolean;
  /** Figure width as a share of the page width (images only). */
  widthPercent?: number;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  isEmptyLine?: boolean;
  pageBreakBefore?: boolean;
  sentences: DocumentSentence[];
  orderNo: number;
  /* Word fidelity (set only for blocks imported from .docx) */
  /** Exact look of the block: spacing, indents, line height, fonts. */
  blockStyle?: BlockStyle;
  /** Numbering text drawn before a list item, such as "1." or "(a)", as HTML. */
  listMarkerHtml?: string;
  tabStops?: DocxTabStop[];
  /** Index into DocumentMeta.layout.sections. */
  section?: number;
  imageWidthPt?: number;
  imageHeightPt?: number;
  /** A picture the browser cannot draw (for example EMF); shown as a placeholder of the same size. */
  imageUnsupported?: string;
  /** A text box, chart or SmartArt from a Word file, drawn as HTML/SVG at its Word size. */
  imageHtml?: string;
  table?: DocxTableModel;
  /** Footnotes referenced from this block, drawn at the foot of the page. */
  footnotes?: { id: string; html: string }[];
  docx?: DocxSourceRef;
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
