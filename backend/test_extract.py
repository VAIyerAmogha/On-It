import sys
import os
from dotenv import load_dotenv

# Load env before importing config
load_dotenv(".env")

sys.path.append("/home/amg/Desktop/On-It/backend")

from lib.ingestion import ingest_file
from lib.extractor import find_anchors

try:
    text, _ = ingest_file("/home/amg/Desktop/On-It/backend/tests/fixtures/scanned_test.pdf", "scanned_test.pdf")
    print("--- TEXT LENGTH ---")
    print(len(text))
    print("--- FIRST 1000 CHARS ---")
    print(text[:1000])
    print("--- LAST 1000 CHARS ---")
    print(text[-1000:])
    print("--- ANCHORS ---")
    for a in find_anchors(text):
        print(a["anchor_type"], a["matched_text"])
except Exception as e:
    print("Error:", e)
