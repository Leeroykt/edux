import {
  DocumentMeta,
  DocumentParagraphNode,
  DocumentSentence,
  SimilarityReport,
  UsageSummary,
  VoiceProfile,
  StyleProfile,
  SuggestionCandidate
} from "@edux/schema";

export const MOCK_USER = {
  id: "usr_99120",
  email: "researcher@oxford.ac.uk",
  name: "Dr. Alex Hawthorne",
  planType: "individual" as const,
  role: "user" as const,
  timeZone: "Europe/London",
  trustLevel: 1,
  createdAt: "2026-09-15T08:00:00Z"
};

export const MOCK_USAGE: UsageSummary = {
  userId: "usr_99120",
  day: "2026-10-29",
  wordsScoredToday: 12450,
  dailyWordCap: 30000,
  suggestionsUsedToday: 48,
  dailySuggestionCap: 300,
  activePapersCount: 2,
  activePapersCap: 3,
  resetTime: "Midnight GMT (in 2h 14m)"
};

export const MOCK_DOCUMENT: DocumentMeta = {
  id: "doc_84719a",
  ownerId: "usr_99120",
  title: "Machine Learning Foundations in Academic Authorship.docx",
  status: "ready",
  stage: "in_review",
  currentVersionId: "v_03",
  ownerDeclaredOwn: true,
  wordCount: 3840,
  pageCount: 12,
  dueDate: "2026-11-05T17:00:00Z",
  overallAiScore: 0.38, // 38% Machine likelihood
  similarityScore: 16, // 16% Similarity Index
  createdAt: "2026-10-28T14:20:00Z",
  updatedAt: "2026-10-29T20:45:00Z"
};

export const MOCK_PARAGRAPHS: DocumentParagraphNode[] = [
  {
    id: "p_01",
    documentId: "doc_84719a",
    type: "heading",
    styleName: "Heading 1",
    orderNo: 1,
    sentences: [
      {
        id: "s_01",
        nodeId: "p_01",
        paragraphIndex: 0,
        text: "1. Introduction: The Evolution of Large-Scale Transformer Architectures",
        charStart: 0,
        charEnd: 71,
        locked: false,
        ignored: false,
        score: {
          sentenceId: "s_01",
          score: 0.05,
          band: "likely_human",
          confidence: 0.95,
          reasons: []
        }
      }
    ]
  },
  {
    id: "p_02",
    documentId: "doc_84719a",
    type: "paragraph",
    styleName: "Body Text",
    orderNo: 2,
    sentences: [
      {
        id: "s_02",
        nodeId: "p_02",
        paragraphIndex: 1,
        text: "In the contemporary landscape of artificial intelligence, foundational models have revolutionized textual comprehension and computational linguistics across disciplinary domains.",
        charStart: 0,
        charEnd: 178,
        locked: false,
        ignored: false,
        score: {
          sentenceId: "s_02",
          score: 0.88,
          band: "likely_machine",
          confidence: 0.91,
          reasons: ["stock_transitions", "generic_phrasing", "uniform_rhythm"]
        }
      },
      {
        id: "s_03",
        nodeId: "p_02",
        paragraphIndex: 1,
        text: "Furthermore, it is crucial to recognize that the self-attention mechanism serves as the cornerstone for modern contextual representations.",
        charStart: 179,
        charEnd: 318,
        locked: false,
        ignored: false,
        score: {
          sentenceId: "s_03",
          score: 0.79,
          band: "likely_machine",
          confidence: 0.86,
          reasons: ["repetitive_openers", "stock_transitions"]
        },
        similarityMatchId: "m_01"
      },
      {
        id: "s_04",
        nodeId: "p_02",
        paragraphIndex: 1,
        text: "Empirical evaluations on the GLUE benchmark reveal that scaling parameters directly yields sub-linear error reduction up to billions of tokens (Vaswani et al., 2017).",
        charStart: 319,
        charEnd: 489,
        locked: false,
        ignored: false,
        score: {
          sentenceId: "s_04",
          score: 0.12,
          band: "likely_human",
          confidence: 0.92,
          reasons: []
        }
      }
    ]
  },
  {
    id: "p_03",
    documentId: "doc_84719a",
    type: "paragraph",
    styleName: "Body Text",
    orderNo: 3,
    sentences: [
      {
        id: "s_05",
        nodeId: "p_03",
        paragraphIndex: 2,
        text: "To quantify the attention weights across sequence tokens, we formulate the scaled dot-product attention as shown in Equation 1 below:",
        charStart: 0,
        charEnd: 135,
        locked: false,
        ignored: false,
        score: {
          sentenceId: "s_05",
          score: 0.45,
          band: "uncertain",
          confidence: 0.65,
          reasons: ["academic_formulaic"]
        }
      }
    ]
  },
  {
    id: "p_04",
    documentId: "doc_84719a",
    type: "paragraph",
    styleName: "Body Text",
    orderNo: 4,
    sentences: [
      {
        id: "s_06",
        nodeId: "p_04",
        paragraphIndex: 3,
        text: "Notwithstanding the remarkable empirical advances, significant questions linger regarding semantic coherence and stylistic homogenization in auto-generated prose.",
        charStart: 0,
        charEnd: 165,
        locked: false,
        ignored: false,
        score: {
          sentenceId: "s_06",
          score: 0.84,
          band: "likely_machine",
          confidence: 0.89,
          reasons: ["stock_transitions", "uniform_rhythm"]
        }
      },
      {
        id: "s_07",
        nodeId: "p_04",
        paragraphIndex: 3,
        text: "Our experiments in Chapter 4 confirm that human scholarly prose displays markedly higher burstiness and syntactic variance across paragraphs.",
        charStart: 166,
        charEnd: 308,
        locked: false,
        ignored: false,
        score: {
          sentenceId: "s_07",
          score: 0.08,
          band: "likely_human",
          confidence: 0.94,
          reasons: []
        }
      }
    ]
  }
];

