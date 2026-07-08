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
      lib/ingestion.py          — routes PDF/DOCX to pdfplumber/PaddleOCR/python-docx
      lib/classifier.py         — contract type classification (keyword + Groq fallback)
      lib/extractor.py          — two-pass milestone extraction (regex + Groq)
      lib/state_machine.py      — milestone status transitions + audit log
      lib/scheduler.py          — APScheduler jobs (date triggers, followups)
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

## Code conventions
    - All LLM calls go through lib/llm_client.py only — no direct Groq calls in routers or other lib files
    - No business logic in routers — routers call lib/ only, stay thin
    - Type hints on every function signature
    - All external service clients (Mongo, Cloudinary, Groq, sentence-transformers model) are singletons, loaded once at startup
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
Last updated: <!-- date -->
Active work: <!-- what is being built right now -->
Recent completions:
- <!-- task — status -->
Open questions / blockers:
- <!-- anything blocking progress -->