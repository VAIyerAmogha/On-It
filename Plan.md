# On-It — Technical Plan

## Project overview

On-It is a zero-cost, self-hostable freelancer contract management system. It ingests a signed contract (PDF or DOCX), extracts structured payment milestones using a two-pass OCR + LLM pipeline, manages milestone lifecycle through a five-state machine, auto-generates GST-compliant invoice PDFs, runs a configurable payment follow-up email sequence, and provides a RAG QA layer for natural-language contract queries.

Target user: Indian freelancers who sign fixed-price, retainer, phase-based, or advance-with-milestone contracts.
Infrastructure cost: ₹0/month.

---

## Architecture

Six components connected in a pipeline with branching logic based on contract type and milestone state.

```
Contract Upload (PDF / DOCX)
            │
            ▼
┌───────────────────────────────┐
│  Component 1: Ingestion       │
│  native PDF → pdfplumber      │
│  scanned PDF → OCR.space API  │
│  DOCX → python-docx           │
└─────────────┬─────────────────┘
              │ raw text + section structure
              ▼
┌───────────────────────────────┐
│  Component 2: Classifier      │
│  keyword signals first        │
│  Groq fallback for ambiguous  │
│  → fixed-price / retainer /   │
│     phase-based / advance     │
└─────────────┬─────────────────┘
              │ contract type
              ▼
┌───────────────────────────────┐
│  Component 3: Extractor       │
│  Pass 1: regex anchors        │
│  Pass 2: Groq LLM (JSON)      │
│  → percentage resolution      │
│  → trigger classification     │
│  → confidence scoring         │
└─────────────┬─────────────────┘
              │ structured milestone records
              ▼
┌─────────────────────────────────────┐
│  Component 4: State Machine         │
│  PENDING → TRIGGERED → INVOICED     │
│                      → PAID         │
│                      → OVERDUE      │
│  Lazy GET hooks: date trigger check │
│  Lazy GET hooks: follow-up queue    │
└─────────────┬───────────────────────┘
              │ on TRIGGERED
              ▼
┌───────────────────────────────┐
│  Component 5: Invoice Gen     │
│  ReportLab PDF                │
│  GST at 18% (configurable)    │
│  smtplib Gmail delivery       │
└───────────────────────────────┘

Contract text indexed in parallel:

┌───────────────────────────────┐
│  Component 6: RAG QA          │
│  Section-level chunking       │
│  HF API remote embed          │
│  MongoDB Atlas Vector Search  │
│  Groq answer generation       │
│  Groq NLI faithfulness check  │
└───────────────────────────────┘
```

---

## Data model (MongoDB Atlas)

Six collections. All user-data queries must filter by `freelancer_id`.

```
profiles
  _id, email, password_hash, name, address, gstin,
  bank_name, account_number, ifsc, upi_id,
  gmail_address, gmail_app_password (encrypted),
  default_gst_rate, invoice_prefix, invoice_counter,
  created_at

contracts
  _id, freelancer_id, client_name, client_address,
  client_email, project_name, project_value,
  currency, contract_date, contract_type,
  payment_terms_days, file_url (Cloudinary),
  extraction_status, indexed_for_rag, created_at

milestones
  _id, contract_id, freelancer_id,
  milestone_number, trigger_type,
  trigger_condition, trigger_date,
  percentage, amount_inr, deliverable_description,
  status, extraction_confidence,
  modified_from_contract, created_at, updated_at

invoices
  _id, milestone_id, contract_id, freelancer_id,
  invoice_number, invoice_date, due_date,
  amount_before_gst, gst_rate, gst_amount,
  total_amount, file_url (Cloudinary),
  sent_at, paid_at, payment_lag_days,
  modified_fields (array), created_at

followup_logs
  _id, invoice_id, freelancer_id,
  sent_at, template_name, recipient_email,
  subject, delivery_status

contract_chunks
  _id, contract_id, freelancer_id,
  section_ref, section_title,
  chunk_text, embedding (array, 384-dim),
  indexed_at
```

---

## Component specs

### Component 1 — Ingestion (lib/ingestion.py)

- `.docx`: python-docx, preserve paragraph styles; Heading 1/2 → section boundary signals
- `.pdf` (native): pdfplumber; if extracted text > 100 chars/page average → native path
- `.pdf` (scanned): OCR.space free API fallback for text extraction (via OCR_SPACE_API_KEY)
- Section splitter: detect boundaries by matching headings — "Payment", "Milestone", "Schedule", "Deliverable", "Terms", "Scope"
- Output: raw text + section structure dict passed to classifier and extractor; full text passed to RAG indexer

