from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.db import execute_query

router = APIRouter()

class ChallanItemRequest(BaseModel):
    code: str
    is_repeat: bool = False

class ChallanRequest(BaseModel):
    state_code: str
    violations: list[ChallanItemRequest]
    vehicle_type: str = "all"

class ItemizedFine(BaseModel):
    code: str
    name: str
    category: str
    is_repeat: bool
    fine_amount: int
    is_override: bool
    source_notes: str

class ChallanResponse(BaseModel):
    state_code: str
    items: list[ItemizedFine]
    total_fine: int

@router.get("/violations")
async def get_all_violations():
    """Returns the list of all standard violations for checklist generation."""
    query = "SELECT code, name, category, fine_first_national, fine_repeat_national FROM violations"
    violations, _ = execute_query(query, fetch=True)
    return violations

@router.post("/calculate", response_model=ChallanResponse)
async def calculate_challan(req: ChallanRequest):
    if not req.violations:
        return ChallanResponse(state_code=req.state_code, items=[], total_fine=0)
        
    # Get all national violations
    v_query = "SELECT code, name, category, fine_first_national, fine_repeat_national FROM violations"
    national_violations, _ = execute_query(v_query, fetch=True)
    violation_map = {v["code"]: v for v in national_violations}
    
    # Get overrides for the selected state
    o_query = "SELECT violation_code, fine_first_override, fine_repeat_override FROM state_fines WHERE state_code = %s"
    overrides, _ = execute_query(o_query, (req.state_code,), fetch=True)
    override_map = {o["violation_code"]: o for o in overrides}
    
    items = []
    total = 0
    
    for item in req.violations:
        violation = violation_map.get(item.code)
        if not violation:
            continue
            
        override = override_map.get(item.code)
        
        fine_amount = 0
        is_override = False
        notes = "National standard fine under Motor Vehicles Act."
        
        if item.is_repeat:
            # Check for repeat override
            if override and override.get("fine_repeat_override") is not None:
                fine_amount = override["fine_repeat_override"]
                is_override = True
                notes = f"State-specific fine override for {req.state_code} (Repeat Offence)."
            else:
                # Fallback to national repeat
                fine_amount = violation["fine_repeat_national"]
                if override:
                    notes = f"State overrides first offence, but repeat offence falls back to national rules."
        else:
            # Check for first override
            if override and override.get("fine_first_override") is not None:
                fine_amount = override["fine_first_override"]
                is_override = True
                notes = f"State-specific fine override for {req.state_code} (First Offence)."
            else:
                # Fallback to national first
                fine_amount = violation["fine_first_national"]
                
        items.append(ItemizedFine(
            code=item.code,
            name=violation["name"],
            category=violation["category"],
            is_repeat=item.is_repeat,
            fine_amount=fine_amount,
            is_override=is_override,
            source_notes=notes
        ))
        total += fine_amount
        
    return ChallanResponse(
        state_code=req.state_code,
        items=items,
        total_fine=total
    )
