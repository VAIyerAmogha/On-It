import json
from typing import Optional
from datetime import datetime, timezone
import logging

from config import PROJECT_VALUE_CONFIDENCE_THRESHOLD, MILESTONE_CONFIDENCE_THRESHOLD
from helpers.llm_client import call_groq

def extract_contract(full_text: str) -> dict:
    """
    Extract overall contract details and all payment milestones using Groq.
    """
    system_prompt = """
    You are an expert contract analyst. Extract the overall contract details and all payment milestones from the provided text.
    
    OCR Currency Symbol Correction:
    The input text contains OCR/PDF parsing errors. Specifically, the Indian Rupee symbol '₹' is frequently misread as the digit '7', '<', or 'R' when directly adjacent to numbers.
    You MUST identify and correct these misreads:
    - If a number represents money (like project value or milestone amount) and starts with '7' but is clearly a misread of the Rupee symbol (e.g., '72,50,000' representing '₹2,50,000' or '750,000' representing '₹50,000'), you MUST extract the corrected numeric value (e.g., 250000.0, 50000.0).
    - Cross-reference numeric amounts with any words describing the amount (e.g., 'Two Lakh Fifty Thousand Rupees' = 250000.0).
    - Ensure mathematical consistency: the sum of the individual milestone amounts MUST equal the total project value. If milestone amounts like '750,000' are parsed but the total project value is 2,50,000 (Two Lakh Fifty Thousand Rupees), correct those milestones to their true intended values of 50000.0.
    
    Except for performing this OCR currency correction, do NOT infer or guess values not explicitly stated in the text. Any field you cannot confidently determine MUST be null.
    
    Output strictly in this JSON format:
    {
      "ocr_correction_reasoning": "<string: Write a detailed, step-by-step mathematical reasoning analyzing each number, identifying any prepended '7', '<', or 'R' OCR errors, verifying against written words, and verifying that the milestone sum equals the project value. Example: 'Project value is ₹2,50,000 (Two Lakh Fifty Thousand). Milestone 1 is 750,000. Since 750,000 exceeds the project value of 2,50,000, the leading 7 is an OCR error; the actual value is 50,000. Milestone 2 is <75,000, so it is 75,000. Milestone 3 is R75,000, so it is 75,000. Milestone 4 is 750,000, so it is 50,000. Verification: 50,000 + 75,000 + 75,000 + 50,000 = 2,50,000.'>",
      "contract_type": "fixed_price" | "retainer" | "phase_based" | "advance" | "unsupported",
      "title": "<string, a clean, human-readable project/contract name derived from the document>",
      "client_contact": {
        "name": "<string or null>",
        "email": "<string or null>",
        "phone": "<string or null>"
      },
      "summary": "<string, 2-3 plain-English sentences describing what the contract covers — scope, parties, high-level payment structure>",
      "project_value": <float or null>,
      "project_value_confidence": <float between 0.0 and 1.0>,
      "milestones": [
        {
          "milestone_number": <int>,
          "trigger_type": "date_based" | "event_based" | "signing_based" | "recurring",
          "trigger_condition": "<string or null>",
          "trigger_date": "<YYYY-MM-DD or null>",
          "percentage": <float or null>,
          "amount_inr": <float or null>,
          "deliverable_description": "<string or null>",
          "extraction_confidence": <float between 0.0 and 1.0>
        }
      ]
    }
    """
    
    try:
        response_str = call_groq(
            system_prompt=system_prompt,
            user_prompt=full_text[:16000], # Process up to first 16k chars
            json_mode=True
        )
        result = json.loads(response_str)
        if not isinstance(result, dict):
            return {}
        return result
    except Exception as e:
        logging.error(f"extract_contract error: {e}")
        return {}

def resolve_amounts(milestones: list[dict], project_value: Optional[float],
                 project_value_confidence: float) -> tuple[list[dict], bool]:
    """
    Resolve missing amount_inr values from percentages if the project value confidence is high enough.
    Returns the updated milestones and a boolean indicating if auto-resolution was successful.
    """
    resolved_all = True
    for milestone in milestones:
        if "amount_inr" not in milestone:
            milestone["amount_inr"] = None
            
        if milestone.get("amount_inr") is None and milestone.get("percentage") is not None:
            if project_value_confidence >= PROJECT_VALUE_CONFIDENCE_THRESHOLD and project_value is not None:
                milestone["amount_inr"] = round(project_value * (milestone["percentage"] / 100), 2)
            else:
                resolved_all = False
        elif milestone.get("amount_inr") is None and milestone.get("percentage") is None:
            resolved_all = False
            
    return milestones, resolved_all

def save_milestones(db, milestones: list[dict]) -> list[str]:
    """
    Save extracted milestones to MongoDB.
    """
    if not milestones:
        return []
        
    now = datetime.now(timezone.utc)
    for ms in milestones:
        ms["status"] = "PENDING"
        ms["created_at"] = now
        ms["updated_at"] = now
        
    result = db.milestones.insert_many(milestones)
    return [str(inserted_id) for inserted_id in result.inserted_ids]

def is_review_required(confidence: float) -> bool:
    """
    Check if a milestone needs manual review based on its confidence score.
    """
    return confidence < MILESTONE_CONFIDENCE_THRESHOLD
