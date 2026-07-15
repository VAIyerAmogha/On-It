import pdfplumber
import requests
from typing import Optional
from docx import Document as DocxDocument

from config import (
    OCR_MIN_CHARS_PER_PAGE,
    OCR_SPACE_FREE_ENDPOINT,
    OCR_TIMEOUT_SECONDS,
    OCR_SPACE_API_KEY,
    SECTION_BOUNDARY_KEYWORDS
)

class IngestionError(Exception):
    """Exception raised for errors during the ingestion process."""
    pass

def is_native_pdf(path: str) -> bool:
    """
    Open with pdfplumber, sample the first up to 5 pages.
    Compute average extracted characters per page.
    Return True if average > config.OCR_MIN_CHARS_PER_PAGE (100), else False.
    Any pdfplumber exception should be caught and treated as False (not native).
    """
    try:
        with pdfplumber.open(path) as pdf:
            pages_to_sample = pdf.pages[:5]
            if not pages_to_sample:
                return False
            
            total_chars = 0
            for page in pages_to_sample:
                text = page.extract_text()
                if text:
                    total_chars += len(text)
            
            avg_chars = total_chars / len(pages_to_sample)
            return avg_chars > OCR_MIN_CHARS_PER_PAGE
    except Exception:
        return False

def extract_native_pdf(path: str) -> str:
    """
    Open with pdfplumber, extract_text() per page, join with '\\n\\n'.
    Strip result; if empty, raise IngestionError.
    """
    try:
        with pdfplumber.open(path) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            
            result = "\n\n".join(pages_text).strip()
            if not result:
                raise IngestionError(f"No text could be extracted from {path}")
            
            return result
    except IngestionError:
        raise
    except Exception as e:
        raise IngestionError(f"Failed to extract text from {path}: {str(e)}")

def extract_scanned_pdf(path: str, api_key: Optional[str] = None) -> str:
    """
    Send the PDF file directly to OCR.space API for text extraction.
    Raise IngestionError on failure or empty results.
    """
    key_to_use = api_key or OCR_SPACE_API_KEY
    if not key_to_use:
        raise IngestionError("No OCR.space API key provided or configured.")

    try:
        with open(path, "rb") as f:
            response = requests.post(
                OCR_SPACE_FREE_ENDPOINT,
                files={"file": f},
                data={
                    "apikey": key_to_use,
                    "OCREngine": "2",
                    "isTable": "true",
                    "scale": "true"
                },
                timeout=OCR_TIMEOUT_SECONDS
            )
        response.raise_for_status()
        result_json = response.json()
    except Exception as e:
        raise IngestionError(f"OCR.space request failed for {path}: {str(e)}")
    
    if result_json.get("IsErroredOnProcessing"):
        error_msg = result_json.get("ErrorMessage", "Unknown processing error")
        raise IngestionError(f"OCR.space processing error for {path}: {error_msg}")
    
    parsed_results = result_json.get("ParsedResults")
    if not parsed_results:
        raise IngestionError(f"OCR.space returned no ParsedResults for {path}")
    
    pages_text = []
    for pr in parsed_results:
        text = pr.get("ParsedText")
        if text:
            pages_text.append(text)
    
    final_text = "\n\n".join(pages_text).strip()
    if not final_text:
        raise IngestionError(f"No text extracted by OCR.space for {path}")
        
    return final_text

def extract_docx(path: str) -> tuple[str, list[dict]]:
    """
    Open with python-docx. Extract text skipping empty paragraphs.
    Collect heading signals for "Heading 1" and "Heading 2".
    Return (full_text, heading_signals).
    Raise IngestionError on empty text or file open failure.
    """
    try:
        doc = DocxDocument(path)
    except Exception as e:
        raise IngestionError(f"Failed to open DOCX file {path}: {str(e)}")
    
    paragraphs_text = []
    heading_signals = []
    
    for i, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        if not text:
            continue
            
        paragraphs_text.append(text)
        
        style_name = para.style.name if para.style else ""
        if style_name in ("Heading 1", "Heading 2"):
            level = 1 if style_name == "Heading 1" else 2
            heading_signals.append({
                "text": text,
                "level": level,
                "para_index": i
            })
            
    full_text = "\n".join(paragraphs_text)
    if not full_text:
        raise IngestionError(f"No text could be extracted from DOCX file {path}")
        
    return full_text, heading_signals

def split_sections(full_text: str, heading_signals: Optional[list[dict]] = None) -> list[dict]:
    """
    Split text into chunks based on boundary lines.
    A boundary is a line <= 80 chars containing a keyword, or matching a heading signal.
    Returns a list of section dictionaries.
    """
    lines = full_text.split("\n")
    boundary_indices = set()
    
    heading_texts = set()
    if heading_signals:
        for hs in heading_signals:
            if "text" in hs:
                heading_texts.add(hs["text"].strip().lower())
                
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
            
        lower_stripped = stripped.lower()
        is_boundary = False
        
        if len(stripped) <= 80:
            for kw in SECTION_BOUNDARY_KEYWORDS:
                if kw in lower_stripped:
                    is_boundary = True
                    break
                    
        if not is_boundary and lower_stripped in heading_texts:
            is_boundary = True
            
        if is_boundary:
            boundary_indices.add(i)
            
    sorted_boundaries = sorted(list(boundary_indices))
    
    if not sorted_boundaries:
        return [{
            "section_ref": "S1",
            "section_title": "Full Contract",
            "chunk_text": full_text.strip()
        }]
        
    sections = []
    num_lines = len(lines)
    
    for idx, b_index in enumerate(sorted_boundaries):
        start_line = b_index
        end_line = sorted_boundaries[idx + 1] if idx + 1 < len(sorted_boundaries) else num_lines
        
        chunk_lines = lines[start_line:end_line]
        chunk_text = "\n".join(chunk_lines).strip()
        
        if chunk_text:
            sections.append({
                "section_ref": f"S{idx + 1}",
                "section_title": lines[b_index].strip(),
                "chunk_text": chunk_text
            })
            
    return sections

def ingest_file(path: str, filename: str) -> tuple[str, list[dict]]:
    """
    Determine file type from filename, extract text using the appropriate
    method, and split it into sections.
    Returns (full_text, sections).
    """
    filename_lower = filename.lower()
    full_text = ""
    heading_signals = None
    
    if filename_lower.endswith(".docx"):
        full_text, heading_signals = extract_docx(path)
    elif filename_lower.endswith(".pdf"):
        if is_native_pdf(path):
            full_text = extract_native_pdf(path)
        else:
            full_text = extract_scanned_pdf(path)
    else:
        raise IngestionError(f"Unsupported file extension for {filename}")
        
    sections = split_sections(full_text, heading_signals)
    return full_text, sections
