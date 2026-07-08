# On-It 📜

**On-It** is a zero-cost, self-hostable freelancer contract management system. It ingests signed contracts (PDF or DOCX), extracts structured payment milestones using a two-pass OCR + LLM pipeline, manages milestone lifecycles, auto-generates GST-compliant invoice PDFs, runs a configurable payment follow-up email sequence, and provides a RAG QA layer for natural-language contract queries.

Targeted primarily at freelancers who sign fixed-price, retainer, phase-based, or advance-with-milestone contracts, it is designed to be hosted entirely on free-tier infrastructure (e.g., Render, MongoDB Atlas M0, Groq).

## Features
- **Contract Ingestion**: Automatically handles Native PDFs, Scanned PDFs (via OCR), and DOCX files.
- **AI-Powered Extraction**: Uses a fast regex anchor pass followed by a Groq LLM (llama-3.1-8b-instant) structured extraction pass.
- **State Machine Lifecycle**: Safely manages milestones through a five-state lifecycle (`PENDING` → `TRIGGERED` → `INVOICED` → `PAID` / `OVERDUE`).
- **Automated Invoicing**: Auto-generates clean, GST-ready PDF invoices using ReportLab.
- **Smart Follow-ups**: Automated email sequences for overdue milestones to ensure you get paid on time.
- **Contract QA (RAG)**: Ask natural-language questions about your contracts, powered by Groq and MongoDB Atlas Vector Search, backed by an NLI faithfulness check to prevent hallucinations.

## Tech Stack
- **Backend**: FastAPI, PyMongo, Pydantic, Passlib, python-jose
- **AI / LLM**: Groq API (`llama-3.1-8b-instant`), HuggingFace Inference API (Embeddings), LangChain
- **Document Processing**: `pdfplumber`, `python-docx`, OCR.space API
- **Database / Search**: MongoDB Atlas, Atlas Vector Search
- **Storage**: Cloudinary (Free tier)
- **Frontend** *(coming soon)*: Next.js, Tailwind CSS, react-pdf

## Getting Started

### Prerequisites
- Python 3.10+
- MongoDB Atlas cluster
- Groq API Key
- OCR.space API Key

### Backend Setup
```bash
git clone https://github.com/your-username/on-it.git
cd on-it/backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your specific API keys and MongoDB URI

# Run the backend development server
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`. You can visit `http://localhost:8000/docs` to view the interactive Swagger UI.

## Documentation
For a deep dive into the architecture, state machine definitions, and component specifications, please read [Plan.md](Plan.md). Active development instructions and codebase conventions can be found in [CLAUDE.md](CLAUDE.md).

## License
MIT License
