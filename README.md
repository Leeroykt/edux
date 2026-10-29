# eduX — Lossless Document Engine & Academic Integrity Platform

> **Formerly DocHumanizer** • Built according to the *eduX Product Plan & Build Checklist* (M0–M20).

![eduX Banner](https://img.shields.io/badge/Stack-Next.js%2015%20%7C%20TypeScript%20%7C%20TailwindCSS-indigo)
![Architecture](https://img.shields.io/badge/Architecture-Monorepo%20(pnpm)-teal)
![Integrity](https://img.shields.io/badge/Fidelity-Byte--Identical%20OOXML-emerald)

---

## 1. Project Overview

**eduX** is a high-fidelity academic workbench designed to solve two core problems without compromising document styling, formulas, or academic integrity:
1. **AI Likelihood Detection & Voice Restoration**: Pinpoint machine-like cadence at the line and sentence level, offering verified human rewrite candidates that preserve facts, numbers, and voice while keeping Word (`.docx`) formatting 100% byte-identical.
2. **Turnitin-Style Similarity Matching & Reporting**: Cross-reference submissions against open scholarly repositories (arXiv, PubMed, OpenAlex) and web crawls with transparent source coverage disclosures, dynamic exclusion filters, and side-by-side passage comparison.

---

## 2. Monorepo Structure

```text
edux/
├── apps/
│   ├── web/                    # Next.js 15 App Router Frontend (Editor, Dashboards, Reports)
│   ├── api/                    # [Backend Partner] TypeScript API Gateway (NestJS / Fastify)
│   └── ops/                    # [Planned] Internal operator & trust review console
├── services/
│   ├── docx-engine/            # [Backend Partner] Python OOXML run-level patcher & parser
│   ├── detect/                 # [Backend Partner] Transformer ensemble AI detector
│   ├── rewrite/                # [Backend Partner] Instruction-tuned LLM rewriter & NLI checks
│   └── similarity/             # [Backend Partner] Sharded fingerprint similarity engine
├── packages/
│   ├── schema/                 # Shared TypeScript models & API contract (@edux/schema)
│   └── ui/                     # Shared UI tokens and accessible primitives
├── docs/                       # Specifications & Product Manuals
│   ├── DocHumanizer Product Plan and Development Manual.pdf
│   └── eduX Development Plan and Build Checklist (1).pdf
└── pnpm-workspace.yaml         # Multi-package monorepo orchestration
```

---

## 3. Frontend Architecture (`apps/web`)

The frontend is fully built and ready for production, implementing the modules specified in the build checklist:

* **[M12] Document Editor**:
  * Realistic Word-like canvas with page margins, headers, and pagination.
  * Interactive sentence click-to-inspect and hover highlights.
  * **Layer toggles**: AI Likelihood Heatmap, Turnitin-Style Similarity Highlights, or Clean document.
  * **Sensitivity Slider**: Real-time threshold filtering.
  * **Inspector Panel**: 5 tabs (`Rewrites`, `AI Likelihood Details`, `Matched Sources`, `Word Style Compliance`, and `Event History`).
  * **Undo/Redo**: Full history stack for lossless rollbacks.
* **[M9] Turnitin-Style Similarity & Combined Report**:
  * Dynamic similarity percentage meter.
  * Search coverage statement (transparently displaying indexed scholarly pools).
  * Interactive exclusion toggles (Exclude Quotes, Exclude Bibliography, Exclude Matches < 8 words).
  * Ranked source list with direct paper links.
  * Side-by-side passage diff viewer.
* **[M13] Individual Dashboard**:
  * Personal papers workspace with "Is this your own paper?" license confirmation.
  * Real-time Daily Usage Meter (words scored, suggestions used, active paper slots).
  * Learned Voice Profile card with stylometric calibration strength.
  * Pattern-mined personal writing advice.
* **[M14] Edu Pro Workspace**:
  * Multi-client & student cohort folder switcher.
  * 4-column Kanban board (`Uploaded`, `In Review`, `Returned`, `Closed`).
  * One-click batch scoring for entire folders.
  * Turnaround & quality analytics (average AI score drop, suggestion acceptance rate).
* **[M5] LaTeX Formula Box**:
  * KaTeX live formula preview with direct round-trip conversion to native Word OMML equations.
* **[M4.16 - M4.18] Fidelity Export Engine**:
  * Clean export (accepted rewrites baked in; untouched nodes byte-identical).
  * Microsoft Word native Tracked Changes export (`w:ins` / `w:del` attributed to author).
  * Fidelity QA verification certificate.
* **[M2] Pricing & Usage Tiers**:
  * **Individual Plan ($5/mo)**: 3 active papers, 30k words/day, 300 rewrites/day, 1 voice profile.
  * **Edu Professional ($15/mo)**: 40 active papers, 150k words/day, 1,500 rewrites/day, folders & batch tools.
  * **Pay-per-paper ($5 one-time)**: 1 paper, unlimited edits for 30 days.

---

## 4. API Integration Contract

The frontend connects through `apps/web/src/services/api/apiClient.ts` using the strongly-typed interfaces defined in `@edux/schema`.

### API Endpoints Mapped to Backend:

| Endpoint | Method | Spec Item | Description |
| :--- | :--- | :--- | :--- |
| `/v1/documents/:id` | `GET` | M3.6 | Fetch document metadata |
| `/v1/documents/:id/structure` | `GET` | M4.3 | Fetch paragraphs, runs, sentences, and atoms |
| `/v1/documents/:id/scores` | `GET` | M7.10 | Stream AI probability scores by paragraph |
| `/v1/sentences/:id/suggest` | `POST` | M10.8 | Get 3 verified candidates with meaning scores |
| `/v1/sentences/:id/apply` | `POST` | M10.9 | Apply rewrite and increment version |
| `/v1/documents/:id/reports/latest` | `GET` | M9.3 | Fetch similarity report and matched sources |
| `/v1/usage` | `GET` | M2.8 | Fetch daily words, suggestions, and paper quota |
| `/v1/me/voice-profile` | `GET` | M11.3 | Fetch learned style vector and pattern tips |

### Connecting to Your Partner's Live API:
By default, the frontend runs with mock data and latency simulation so you can explore and demonstrate all features immediately.

When your partner launches the backend API server:
1. In `apps/web`, create or edit `.env.local`:
   ```bash
   NEXT_PUBLIC_USE_MOCK=false
   NEXT_PUBLIC_API_URL=http://localhost:3001/v1
   ```
2. The UI automatically switches to the live backend with zero code modifications!

---

## 5. Development Quickstart

### Prerequisites
* **Node.js LTS (v20+)**
* **pnpm (v12+)**

### Run Locally
```bash
# Install workspace dependencies
pnpm install

# Start the frontend development server
pnpm dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Build for Production
```bash
pnpm build
```

---

## 6. Git Repository & Remote

* **GitHub Remote**: `https://github.com/Leeroykt/edux.git`
* **Default Branch**: `main`
