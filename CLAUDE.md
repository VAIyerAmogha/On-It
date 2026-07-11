## What this is
On-It is an agentic freelancer contract-to-invoice system: it ingests a signed contract (PDF/DOCX), extracts structured payment milestones via OCR + LLM, manages milestone state, auto-generates invoices, runs payment follow-up emails, and answers natural-language questions about the contract via RAG.

## Read first
See PLAN.md for full technical spec, architecture, and implementation order.
Start every session by reading PLAN.md, then this file.

## Navigation
    <!-- Fill in after scaffold. Format:
    backend/
      routers/auth.py           — register/login, JWT issuance
      routers/contracts.py      — upload, list, get contract + milestones
      routers/milestones.py     — trigger/paid state transitions, invoice trigger
      routers/invoices.py       — invoice fetch, PDF download, followup pause/resume
      routers/contract_qa.py    — RAG question-answering endpoint
      lib/ingestion.py          — routes PDF/DOCX to pdfplumber/OCR.space/python-docx
      lib/classifier.py         — contract type classification (Groq fallback)
      lib/extractor.py          — single-pass LLM extraction over full text
      lib/state_machine.py      — milestone status transitions, audit log, and lazy follow-up checks
      lib/invoice_gen.py        — ReportLab PDF generation + GST computation
      lib/rag.py                — chunking, embedding, retrieval, NLI faithfulness check
      lib/llm_client.py         — single Groq client wrapper, all LLM calls go through here
      models/                   — MongoDB document schemas (Pydantic)
    frontend/
      ...
    -->

## How to run
    # install
    # backend: pip install -r requirements.txt
    # frontend: npm install

    # start
    # backend: uvicorn main:app --reload
    # frontend: npm run dev

    # test
    # pytest backend/tests/

## Env vars
    MONGODB_URI            — MongoDB Atlas connection string
    GROQ_API_KEY           — Groq API key for LLM extraction, classification, QA generation
    CLOUDINARY_URL         — Cloudinary credentials for PDF/file storage
    GMAIL_ADDRESS          — sender account for invoice + followup emails
    GMAIL_APP_PASSWORD     — Gmail app password (store encrypted in profiles, not plaintext env for user accounts)
    JWT_SECRET             — signing secret for auth tokens
    ENV                    — dev / prod flag for scheduler and logging behavior
    OCR_SPACE_API_KEY      — API key for OCR.space scanned PDF text extraction
    HF_API_TOKEN           — HuggingFace API token for remote embeddings

## Code conventions
    - All LLM calls go through lib/llm_client.py only — no direct Groq calls in routers or other lib files
    - No business logic in routers — routers call lib/ only, stay thin
    - Type hints on every function signature
    - All external service clients (Mongo, Cloudinary, Groq, HF API) are singletons, loaded once at startup
    - Milestone status changes only happen through lib/state_machine.py — never mutate `status` directly on a milestone document elsewhere
    - Every milestone state transition writes an entry to milestone_events (timestamp, actor, previous state) — no silent transitions
    - All extraction functions must return null (not guessed values) for fields not explicitly present in contract text
    - All MongoDB queries involving user data must filter by freelancer_id — no exceptions, this is the only referential integrity enforcement
    - Confidence scores and thresholds (0.65 milestone save threshold, 0.80 project-value threshold, 0.5 NLI faithfulness threshold) live as named constants in one config file, not hardcoded inline

## What NOT to do
    <!-- Fill in as bugs and mistakes are discovered -->
    - Don't use token-level chunking for RAG — section-level chunking is required for contract clauses to stay intact
    - Don't skip the NLI faithfulness check to save latency — unverified answers must not reach the user
    - Don't infer/assume missing contract fields in the LLM extraction prompt — always return null instead
    - Don't block the upload request on the extraction pipeline — it must run as an async background task

