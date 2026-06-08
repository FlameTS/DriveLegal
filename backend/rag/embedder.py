import google.generativeai as genai
from backend.config import GEMINI_API_KEY
import json

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_embedding(text: str) -> list[float]:
    """
    Generates embedding for the text using Gemini API (models/text-embedding-004).
    If no API key is present or it fails, returns a dummy zero vector of size 768.
    """
    if not GEMINI_API_KEY:
        # Return a mock vector of size 768 for offline/local development testing
        return [0.0] * 768
    
    try:
        response = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        return response["embedding"]
    except Exception as e:
        print(f"Error generating embedding: {e}")
        # Return a fallback zero vector
        return [0.0] * 768

def chunk_law(law_dict: dict) -> str:
    """
    Converts a law database record (national law or state override) into a clean
    text chunk ready to be embedded.
    """
    section = law_dict.get("section", "General")
    title = law_dict.get("title", "Traffic Rule")
    description = law_dict.get("description", "")
    
    # State context (if applicable)
    state = law_dict.get("state_name") or law_dict.get("state_code")
    state_str = f" for {state}" if state and state != "IN" else " (National)"
    
    return f"Law Section: {section}\nTitle: {title}{state_str}\nDescription: {description}"
