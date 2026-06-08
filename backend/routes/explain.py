from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from backend.config import GEMINI_API_KEY
from backend.rag.prompt import EXPLAIN_PROMPT

router = APIRouter()

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class ExplainRequest(BaseModel):
    law_text: str
    section: str = ""
    language: str = "English"

class ExplainResponse(BaseModel):
    section: str
    original_text: str
    simplified_text: str
    disclaimer: str

@router.post("/explain", response_model=ExplainResponse)
async def explain_law_endpoint(req: ExplainRequest):
    if not req.law_text.strip():
        raise HTTPException(status_code=400, detail="Law text cannot be empty.")
        
    disclaimer = "Legal Disclaimer: This explanation is a simplified summary designed to help citizens understand the law in plain language. It does not constitute formal legal advice. For official legal proceedings, the original legal text of the Motor Vehicles Act or state rules remains the sole authoritative source."
    
    if not GEMINI_API_KEY:
        # Mock Explainer for local testing when API Key is missing
        mock_simplified = f"This is a local simplified version of Section '{req.section or 'General'}'. " \
                          f"The rule requires that you follow basic standards. Original content: {req.law_text[:100]}..."
        return ExplainResponse(
            section=req.section,
            original_text=req.law_text,
            simplified_text=mock_simplified,
            disclaimer=disclaimer
        )
        
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = EXPLAIN_PROMPT.format(language=req.language) + f"\n\nLegal Text to Simplify:\n{req.law_text}"
        
        response = model.generate_content(prompt)
        
        simplified_text = response.text.strip()
        
    except Exception as e:
        print(f"Error in Gemini Law Explainer: {e}")
        simplified_text = f"We encountered an issue generating the plain language explanation. Let's keep it simple: Make sure you carry proper certificates, keep speed limits in check, and wear appropriate safety gear."
        
    return ExplainResponse(
        section=req.section,
        original_text=req.law_text,
        simplified_text=simplified_text,
        disclaimer=disclaimer
    )