## Current focus
Last updated: 2026-07-11
Active work: Phase 7 — Frontend polish
Recent completions:
- FastAPI project scaffold (main.py, config.py, requirements.txt, .env.example) — completed
- Pydantic models for all 6 collections created — completed
- Auth endpoints (POST /api/auth/register, POST /api/auth/login) + JWT + bcrypt — completed
- PyMongo db singleton (db.py) — completed
- Settings endpoints (GET/PUT /api/settings) with JWT dependency — completed
- lib/ingestion.py: pdfplumber native path (is_native_pdf, extract_native_pdf) — completed
- lib/ingestion.py: OCR.space API path (extract_scanned_pdf) — completed
- lib/ingestion.py: python-docx path (extract_docx) — completed
- Section splitter: heading detection, section boundary output (split_sections) — completed
- lib/classifier.py: keyword fast path (keyword_classify) — completed
- lib/llm_client.py: single Groq API wrapper (call_groq) — completed
- lib/classifier.py: Groq fallback logic (classify_contract) — completed
- Contract upload endpoint (POST /api/contracts/upload) + background ingestion — completed
- lib/extractor.py: single Groq structured extraction pass over full text (extract_contract) — completed
- lib/extractor.py: Percentage resolution logic (resolve_amounts) — completed
- lib/extractor.py: Confidence scoring (score_confidence, is_review_required) — completed
- lib/extractor.py: Retainer template creation (build_retainer_template) — completed
- lib/extractor.py: Milestone CRUD orchestrator (extract_milestones, save_milestones) — completed
- routers/contracts.py & routers/milestones.py: GET endpoints for contract and milestones — completed
- lib/state_machine.py: state transitions, audit logging, InvalidTransitionError — completed
- routers/milestones.py: PATCH /api/milestones/{id}/trigger endpoint — completed
- lib/state_machine.py: mark_invoiced helper wrapper — completed
- lib/state_machine.py: mark_paid with auto-triggering — completed
- routers/milestones.py: PATCH /api/milestones/{id}/paid endpoint — completed
- lib/state_machine.py: run_pending_checks() date trigger and followup logic — completed
- routers/contracts.py & routers/milestones.py: BackgroundTasks added for lazy checks — completed
- routers/milestones.py: POST /api/milestones/check-now manual fallback — completed
- lib/invoice_gen.py: build_invoice_data logic — completed
- lib/invoice_gen.py: generate_invoice_pdf (ReportLab layout) — completed
- lib/storage.py: GridFS abstraction for PDF storage — completed
- lib/invoice_gen.py: create_invoice orchestrator — completed
- routers/milestones.py: POST /api/milestones/{id}/invoice endpoint — completed
- routers/invoices.py: GET /api/invoices/{id} and /pdf endpoints — completed
- lib/invoice_gen.py: email delivery with Groq cover note — completed
- lib/invoice_gen.py: send_followup_email and pause API — completed
- lib/rag.py: remote text embedding generation (embed_text) — completed
- lib/rag.py: indexing process (index_contract) and router integration — completed
- lib/rag.py: query retrieval path (retrieve_top_k) — completed
- lib/rag.py: answer generation (generate_answer) — completed
- lib/rag.py: faithfulness NLI check (score_faithfulness) — completed
- lib/rag.py: end-to-end RAG orchestration (ask_contract) — completed
- routers/contract_qa.py: POST /api/contracts/{id}/ask endpoint — completed
- Frontend design system foundation: Tailwind config, Inter font, glass-surface utility, light/dark ThemeContext — completed
- Frontend persistent app shell: Sidebar, Header, HealthPing for cold starts, layout structure, page transition animations — completed
- Frontend authentication: AuthContext (JWT via localStorage), api.ts fetch wrapper, login/register pages, ProtectedRoute guard — completed
- Frontend dashboard: Grid of responsive glass cards, contract fetch wrapper, skeleton loading state, empty state — completed
- Frontend milestones: MilestoneCard component, Contract detail page, trigger/invoice/paid action wiring — completed
- Frontend contract upload: Multipart file upload UI, validation, drag-and-drop styling, background processing transition — completed
- Frontend milestone detail view: Live invoice pre-fill form, client-side GST calculation, linking to generated invoices — completed
- Frontend Contract QA: Slide-over drawer interface, real-time RAG question answering, low faithfulness UI warnings — completed
- Frontend Settings page: Segmented glass cards for profile/bank/email config, write-only password handling, calm success states — completed
- Frontend Invoice page: PDF preview and download object URL blob — completed
- Frontend Landing page: Public hero layout, dashboard routing guards updated — completed
- Bank details removed globally per requirement changes — completed
- Bug: Fixed scanned PDF extraction silent failure (backend exception tracking + frontend polling) — completed
- Bug: Built missing InvoicePreview component, configured pdfjs worker, and fixed frontend api fetch typing — completed
- Refactor: Replaced two-pass regex extraction with single Groq call for full contract reasoning — completed
- Refactor: Made all PENDING -> TRIGGERED state transitions fully manual — completed
- Refactor: Upload page polling and loading screen state implemented — completed
- Feature: Added native PDF contract viewer and GridFS upload/download endpoints for raw contracts — completed
- Bug: Fixed invoice navigation from MilestoneCard — root causes: (1) invoice lookup in contracts.py/milestones.py filtered by freelancer_id causing silent mismatch, removed to use milestone_id only; (2) send_invoice_email in create_invoice was not wrapped in try/except — email failure propagated and caused 500 before frontend could read success; (3) handleInvoice in contract page didn't use try/finally so fetchContractData was skipped on any error; (4) Added MilestoneCard self-fetch fallback via new GET /api/invoices/by-milestone/{milestone_id} endpoint when invoice_id is missing from milestone list — all fixed — completed
- Bug: Fixed dashboard showing 'Untitled Project' — added title field to Contract interface and updated card to use title || project_name || fallback, matching the contract detail page — completed
- Bug: Fixed delete contract always showing error — contract was deleted BEFORE being read, so the file_url reference caused a NameError (500) even though deletion succeeded; fixed by fetching contract doc first, then deleting — completed
- Feature: Added "Sign in with Google" OAuth flow to frontend and backend, keeping email/password support — completed
- Feature: Added `build_progress_summary` utility in `lib/progress_context.py` for aggregation of milestone and invoice data — completed
- Feature: Updated RAG QA pipeline in `lib/rag.py` to merge realtime `progress_summary` state with contract context for natural language milestone status answers, updating both generation and NLI faithfulness checks — completed
- Feature: Removed automatic invoice email sending, added dedicated POST /api/invoices/{id}/send and GET /api/invoices/{id}/email-preview endpoints for manual control over email dispatch — completed
- Feature: Added Invoice Email Preview modal to frontend for manual sending with editable subject and body — completed
Open questions / blockers:
- None