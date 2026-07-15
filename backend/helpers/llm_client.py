import requests

from config import (
    GROQ_API_KEY,
    GROQ_CHAT_ENDPOINT,
    GROQ_MODEL,
    GROQ_TIMEOUT_SECONDS
)

class LLMClientError(Exception):
    """Exception raised for errors in the Groq API call."""
    pass

def call_groq(
    system_prompt: str, 
    user_prompt: str, 
    json_mode: bool = False,
    temperature: float = 0.0, 
    max_tokens: int = 1024
) -> str:
    """
    Call the Groq API using the chat completions endpoint.
    This is the ONLY function in the codebase allowed to call the Groq API directly.
    """
    if not GROQ_API_KEY:
        raise LLMClientError("GROQ_API_KEY is not configured or missing.")
        
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
        
    try:
        response = requests.post(
            GROQ_CHAT_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=GROQ_TIMEOUT_SECONDS
        )
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        raise LLMClientError(f"Groq API request failed: {str(e)}")
        
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise LLMClientError(f"Unexpected response shape from Groq: {data}")
        
    return content
