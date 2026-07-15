import json
from typing import Optional

from config import CLASSIFIER_ALLOWED_TYPES
from helpers.llm_client import call_groq

def classify_contract(text: str) -> dict:
    """
    Classify contract using Groq LLM.
    Returns {"contract_type": str, "method": str}
    """
    system_prompt = (
        "Classify the contract's payment structure into exactly one of: "
        "'fixed_price', 'retainer', 'phase_based', 'advance', or 'unsupported'. "
        "Respond ONLY with JSON in the format: {\"contract_type\": \"...\"}."
    )
    user_prompt = text[:3000] if len(text) > 3000 else text
    
    try:
        response_str = call_groq(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            json_mode=True
        )
        parsed = json.loads(response_str)
        contract_type = parsed.get("contract_type")
        if contract_type not in CLASSIFIER_ALLOWED_TYPES:
            contract_type = "unsupported"
    except Exception:
        contract_type = "unsupported"
        
    return {"contract_type": contract_type, "method": "groq"}
