# eduX Model Integration Guide for ML Engineers

This guide outlines the model service contracts and integration endpoints for **eduX**. All document parsing, lossless XML reconstruction, authentication, database storage, quota enforcement, and web interfaces are fully implemented in the backend. 

Your only responsibility is providing the machine learning inference services for **AI Detection** and **Lossless Academic Rewriting**.

---

## 1. Quick Start: Setting the Model Service URL

In `apps/web/.env.local`, set:
```bash
MODEL_SERVICE_URL=http://localhost:8000
```
When this variable is set, the eduX backend automatically forwards all detection and rewrite queries to your model microservice. If `MODEL_SERVICE_URL` is omitted, eduX gracefully falls back to its built-in reference stylometric engine.

You can check active integration health at:
```http
GET /api/v1/models/status
```

---

## 2. API Contract 1: AI Detection (`/v1/detect`)

Called when a document is uploaded, scanned, or re-evaluated.

### HTTP Method & Path
```http
POST /v1/detect
Content-Type: application/json
```

### Request Payload
```json
{
  "documentId": "doc_84719a",
  "sentences": [
    {
      "id": "s_101",
      "text": "Furthermore, it is essential to consider the implications of automated heuristics."
    },
    {
      "id": "s_102",
      "text": "Empirical results from Trial 4 indicate consistent convergence across 50 epochs."
    }
  ]
}
```

### Response Payload
Must return an array of detection objects matching the schema below:
```json
[
  {
    "sentenceId": "s_101",
    "score": 0.88,
    "band": "likely_machine",
    "confidence": 0.94,
    "reasons": ["stock_transitions", "generic_phrasing"],
    "modelDetails": {
      "perplexityScore": 28.3,
      "burstinessScore": 0.22,
      "stylometricDelta": 0.74
    }
  },
  {
    "sentenceId": "s_102",
    "score": 0.06,
    "band": "likely_human",
    "confidence": 0.98,
    "reasons": [],
    "modelDetails": {
      "perplexityScore": 192.4,
      "burstinessScore": 0.89,
      "stylometricDelta": 0.04
    }
  }
]
```

#### Field Specifications:
- `score` *(float)*: Normalized AI likelihood score between `0.0` (100% human) and `1.0` (100% machine).
- `band` *(string)*: One of:
  - `"likely_human"` (score < 0.30)
  - `"uncertain"` (0.30 <= score < 0.60)
  - `"likely_machine"` (score >= 0.60)
- `confidence` *(float)*: Prediction confidence between `0.0` and `1.0`.
- `reasons` *(array of strings)*: Diagnostic chips displayed to the scholar in the editor UI. Allowed values:
  - `"stock_transitions"`, `"generic_phrasing"`, `"uniform_rhythm"`, `"repetitive_structure"`, `"cliche_collocations"`, `"unnatural_symmetry"`
- `modelDetails` *(object, optional)*: Raw metrics (`perplexityScore`, `burstinessScore`, `stylometricDelta`).

---

## 3. API Contract 2: Academic Rewriter (`/v1/rewrite`)

Called when a user requests rewrites for a flagged sentence or runs bulk humanization.

### HTTP Method & Path
```http
POST /v1/rewrite
Content-Type: application/json
```

### Request Payload
```json
{
  "sentenceId": "s_101",
  "text": "Furthermore, it is essential to consider the implications of automated heuristics.",
  "contextParagraph": "The preceding section highlighted limitations in heuristic-driven algorithms. Furthermore, it is essential to consider the implications of automated heuristics. These considerations inform subsequent model tuning.",
  "tone": "academic",
  "strength": "moderate"
}
```

### Response Payload
Must return an array of 1 to 4 candidate rewrites:
```json
[
  {
    "id": "sug_s101_1",
    "sentenceId": "s_101",
    "text": "Specifically, the operational constraints of automated heuristics warrant rigorous examination.",
    "strategy": "academic_tone",
    "meaningScore": 98,
    "scoreDelta": -78,
    "plainExplanation": "Replaced formulaic transition with scholarly active voice, increasing token perplexity by +124."
  },
  {
    "id": "sug_s101_2",
    "sentenceId": "s_101",
    "text": "We examine the practical consequences that emerge from automated heuristics.",
    "strategy": "plain_phrasing",
    "meaningScore": 96,
    "scoreDelta": -70,
    "plainExplanation": "Adopted direct empirical framing while preserving domain-specific terminology."
  }
]
```