export const MOCK_SUGGESTIONS: Record<string, SuggestionCandidate[]> = {
  s_02: [
    {
      id: "sug_02_1",
      sentenceId: "s_02",
      text: "Recent progress in artificial intelligence shows how foundation models have reshaped textual analysis and computational linguistics across multiple fields.",
      strategy: "plain_phrasing",
      meaningScore: 98,
      scoreDelta: -72,
      plainExplanation: "Replaced generic 'contemporary landscape' opener with natural active verbs and varied cadence.",
      lockedTokensPreserved: true
    },
    {
      id: "sug_02_2",
      sentenceId: "s_02",
      text: "Across computational linguistics and broader academic disciplines, foundation models have fundamentally changed how machines process human text.",
      strategy: "restructure",
      meaningScore: 97,
      scoreDelta: -65,
      plainExplanation: "Inverted clause structure to mirror scholarly prose while removing formulaic transitional padding.",
      lockedTokensPreserved: true
    },
    {
      id: "sug_02_3",
      sentenceId: "s_02",
      text: "Over the past three years, foundational models have transformed text comprehension, sparking adoption in fields far beyond computer science.",
      strategy: "vary_rhythm",
      meaningScore: 95,
      scoreDelta: -78,
      plainExplanation: "Introduced temporal grounding and broke the monotonous 22-word noun phrase rhythm.",
      lockedTokensPreserved: true
    }
  ],
  s_03: [
    {
      id: "sug_03_1",
      sentenceId: "s_03",
      text: "At the core of these contextual representations sits the self-attention mechanism, which determines how tokens interact.",
      strategy: "plain_phrasing",
      meaningScore: 99,
      scoreDelta: -68,
      plainExplanation: "Stripped the filler phrase 'Furthermore, it is crucial to recognize that' and emphasized the technical mechanism.",
      lockedTokensPreserved: true
    },
    {
      id: "sug_03_2",
      sentenceId: "s_03",
      text: "Modern contextual embeddings rely primarily on self-attention to calculate pairwise token relevance.",
      strategy: "academic_tone",
      meaningScore: 96,
      scoreDelta: -61,
      plainExplanation: "Tightened sentence into concise, direct academic phrasing.",
      lockedTokensPreserved: true
    }
  ],
  s_06: [
    {
      id: "sug_06_1",
      sentenceId: "s_06",
      text: "Despite these notable successes, researchers still debate whether auto-generated prose causes stylistic uniformity and semantic flattening.",
      strategy: "plain_phrasing",
      meaningScore: 98,
      scoreDelta: -70,
      plainExplanation: "Replaced 'Notwithstanding the remarkable empirical advances' with straightforward, natural phrasing.",
      lockedTokensPreserved: true
    }
  ]
};

export const MOCK_SIMILARITY_REPORT: SimilarityReport = {
  id: "rep_4019x",
  documentId: "doc_84719a",
  overallPercentage: 16,
  aiLikelihoodBand: "uncertain",
  poolsSearched: ["open_scholarly", "web_index", "edux_repository"],
  matchedSources: [
    {
      id: "src_01",
      name: "Attention Is All You Need (arXiv:1706.03762)",
      sourcePool: "open_scholarly",
      url: "https://arxiv.org/abs/1706.03762",
      authors: "Vaswani, A., Shazeer, N., Parmar, N., et al.",
      publicationYear: 2017,
      matchPercentage: 9.2,
      matchedWordCount: 353
    },
    {
      id: "src_02",
      name: "Journal of Educational Linguistics & Machine Writing",
      sourcePool: "web_index",
      url: "https://jelmw-openaccess.org/articles/vol14-stylometry",
      authors: "M. Davies, K. Thorne",
      publicationYear: 2024,
      matchPercentage: 4.8,
      matchedWordCount: 184
    },
    {
      id: "src_03",
      name: "Institutional Repository - Master's Theses Pool",
      sourcePool: "edux_repository",
      matchPercentage: 2.0,
      matchedWordCount: 76
    }
  ],
  matches: [
    {
      id: "m_01",
      sentenceId: "s_03",
      sourceId: "src_01",
      similarityScore: 88,
      sourceSnippet: "The self-attention mechanism serves as the cornerstone for modern contextual representations across deep neural networks.",
      originalText: "Furthermore, it is crucial to recognize that the self-attention mechanism serves as the cornerstone for modern contextual representations.",
      isQuotedAndCited: false,
      isExcluded: false
    }
  ],
  generatedAt: "2026-10-29T20:30:00Z",
  exclusionsApplied: {
    excludeQuotes: true,
    excludeBibliography: true,
    excludeSmallMatches: true,
    smallMatchThresholdWords: 8
  }
};