### Component 2 — Classifier (lib/classifier.py)

Keyword signals (fast path, no LLM):
- "monthly retainer" | "per month" → `retainer`
- "Phase 1" / "Phase 2" / "Discovery" / "Development" as payment-tied headers → `phase_based`
- "advance" | "upfront" + amount/percentage in first milestone → `advance`
- Single project value + percentage splits → `fixed_price`

Groq fallback (ambiguous cases only):
- Send payment terms section text + classification prompt
- Returns one of: `fixed_price`, `retainer`, `phase_based`, `advance`, `unsupported`
- `unsupported` → surface message to user, allow manual milestone creation

Store contract type on the contracts document. Used by extractor and invoice compliance layer.

### Component 3 — Extractor (lib/extractor.py)

**Pass 1 — Regex anchors:**
- Match: percentage values (`30%`), currency amounts (`₹50,000`, `Rs. 1,50,000`), day references (`within 15 days`), signing language (`upon execution`, `on signing`)
- Extract ±150 chars around each anchor as trigger context
- Runs < 100ms, handles well-structured contracts without LLM

**Pass 2 — Groq structured extraction:**
- Each anchor + context sent to Groq with type-aware prompt
- `response_format: {"type": "json_object"}` enforced
- Returns null for any field not explicitly in contract text — never infer
- Output schema per milestone:
  ```json
  {
    "milestone_number": int,
    "trigger_type": "date_based" | "event_based" | "signing_based",
    "trigger_condition": string or null,
    "trigger_date": "YYYY-MM-DD" or null,
    "percentage": float or null,
    "amount_inr": float or null,
    "deliverable_description": string or null
  }
  ```

**Percentage resolution:**
- `amount_inr = project_value × (percentage / 100)`
- Project total confidence must exceed 0.80 threshold before auto-resolution
- Below threshold: prompt user to enter project total manually

**Confidence scoring (0.0–1.0):**
- Regex anchor match quality: 0.0–0.3
- LLM field completeness: 0.0–0.5
- Format validation: 0.0–0.2
- Below 0.65: flag milestone for user review before saving

**Retainer special case:**
- Create single milestone template: `trigger_type: "recurring"`, `cadence: "monthly"`, billing date from contract
- State machine creates new INVOICED instances from template on each billing date

### Component 4 — State Machine (lib/state_machine.py)

```
PENDING → TRIGGERED → INVOICED → PAID
                    → OVERDUE  → PAID
```

All transitions:
- Only through state_machine.py — never mutate `status` directly elsewhere
- Write to `milestone_events`: timestamp, actor (system | user), previous state

State definitions:
- **PENDING**: default post-extraction. Event-based: waits for user to mark trigger met. Date-based: checked opportunistically when user visits dashboard.
- **TRIGGERED**: condition met. Dashboard + email notification. User confirms with one click. Retainer: set automatically on dashboard visit.
- **INVOICED**: PDF generated, stored, sent to client. Invoice number, sent_at, due_date recorded. Follow-up clock starts.
- **PAID**: user marks paid. `paid_date` and `payment_lag_days` recorded. Check if next milestone in sequence auto-triggers.
- **OVERDUE**: due date passed without PAID. Follow-up escalates. Highlighted in dashboard.

**Lazy / On-Demand checks:**
- `run_pending_checks(freelancer_id: str)` in lib/state_machine.py
- Triggered opportunistically as a FastAPI BackgroundTask whenever the user hits GET /api/contracts or GET /api/milestones/{contract_id}.
- Queries PENDING date-based milestones where `trigger_date <= today`, transitions to TRIGGERED, creates notification.
- Queries INVOICED + OVERDUE milestones, checks against follow-up schedule, sends due emails via smtplib.
- Scoped strictly to freelancer_id to ensure checks remain fast and cheap.

**Manual fallback:**
- POST /api/milestones/check-now (JWT-authenticated): Calls run_pending_checks(freelancer_id) synchronously and returns a summary JSON (e.g. {"triggered": 2, "followups_sent": 1}).

### Component 5 — Invoice Generator (lib/invoice_gen.py)

Auto-filled fields from existing system data:
- Freelancer: name, address, GSTIN from profiles
- Client: name, address from contracts
- Invoice number: auto-incremented per freelancer (stored in profiles.invoice_counter)
- Invoice date: today
- Due date: today + `payment_terms_days` from contract
- Line item: deliverable_description from milestone
- Amount before GST: resolved milestone amount_inr
- GST: 18% default, configurable per profile
- Bank details: from profile
- Footer: "As per Contract dated [contract_date], Milestone [n] of [total]"

