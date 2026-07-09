MILESTONE_CONFIDENCE_THRESHOLD = 0.65
PROJECT_VALUE_CONFIDENCE_THRESHOLD = 0.80
NLI_FAITHFULNESS_THRESHOLD = 0.50
RAG_TOP_K = 3
OCR_MIN_CHARS_PER_PAGE = 100
MAX_ANCHOR_CONTEXT_CHARS = 150
GST_DEFAULT_RATE = 0.18
FOLLOWUP_SCHEDULE_DAYS = [-3, 0, 7, 14, 30]
SCHEDULER_TRIGGER_HOUR_IST = 8
SCHEDULER_FOLLOWUP_HOUR_IST = 9

import os
from dotenv import load_dotenv

load_dotenv()

OCR_SPACE_FREE_ENDPOINT = "https://api.ocr.space/parse/image"
OCR_TIMEOUT_SECONDS = 30
OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY")

SECTION_BOUNDARY_KEYWORDS = [
    "payment", "milestone", "schedule", "deliverable", "terms", "scope"
]

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_TIMEOUT_SECONDS = 30

CLASSIFIER_ALLOWED_TYPES = ["fixed_price", "retainer", "phase_based", "advance", "unsupported"]

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

HF_API_TOKEN = os.getenv("HF_API_TOKEN")
HF_INFERENCE_ENDPOINT = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
