import {
  DocumentMeta,
  DocumentParagraphNode,
  DocumentSentence,
  SimilarityReport,
  UsageSummary,
  VoiceProfile,
  SuggestionCandidate,
  DocumentStage
} from "@edux/schema";
import {
  MOCK_DOCUMENT,
  MOCK_PARAGRAPHS,
  MOCK_SUGGESTIONS,
  MOCK_SIMILARITY_REPORT,
  MOCK_USAGE,
  MOCK_VOICE_PROFILE,
  MOCK_EDU_PRO_PAPERS
} from "./mockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

export class EduxApiClient {
  // 1. Documents API
  async getDocument(id: string): Promise<DocumentMeta> {
    if (USE_MOCK) {
      return { ...MOCK_DOCUMENT, id };
    }
    const res = await fetch(`${BASE_URL}/documents/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch document: ${res.statusText}`);
    return res.json();
  }

  async getDocumentStructure(id: string): Promise<DocumentParagraphNode[]> {
    if (USE_MOCK) {
      return JSON.parse(JSON.stringify(MOCK_PARAGRAPHS));
    }
    const res = await fetch(`${BASE_URL}/documents/${id}/structure`);
    if (!res.ok) throw new Error(`Failed to fetch structure: ${res.statusText}`);
    return res.json();
  }

  // 2. Suggestions API (M10.8)
  async getSentenceSuggestions(
    sentenceId: string,
    options: {
      tone?: "neutral" | "academic" | "conversational";
      strength?: "light" | "moderate" | "full";
      formality?: number;
    } = {}
  ): Promise<SuggestionCandidate[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600)); // Realistic network delay
      return MOCK_SUGGESTIONS[sentenceId] || [
        {
          id: `sug_${sentenceId}_gen`,
          sentenceId,
          text: "The empirical results indicate marked variation across sample sets, aligning with theoretical benchmarks.",
          strategy: "restructure",
          meaningScore: 97,
          scoreDelta: -65,
          plainExplanation: "Structured sentence for enhanced academic precision and cadence.",
          lockedTokensPreserved: true,
        },
      ];
    }
    const res = await fetch(`${BASE_URL}/sentences/${sentenceId}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    if (!res.ok) throw new Error(`Suggestion request failed: ${res.statusText}`);
    return res.json();
  }

  // 3. Apply Rewrite (M10.9)
  async applySuggestion(
    sentenceId: string,
    payload: { suggestionId?: string; text: string }
  ): Promise<{ success: boolean; newVersionId: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return { success: true, newVersionId: `v_${Date.now()}` };
    }
    const res = await fetch(`${BASE_URL}/sentences/${sentenceId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Apply failed: ${res.statusText}`);
    return res.json();
  }

  // 4. Similarity Report API (M9.3)
  async getSimilarityReport(docId: string): Promise<SimilarityReport> {
    if (USE_MOCK) {
      return { ...MOCK_SIMILARITY_REPORT, documentId: docId };
    }
    const res = await fetch(`${BASE_URL}/documents/${docId}/reports/latest`);
    if (!res.ok) throw new Error(`Failed to fetch report: ${res.statusText}`);
    return res.json();
  }

  // 5. Usage & Meter (M2.8)
  async getUsage(): Promise<UsageSummary> {
    if (USE_MOCK) {
      return MOCK_USAGE;
    }
    const res = await fetch(`${BASE_URL}/usage`);
    if (!res.ok) throw new Error(`Failed to fetch usage: ${res.statusText}`);
    return res.json();
  }

  // 6. Voice Profile (M11.3)
  async getVoiceProfile(): Promise<VoiceProfile> {
    if (USE_MOCK) {
      return MOCK_VOICE_PROFILE;
    }
    const res = await fetch(`${BASE_URL}/me/voice-profile`);
    if (!res.ok) throw new Error(`Failed to fetch voice profile: ${res.statusText}`);
    return res.json();
  }

  // 7. Edu Pro Workspace Papers (M14)
  async getEduProDocuments(): Promise<DocumentMeta[]> {
    if (USE_MOCK) {
      return MOCK_EDU_PRO_PAPERS;
    }
    const res = await fetch(`${BASE_URL}/folders/current/documents`);
    if (!res.ok) throw new Error(`Failed to fetch folder docs: ${res.statusText}`);
    return res.json();
  }

  // 8. Update Stage (Kanban board)
  async updateDocumentStage(docId: string, stage: DocumentStage): Promise<void> {
    if (USE_MOCK) return;
    await fetch(`${BASE_URL}/documents/${docId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
  }
}

export const apiClient = new EduxApiClient();