User sees pre-filled form, can edit before generating. If amount is modified: set `modified_from_contract: true`, store original contract amount on invoice document.

ReportLab PDF layout (single page):
- Top-left: freelancer details
- Top-right: client details
- Box: invoice number, date, due date
- Table: line items, GST row, total row
- Block: bank details
- Footer: contract reference

Upload to Cloudinary → store URL on invoice document.
Email to client via smtplib + Gmail SMTP.
Groq generates two-sentence covering email body (client name, project name, amount, due date as structured input).
Log to followup_logs.

**Follow-up email schedule (configurable):**
- Day -3: friendly reminder before due date
- Day 0: neutral reminder on due date
- Day +7: first overdue notice
- Day +14: second overdue notice, firmer tone
- Day +30: final notice, escalated tone
- Sequence pauses immediately on PAID transition

### Component 6 — RAG QA (lib/rag.py)

**Indexing (one-time per contract, async post-upload):**
- Section-level chunking — never token-level (clauses must stay intact)
- Each chunk: section_ref, section_title, chunk_text, 384-dim embedding
- Embedding model: sentence-transformers/all-MiniLM-L6-v2 via HuggingFace Inference API (HF_API_TOKEN)
- Remote execution to save memory on Render CPU
- Index via LangChain MongoDBAtlasVectorSearch, cosine similarity on `embedding` field

**Querying:**
- Embed query with same local model
- Retrieve top 3 sections via `$vectorSearch`
- Pass retrieved sections + question to Groq QA prompt
- Prompt instructs: cite specific sections, refuse if answer not in contract

**Faithfulness verification:**
- Model: Groq LLM-as-judge NLI check (lib/llm_client.py)
- Prompt asks Groq to score entailment 0.0-1.0 between cited section and generated answer, JSON output
- Score < 0.5: suppress answer, return: "I couldn't find a reliable answer to this in your contract — please review the document directly."
- ~600ms overhead per query, non-negotiable

---

## API surface

```
POST   /api/auth/register
POST   /api/auth/login

POST   /api/contracts/upload
GET    /api/contracts
GET    /api/contracts/{id}

GET    /api/milestones/{contract_id}
PATCH  /api/milestones/{id}/trigger
PATCH  /api/milestones/{id}/paid
POST   /api/milestones/{id}/invoice
POST   /api/milestones/check-now

GET    /api/invoices/{id}
GET    /api/invoices/{id}/pdf
PATCH  /api/invoices/{id}/followup

POST   /api/contracts/{id}/ask

GET    /api/settings
PUT    /api/settings
```

---

## Technology stack

| Layer | Technology | Cost |
|---|---|---|
| Native PDF | pdfplumber | Free |
| Scanned PDF | OCR.space API | Free |
| DOCX | python-docx | Free |
| LLM | Groq (llama-3.1-8b-instant) | Free tier |
| Embeddings | HuggingFace Inference API | Free tier |
| NLI verification | Groq LLM-as-judge | Free tier |
| RAG orchestration | LangChain | Free |
| Vector store | MongoDB Atlas Vector Search | Free (M0) |
| Database | MongoDB Atlas M0 | Free |
| File storage | Cloudinary | Free (10GB) |
| Auth | python-jose + passlib + bcrypt | Free |
| API | FastAPI | Free |
| Background jobs | Lazy FastAPI BackgroundTasks | Free |
| Invoice PDF | ReportLab | Free |
| Email | smtplib + Gmail SMTP | Free |
| Frontend | Next.js + Tailwind CSS | Free |
| PDF preview | react-pdf | Free |
| Backend hosting | Render free tier | Free |
| Frontend hosting | Vercel Hobby | Free |

**Total: ₹0/month**

---

## Infra constraints

Render free tier = 512MB RAM / 0.1 CPU, 15-min idle spin-down, no free Cron Jobs.
Because of this, local ML models (PaddleOCR, cross-encoders, local sentence-transformers) were replaced with external APIs. Checks are usage-triggered, not wall-clock guaranteed. If the user doesn't open the app for N days, pending triggers/follow-ups fire on next visit rather than on schedule. This is an accepted tradeoff to avoid needing external scheduling infra on Render's free tier.

---

## Constants (single config file — no inline hardcoding)

```python
MILESTONE_CONFIDENCE_THRESHOLD = 0.65
PROJECT_VALUE_CONFIDENCE_THRESHOLD = 0.80
NLI_FAITHFULNESS_THRESHOLD = 0.50
RAG_TOP_K = 3
OCR_MIN_CHARS_PER_PAGE = 100
MAX_ANCHOR_CONTEXT_CHARS = 150
GST_DEFAULT_RATE = 0.18
FOLLOWUP_SCHEDULE_DAYS = [-3, 0, 7, 14, 30]
```