#### Field Specifications:
- `strategy` *(string)*: Strategy applied:
  - `"academic_tone"`, `"plain_phrasing"`, `"restructure"`, `"scholarly_hedging"`
- `meaningScore` *(integer)*: Semantic similarity score against original text (0-100, target >= 95).
- `scoreDelta` *(integer)*: Expected reduction in AI detection percentage (e.g., `-75` indicates reduction from 85% to 10%).
- `plainExplanation` *(string)*: Scholarly rationale shown to the user in the Inspector card.

---

## 4. Minimal Python FastAPI Server Boilerplate

The friend can run this standalone Python service locally or on a GPU cluster (PyTorch, vLLM, HuggingFace):

```python
# server.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="eduX ML Model Service", version="1.0.0")

class SentenceItem(BaseModel):
    id: str
    text: str

class DetectRequest(BaseModel):
    documentId: Optional[str] = None
    sentences: List[SentenceItem]

class RewriteRequest(BaseModel):
    sentenceId: str
    text: str
    contextParagraph: Optional[str] = None
    tone: Optional[str] = "academic"
    strength: Optional[str] = "moderate"

@app.post("/v1/detect")
def detect_sentences(req: DetectRequest):
    results = []
    for item in req.sentences:
        # TODO: Replace with your Transformer classifier / Perplexity calculation
        is_machine = any(w in item.text.lower() for w in ["furthermore", "moreover", "delve", "crucial", "testament"])
        score = 0.84 if is_machine else 0.08
        band = "likely_machine" if score >= 0.6 else "likely_human"
        reasons = ["stock_transitions", "generic_phrasing"] if is_machine else []

        results.append({
            "sentenceId": item.id,
            "score": score,
            "band": band,
            "confidence": 0.95,
            "reasons": reasons,
            "modelDetails": {
                "perplexityScore": 34.2 if is_machine else 184.6,
                "burstinessScore": 0.28 if is_machine else 0.92,
            }
        })
    return results

@app.post("/v1/rewrite")
def rewrite_sentence(req: RewriteRequest):
    # TODO: Replace with your fine-tuned LoRA / LLM generation call
    transformed = req.text.replace("Furthermore,", "Specifically,").replace("crucial", "essential")
    return [
        {
            "id": f"sug_{req.sentenceId}_1",
            "sentenceId": req.sentenceId,
            "text": transformed,
            "strategy": "academic_tone",
            "meaningScore": 98,
            "scoreDelta": -75,
            "plainExplanation": "Transformed formulaic sentence structure into human academic syntax."
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

Run with:
```bash
pip install fastapi uvicorn pydantic
python server.py
```

Then in `.env.local`:
```bash
MODEL_SERVICE_URL=http://localhost:8000
```
And eduX will automatically connect.

---

## 7. Connector behaviour (current)

Environment variables read by the web backend:

| Variable | Default | Meaning |
|---|---|---|
| `MODEL_SERVICE_URL` | unset | Base URL of your service. Unset means the built-in reference heuristic is used. |
| `MODEL_SERVICE_TOKEN` | unset | Sent as `Authorization: Bearer <token>`. Set it when the service is reachable from the internet (for example through a tunnel). |
| `MODEL_TIMEOUT_MS` | `30000` | Per-request timeout. |
| `MODEL_DETECT_BATCH` | `24` | Sentences per `/v1/detect` request. |
| `MODEL_DETECT_CONCURRENCY` | `2` | Detect batches in flight at once. |
| `MODEL_VERSION` | `model-service` | Stored next to every score and suggestion. |

Rules the backend applies, so the service does not have to:

- Sentences under 8 words, headings, quotations, locked and ignored sentences are never sent for scoring.
- `band` is recomputed from `score` (`< 0.30` human, `< 0.60` uncertain, otherwise machine). Unknown `reasons` and `strategy` values are dropped or replaced.
- If a batch fails or a sentence is missing from the reply, the reference heuristic fills in and the score is tagged `engine: "reference"`. The editor shows a notice for those. Scores from your service are tagged `engine: "model"`.
- `GET {MODEL_SERVICE_URL}/v1/health` should return 200. `GET /api/v1/models/status` reports whether it is reachable.
- A rewrite with `meaningScore` of 0 is shown as "Unchecked" and is never applied by "Apply all". Return a real meaning score (0-100) so your candidates can be applied in bulk (the cut-off is 90).
- Free tunnels such as ngrok add an interstitial page. The connector sends `ngrok-skip-browser-warning: 1`.