export const MOCK_VOICE_PROFILE: VoiceProfile = {
  id: "vp_usr_99120",
  ownerId: "usr_99120",
  label: "Academic Research (Oxford)",
  sampleCount: 3,
  strengthScore: 84, // 84% calibrated confidence
  guideSummary: "Prefers active verbs, empirical qualifiers, moderate sentence length (18-24 words), and disciplined transition markers.",
  frequentPatterns: [
    "High variance in sentence cadence (avoids monotonous clause chains)",
    "Prefers 'We observe that...' over 'It is demonstrated that...'",
    "British English spelling conventions ('characterised', 'modelling')"
  ]
};

export const MOCK_STYLE_PROFILES: StyleProfile[] = [
  {
    id: "sp_apa7",
    name: "APA 7th Edition",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineSpacing: 2.0,
    margins: "1 inch (2.54 cm)",
    headingRules: {
      "Heading 1": "Centered, Bold, Title Case",
      "Heading 2": "Flush Left, Bold, Title Case",
      "Heading 3": "Flush Left, Bold Italic, Title Case"
    }
  },
  {
    id: "sp_harvard",
    name: "Harvard Style",
    fontFamily: "Arial",
    fontSize: "11pt",
    lineSpacing: 1.5,
    margins: "1 inch",
    headingRules: {
      "Heading 1": "Numbered, Bold, 14pt",
      "Heading 2": "Numbered, Semi-bold, 12pt"
    }
  }
];

export const MOCK_EDU_PRO_PAPERS: DocumentMeta[] = [
  {
    id: "doc_101",
    ownerId: "usr_client_01",
    folderId: "fld_masters_thesis",
    title: "Neurosymbolic Reasoning in Clinical Diagnostics.docx",
    status: "ready",
    stage: "in_review",
    currentVersionId: "v_1",
    ownerDeclaredOwn: false,
    wordCount: 8420,
    pageCount: 26,
    dueDate: "2026-11-02T12:00:00Z",
    overallAiScore: 0.18,
    similarityScore: 8,
    createdAt: "2026-10-27T10:00:00Z",
    updatedAt: "2026-10-29T18:00:00Z"
  },
  {
    id: "doc_102",
    ownerId: "usr_client_02",
    folderId: "fld_masters_thesis",
    title: "Socioeconomic Determinants of Digital Literacy.docx",
    status: "ready",
    stage: "uploaded",
    currentVersionId: "v_1",
    ownerDeclaredOwn: false,
    wordCount: 5200,
    pageCount: 16,
    dueDate: "2026-11-04T15:00:00Z",
    overallAiScore: 0.72,
    similarityScore: 24,
    createdAt: "2026-10-29T11:00:00Z",
    updatedAt: "2026-10-29T11:00:00Z"
  },
  {
    id: "doc_103",
    ownerId: "usr_client_03",
    folderId: "fld_undergrad_essays",
    title: "Comparative Analysis of Post-Colonial Literature.docx",
    status: "ready",
    stage: "returned",
    currentVersionId: "v_2",
    ownerDeclaredOwn: false,
    wordCount: 2950,
    pageCount: 9,
    dueDate: "2026-10-28T17:00:00Z",
    overallAiScore: 0.09,
    similarityScore: 4,
    createdAt: "2026-10-25T09:00:00Z",
    updatedAt: "2026-10-28T16:30:00Z"
  },
  {
    id: "doc_104",
    ownerId: "usr_client_04",
    folderId: "fld_undergrad_essays",
    title: "Renewable Grid Synchronization Policies.docx",
    status: "ready",
    stage: "closed",
    currentVersionId: "v_3",
    ownerDeclaredOwn: false,
    wordCount: 4100,
    pageCount: 13,
    dueDate: "2026-10-24T12:00:00Z",
    overallAiScore: 0.14,
    similarityScore: 6,
    createdAt: "2026-10-22T08:00:00Z",
    updatedAt: "2026-10-24T14:00:00Z"
  }
];
