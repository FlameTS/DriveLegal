from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.db import execute_query

router = APIRouter()

class StateRulesRequest(BaseModel):
    state_code: str
    vehicle_type: str = "all" # motorcycle, car, heavy, all

class RuleItem(BaseModel):
    id: int
    section: str
    title: str
    category: str
    vehicle_type: str
    rule_type: str # 'national', 'modify', 'add', 'exempt'
    description: str
    state_code: str

class StateRulesResponse(BaseModel):
    state_code: str
    vehicle_type: str
    rules: list[RuleItem]

@router.post("/rules", response_model=StateRulesResponse)
async def get_state_rules(req: StateRulesRequest):
    # Fetch all states to validate code
    states, _ = execute_query("SELECT code FROM states", fetch=True)
    state_codes = [s["code"] for s in states]
    
    if req.state_code not in state_codes:
        raise HTTPException(status_code=400, detail="Invalid state code")
        
    # SQL query to merge national rules with state-specific overrides
    # If state_code is 'IN', it returns only national laws without overrides.
    if req.state_code == "IN":
        query = """
            SELECT 
                l.id,
                l.section,
                l.title,
                l.category,
                l.vehicle_type,
                'national' as rule_type,
                l.description,
                'IN' as state_code
            FROM laws l
            WHERE l.vehicle_type = %s OR l.vehicle_type = 'all';
        """
        params = (req.vehicle_type,)
    else:
        query = """
            SELECT 
                l.id,
                l.section,
                l.title,
                l.category,
                l.vehicle_type,
                COALESCE(so.override_type, 'national') as rule_type,
                COALESCE(so.description, l.description) as description,
                COALESCE(so.state_code, 'IN') as state_code
            FROM laws l
            LEFT JOIN state_overrides so ON l.id = so.law_id AND so.state_code = %s
            WHERE (l.vehicle_type = %s OR l.vehicle_type = 'all')
              AND COALESCE(so.override_type, '') != 'exempt';
        """
        params = (req.state_code, req.vehicle_type)
        
    rules, _ = execute_query(query, params, fetch=True)
    
    output = []
    for r in rules:
        output.append(RuleItem(
            id=r["id"],
            section=r["section"],
            title=r["title"],
            category=r["category"],
            vehicle_type=r["vehicle_type"],
            rule_type=r["rule_type"],
            description=r["description"],
            state_code=r["state_code"]
        ))
        
    return StateRulesResponse(
        state_code=req.state_code,
        vehicle_type=req.vehicle_type,
        rules=output
    )
