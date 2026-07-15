import time
import requests
import logging
from datetime import datetime, timezone
from bson import ObjectId
import json
import config

from helpers.llm_client import call_groq
from helpers.progress_context import build_progress_summary

class RagError(Exception):
    pass

def embed_text(text: str) -> list[float]:
    if not config.HF_API_TOKEN:
        raise RagError("HF_API_TOKEN is not set")
    
    text = text[:2000]
    
    headers = {
        "Authorization": f"Bearer {config.HF_API_TOKEN}"
    }
    payload = {
        "inputs": text
    }
    
    for attempt in range(2):
        try:
            response = requests.post(
                config.HF_INFERENCE_ENDPOINT,
                headers=headers,
                json=payload,
                timeout=30
            )
        except requests.RequestException as e:
            raise RagError(f"Request failed: {e}")
            
        if response.status_code != 200:
            try:
                error_data = response.json()
            except ValueError:
                error_data = {}
                
            if "error" in error_data and "loading" in str(error_data["error"]).lower() and attempt == 0:
                time.sleep(5)
                continue
                
            raise RagError(f"API request failed with status {response.status_code}: {response.text}")
            
        try:
            data = response.json()
        except ValueError:
            raise RagError("Invalid JSON response")
            
        if isinstance(data, dict) and "error" in data:
            if "loading" in str(data["error"]).lower() and attempt == 0:
                time.sleep(5)
                continue
            raise RagError(f"API error: {data['error']}")
        
        break
        
    if not isinstance(data, list):
        raise RagError("Response is not a list")
        
    if len(data) > 0 and isinstance(data[0], list):
        if len(data[0]) > 0 and isinstance(data[0][0], list):
            embeddings = data[0]
        else:
            embeddings = data
            
        seq_len = len(embeddings)
        if seq_len == 0:
            raise RagError("Empty sequence in nested list")
            
        dim = len(embeddings[0])
        if dim != 384:
            raise RagError(f"Expected 384 dimensions, got {dim}")
            
        mean_pooled = [0.0] * dim
        for token_emb in embeddings:
            if not isinstance(token_emb, list) or len(token_emb) != dim:
                raise RagError("Inconsistent dimension in nested list response")
            for i in range(dim):
                mean_pooled[i] += token_emb[i]
                
        return [val / seq_len for val in mean_pooled]
        
    else:
        if len(data) != 384:
            raise RagError(f"Expected 384 dimensions, got {len(data)}")
            
        for val in data:
            if not isinstance(val, (int, float)):
                raise RagError("Response elements are not floats")
                
        return [float(x) for x in data]

def index_contract(db, contract_id: str, freelancer_id: str, sections: list[dict]) -> int:
    success_count = 0
    total_sections = len(sections)
    
    for section in sections:
        try:
            embedding = embed_text(section["chunk_text"])
            
            doc = {
                "contract_id": contract_id,
                "freelancer_id": freelancer_id,
                "section_ref": section.get("section_ref"),
                "section_title": section.get("section_title"),
                "chunk_text": section.get("chunk_text"),
                "embedding": embedding,
                "indexed_at": datetime.now(timezone.utc)
            }
            
            db.contract_chunks.update_one(
                {"contract_id": contract_id, "section_ref": section.get("section_ref")},
                {"$set": doc},
                upsert=True
            )
            success_count += 1
            
        except Exception as e:
            logging.error(f"Failed to index section {section.get('section_ref')} for contract {contract_id}: {e}")
            
    if total_sections > 0 and success_count == 0:
        raise RagError(f"Failed to index all {total_sections} sections for contract {contract_id}")
        
    db.contracts.update_one(
        {"_id": ObjectId(contract_id)},
        {"$set": {"indexed_for_rag": True}}
    )
    
    return success_count

