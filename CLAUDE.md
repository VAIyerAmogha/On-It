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
      routers/notifications.py  — fetch sorted notifications list for freelancer
      lib/ingestion.py          — routes PDF/DOCX to pdfplumber/OCR.space/python-docx
      lib/classifier.py         — contract type classification (Groq fallback)
      lib/extractor.py          — single-pass LLM extraction over full text
      lib/state_machine.py      — milestone status transitions, audit log, and lazy follow-up checks
      lib/invoice_gen.py        — ReportLab PDF generation + GST computation
      lib/rag.py                — chunking, embedding, retrieval, NLI faithfulness check
      lib/notifications.py      — notifications engine (Pure Mongo queries + reshape)
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
- Feature: Refactored email dispatch into a shared `email_utils.py` and implemented manual email verification for local signups (`/api/auth/register` sends token, no JWT), added `/verify-email` and `/resend-verification` endpoints, and enforced verification check on login.
- Feature: Added frontend verification flows: updated Register and Login pages with glass-surface calm states for "check inbox" and "please verify email", added `/verify-email` page for token checking, and hooked up `resendVerificationEmail` api fetch helper.
- Feature: Implemented backend notifications system (`lib/notifications.py` and `GET /api/notifications` endpoint) running four targeted Mongo queries for overdue payments, payments due soon, upcoming deadlines, and uninvoiced milestones, sorted by urgency.
- Feature: Added glass-surface notifications panel above the contract grid on the frontend Dashboard to display sorted alerts (overdue, due soon, deadlines, uninvoiced) with slide/fade animation, mobile responsive stacking, and inline "Mark Paid" and "Generate Invoice" async actions with per-row loading and inline error states.
- Feature: Added goodwill discount and delay acknowledgment support for missed deadline invoices, including ReportLab discount line rendering, dynamic delayed Groq cover note generation, and new validated POST /api/milestones/{id}/invoice-missed-deadline endpoint.
- Feature: Implemented the frontend "Missed Deadline" invoice generation flow on MilestoneCard (split buttons in TRIGGERED state, glass-surface dialog modal, integer discount input validation, live client-side preview calculation) and updated the Invoice detail page (muted "Goodwill Discount Applied" badge and original total amount struck-through) — completed
- Feature: Added three new delivery-level notification types (MISSED_DELIVERY, DELIVERY_REMINDER, UNINVOICED_TRIGGERED) to backend `lib/notifications.py` with updated urgency sorting order. — completed
- Feature: Updated Dashboard notification panel frontend to render the three new delivery-level notification types with dedicated UI states and inline "Mark as Triggered" action for missed deadlines. — completed
- Feature: Replaced persistent vertical Sidebar layout with a glassmorphic top Navbar using shadcn design conventions, featuring responsive mobile menus, dynamic contracts dropdown (fetching from /api/contracts), and profile/logout controls — completed
- Feature: Replaced hardcoded progress bar and paid milestone values on Dashboard contract cards with dynamic backend-derived counts — completed
- Bugfix: Enabled synchronous run of pending state machine checks inside the list_notifications API endpoint, preventing race conditions and ensuring notifications are displayed on first-load — completed
- Feature: Added individual notification close (X) buttons to the Dashboard notification rows, utilizing localStorage persistence to keep notifications dismissed across page reloads — completed
- Feature: Completed the cascading contract deletion pipeline to ensure that deleting a contract fully removes the contract document, raw contract PDF from GridFS, all associated milestones, milestone_events audit logs, invoices, generated invoice PDFs from GridFS, followup logs, and RAG/vector chunks — completed
- Feature: Reworked the Dashboard to feature a user greeting, animated SVG statistics cards (Revenue, Paid/Unpaid contracts, Active contracts, and Overdue payments), and integrated the upload file interface directly on the dashboard page with live processing status polling — completed
- Feature: Created a dedicated `/contracts` page featuring a dual-tab layout with a chronological milestone timeline (detailing clients, amounts, status, and deadlines) and a searchable, status-filtered contracts list — completed
- Feature: Added backend endpoints `GET /api/contracts/stats` and `GET /api/milestones/all/list` to support the dashboard statistics and chronological milestone timeline — completed
- Feature: Updated the glassmorphic Navbar dropdown and mobile menu drawer to include direct routing to the new contracts list & timeline page — completed
- Bugfix: Resolved navbar layout overlap issue in AppLayout by switching from shorthand padding to explicit padding classes, preventing top padding from being overridden by standard responsive padding shorthand — completed
- Refactor: Updated Groq chatbot/RAG and invoice cover note email system prompts to align with a user-facing freelancer perspective (framing the freelancer as the user who invoices clients for completed milestones) — completed
- Feature: Moved Dashboard notifications panel to the top of the dashboard page (above the user greeting) and implemented interactive inline expandable hover summaries (40-50 words each) outlining exactly what to do and by when — completed
- Feature: Implemented centered delete contract confirmation modal with a blurred background using the customized Modal component, showing detailed cascading impacts before deletion — completed
- Refactor: Updated custom Modal component to render into document.body using React Portals, resolving viewport layout clipping issues when fixed modals are nested inside elements with animations/transitions — completed
- Bugfix: Refactored expected days text in dashboard notifications so that if 0 days remain, it displays "expected by end of day" / "Due by end of day" instead of "0 days" — completed
- Bugfix: Resolved "Unknown Client" bug in timeline view by falling back to contract client_contact name inside the backend milestone listing endpoint — completed
- Style: Reduced width of timeline milestone cards to max-w-2xl and adjusted padding to p-3.5 sm:p-4 to eliminate empty space — completed
- Feature: Redesigned AI chat to open as a sticky inline sidebar on the right of the contract details page, dynamically pushing page content to the left and expanding the container to max-w-7xl, while retaining full-screen drawer overlay behavior on mobile — completed
- Vercel Backend Migration: Wrapped FastAPI with Mangum handler in api/index.py, configured routing and cron scheduling in vercel.json, secured check-now-cron endpoint with CRON_SECRET, updated CORSMiddleware configuration in main.py, and unified frontend API base url with NEXT_PUBLIC_API_URL — completed
Open questions / blockers:
- None