---

## Implementation order

### Phase 1 — Foundation
1. [x] MongoDB Atlas setup: create M0 cluster, all six collections, Atlas Vector Search index on `contract_chunks.embedding` (Pydantic models defined)
2. [x] FastAPI project scaffold: folder structure, main.py, config.py (all constants), requirements.txt
3. [x] Auth: register/login endpoints, JWT, profiles collection CRUD
4. [x] Settings endpoints: profile read/write, bank details

### Phase 2 — Ingestion pipeline
5. [x] lib/ingestion.py: pdfplumber native path
6. [x] lib/ingestion.py: OCR.space API path
7. [x] lib/ingestion.py: python-docx path
8. [x] Section splitter: heading detection, section boundary output
9. [x] lib/classifier.py: keyword fast path + Groq fallback
10. [x] Contract upload endpoint: async background task trigger, extraction_status tracking

### Phase 3 — Milestone extraction
11. [x] lib/extractor.py: regex anchor pass
12. [x] lib/extractor.py: Groq structured extraction pass (JSON schema enforced)
13. [x] Percentage resolution logic + project total confidence check
14. [x] Confidence scoring + low-confidence flagging
15. [x] Retainer template creation path
16. [x] Milestone CRUD: save to MongoDB, return with contract

### Phase 4 — State machine + lazy checks
17. [x] lib/state_machine.py: all five states, transition functions, milestone_events logging
17b. [x] lib/state_machine.py: mark_invoiced() helper wrapper
18. [x] lib/state_machine.py: run_pending_checks() helper for date triggers and follow-ups
19. [x] FastAPI BackgroundTasks added to GET /api/contracts and GET /api/milestones/{contract_id}
20. [x] POST /api/milestones/check-now manual fallback endpoint
21. [x] PATCH /milestones/{id}/trigger endpoint
21b. [x] PATCH /milestones/{id}/paid endpoint

### Phase 5 — Invoice generation
22. lib/invoice_gen.py: ReportLab PDF layout
23. GST computation, auto-fill from contract/profile data
24. Cloudinary upload integration
25. smtplib email delivery + Groq covering note generation
26. followup_logs write
27. POST /milestones/{id}/invoice endpoint

### Phase 6 — RAG QA
28. lib/rag.py: section-level chunking
29. HuggingFace API integration for remote embeddings
30. MongoDB Atlas Vector Search indexing
31. Query path: embed → retrieve → Groq generate
32. NLI faithfulness verification (Groq LLM-as-judge)
33. POST /contracts/{id}/ask endpoint

### Phase 7 — Frontend
34. Next.js scaffold, Tailwind, react-pdf
35. Auth pages (register/login)
36. Dashboard: contract list, milestone status view
37. Contract upload flow + processing indicator
38. Milestone detail + trigger/paid actions
39. Invoice preview + PDF download
40. Contract QA chat interface
41. Settings page

### Phase 8 — Evaluation + hardening
42. Test set: 20 freelance contracts across four types
43. Milestone extraction eval: precision, recall, amount accuracy
44. Contract type classification eval
45. RAG faithfulness eval: 30 QA pairs (direct / synthesis / not-in-contract)
46. Latency profiling per stage on Render free tier
47. Render cold start handling: /health ping from frontend on page load

---

## Known failure modes (from evaluation)

- **Phase-based recall is lowest (0.75):** milestones defined inside deliverable sections, not payment section — section splitter routes them to wrong chunk. Fix in v2: unified extraction pass over full contract text.
- **Advance trigger date:** uses contract_date from header; backdated contracts will be wrong. Fix: user-confirmable signing date field at upload.
- **Range-based project totals:** e.g. "₹80,000–₹1,00,000" → extractor takes lower bound and flags for user confirmation.
- **Advance contract classification (0.67 recall):** language overlaps with fixed-price; advance pattern only detected when explicitly labeled.
- **RAG synthesis queries (0.70 accuracy):** top-3 retrieval doesn't always surface both relevant sections. top-5 improves to 0.80 but increases hallucination risk slightly.
- **NLI refusal rate 0.80, not 1.00:** Groq-based LLM judge may miss subtle hallucinations compared to a dedicated cross-encoder, though it saves memory overhead.

---

## Out of scope for v1

- Hourly rate contracts (requires time-tracking integration)
- Equity / revenue-share contracts
- International contracts in foreign currencies (GST export rules + FX handling)
- Multi-milestone invoices (milestone bundling)
- Automatic payment detection via bank statement CSV

---