def retrieve_top_k(db, contract_id: str, freelancer_id: str, question: str) -> list[dict]:
    contract = db.contracts.find_one({
        "_id": ObjectId(contract_id),
        "freelancer_id": freelancer_id
    })
    
    if not contract or not contract.get("indexed_for_rag"):
        raise RagError("Contract is not indexed for RAG")
        
    question_vector = embed_text(question)
    
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": question_vector,
                "numCandidates": 100,
                "limit": config.RAG_TOP_K,
                "filter": {"freelancer_id": freelancer_id, "contract_id": contract_id}
            }
        },
        {
            "$project": {
                "embedding": 0,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]
    
    return list(db.contract_chunks.aggregate(pipeline))

def generate_answer(question: str, retrieved_sections: list[dict], progress_summary: dict = None) -> dict:
    system_prompt = (
        "You are a strict legal contract assistant helping the freelancer (who is the user of this application). "
        "The freelancer receives contracts from their clients, completes deliverables, invoices them, and gets paid. "
        "Your job is to answer the freelancer's questions in a detailed, thorough, and comprehensive manner, "
        "explaining clauses, timelines, or status context fully, ONLY using the provided contract sections and the current contract status summary. "
        "Provide detailed, structured breakdowns when discussing schedules, rates, or obligations, "
        "while remaining strictly grounded in the provided sources. "
        "Speak directly to the freelancer (e.g. refer to their client or their deliverables from their perspective). "
        "You must cite the `section_ref` of any contract sections you use. "
        "You can answer from either source. Say which kind of source you are answering from only if it's ambiguous. "
        "If the provided sources do not contain enough information to "
        "answer the question, you MUST explicitly refuse by saying exactly: "
        "\"I don't have enough information in this contract to answer that.\" "
        "Never use outside knowledge or make assumptions about typical contracts. "
        "Do not guess milestone amounts or invent statuses. "
        "Respond in JSON format with keys: 'answer' (string), 'cited_sections' (list of strings), and 'refused' (boolean)."
    )
    
    sections_text = "\n\n".join(
        f"--- Section {s.get('section_ref')} ({s.get('section_title')}) ---\n{s.get('chunk_text')}"
        for s in retrieved_sections
    )
    
    user_prompt = f"Contract Sections:\n{sections_text}\n\n"
    if progress_summary:
        user_prompt += f"CURRENT CONTRACT STATUS (system-verified, not contract text):\n{json.dumps(progress_summary, indent=2)}\n\n"
        
    user_prompt += f"Question: {question}"
    
    try:
        response_str = call_groq(system_prompt, user_prompt, json_mode=True)
        response = json.loads(response_str)
        return {
            "answer": response.get("answer", ""),
            "cited_sections": response.get("cited_sections", []),
            "refused": response.get("refused", False)
        }
    except Exception as e:
        logging.error(f"Failed to generate QA answer: {e}")
        return {
            "answer": "I don't have enough information in this contract to answer that.",
            "cited_sections": [],
            "refused": True
        }

def score_faithfulness(cited_text: str, answer: str, progress_summary: dict = None) -> float:
    system_prompt = (
        "You are an impartial judge. Your task is to evaluate the faithfulness of a generated answer "
        "based strictly on the provided source text. You must score how well the answer is entailed "
        "(supported) by the source text on a scale from 0.0 to 1.0, where 1.0 means fully supported "
        "and 0.0 means contradicted or entirely unsupported/hallucinated. "
        "Respond in JSON format with a single key 'score' containing the float value."
    )
    
    source_text = cited_text
    if progress_summary:
        source_text += f"\n\nCURRENT CONTRACT STATUS (system-verified, not contract text):\n{json.dumps(progress_summary, indent=2)}"
        
    user_prompt = f"Source Text:\n{source_text}\n\nGenerated Answer:\n{answer}"
    
    try:
        response_str = call_groq(system_prompt, user_prompt, json_mode=True)
        response = json.loads(response_str)
        score = response.get("score")
        
        if score is None:
            return 0.0
            
        score = float(score)
        return max(0.0, min(1.0, score))
    except Exception as e:
        logging.error(f"Failed to score faithfulness: {e}")
        return 0.0

def ask_contract(db, contract_id: str, freelancer_id: str, question: str) -> dict:
    sections = retrieve_top_k(db, contract_id, freelancer_id, question)
    progress_summary = build_progress_summary(contract_id, freelancer_id)
    
    if not sections and not progress_summary:
        return {
            "answer": "I don't have enough information in this contract to answer that.",
            "cited_sections": [],
            "faithfulness_score": None
        }
        
    result = generate_answer(question, sections, progress_summary)
    
    if result.get("refused"):
        result["faithfulness_score"] = None
        return result
        
    cited_sections = set(result.get("cited_sections", []))
    
    if not cited_sections:
        cited_text = "\n\n".join(s.get("chunk_text", "") for s in sections)
    else:
        cited_text = "\n\n".join(
            s.get("chunk_text", "") for s in sections if s.get("section_ref") in cited_sections
        )
        
    faithfulness = score_faithfulness(cited_text, result.get("answer", ""), progress_summary)
    
    if faithfulness < config.NLI_FAITHFULNESS_THRESHOLD:
        return {
            "answer": "I couldn't find a reliable answer to this in your contract \u2014 please review the document directly.",
            "cited_sections": [],
            "faithfulness_score": faithfulness
        }
        
    return {
        "answer": result.get("answer", ""),
        "cited_sections": result.get("cited_sections", []),
        "faithfulness_score": faithfulness
    }

