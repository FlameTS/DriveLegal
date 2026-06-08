from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import json
from backend.config import GEMINI_API_KEY
from backend.rag.retriever import retrieve_relevant_laws
from backend.rag.prompt import SYSTEM_PROMPT

router = APIRouter()

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class ChatRequest(BaseModel):
    message: str
    state_code: str = "IN"
    vehicle_type: str = "all"
    language: str = "English" # Default if not auto-detected

class SourceInfo(BaseModel):
    section: str
    title: str
    description: str
    state_code: str

class ChatResponse(BaseModel):
    response: str
    detected_language: str
    sources: list[SourceInfo]

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    # 1. Retrieve matching laws
    laws = retrieve_relevant_laws(
        query=req.message,
        state_code=req.state_code,
        vehicle_type=req.vehicle_type,
        limit=4
    )
    
    # Format context for prompt
    context_parts = []
    sources = []
    for law in laws:
        state_info = f"State: {law['state_code']}" if law['state_code'] != 'IN' else "National Rule"
        context_parts.append(
            f"[{law['section']}] - {law['title']} ({state_info})\nDescription: {law['description']}"
        )
        sources.append(SourceInfo(
            section=law["section"],
            title=law["title"],
            description=law["description"],
            state_code=law["state_code"]
        ))
        
    context_str = "\n\n".join(context_parts)
    
    # 2. Build Chat prompt
    sys_prompt = SYSTEM_PROMPT.format(language=req.language, context=context_str)
    
    # We instruct Gemini to return JSON with 'response' and 'detected_language' key
    prompt = f"""
    User Query: {req.message}
    
    Please reply in JSON format with the following keys:
    1. "response": Your answer following the system prompt instructions.
    2. "detected_language": The language of the user query (e.g. English, Hindi, Marathi, Tamil, Telugu, Bengali).
    
    JSON:
    """
    
    detected_lang = req.language
    final_response_text = ""
    
    if not GEMINI_API_KEY:
        # Mock Response for local testing when API Key is missing
        mock_response = f"This is a local simulation of the RAG chatbot. You asked: '{req.message}'. " \
                        f"I retrieved {len(laws)} relevant documents. Below is the retrieved data:\n\n" + context_str
        return ChatResponse(
            response=mock_response,
            detected_language="English",
            sources=sources
        )
        
    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )
        
        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [sys_prompt + "\n\n" + prompt]}
            ]
        )
        
        try:
            res_json = json.loads(response.text)
            final_response_text = res_json.get("response", "")
            detected_lang = res_json.get("detected_language", req.language)
        except Exception as json_err:
            print(f"Error parsing JSON from Gemini: {json_err}. Raw response: {response.text}")
            # Fallback retry in case JSON failed
            final_response_text = response.text
            
        # Fallback check for correct language (Retry once if wrong language detected or returned)
        # For simplicity, if we asked for Hindi and response has no Hindi chars, we could retry.
        # But usually Gemini-1.5-Flash in JSON mode is highly reliable.
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        # Return fallback text with raw context
        final_response_text = f"Unable to process request with Gemini. Retrieved rule:\n{context_str}"
        
    return ChatResponse(
        response=final_response_text,
        detected_language=detected_lang,
        sources=sources
    )
