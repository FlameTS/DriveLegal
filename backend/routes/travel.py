from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.db import execute_query

router = APIRouter()

CITY_TO_STATE = {
    "bhopal": "MP", "indore": "MP", "gwalior": "MP",
    "delhi": "DL", "new delhi": "DL",
    "mumbai": "MH", "pune": "MH", "nagpur": "MH",
    "chennai": "TN", "coimbatore": "TN", "madurai": "TN",
    "lucknow": "UP", "kanpur": "UP", "noida": "UP", "ghaziabad": "UP", "agra": "UP",
    "bangalore": "KA", "bengaluru": "KA", "mysore": "KA", "mysuru": "KA"
}

STATE_TRANSIT = {
    ("MP", "DL"): ["MP", "UP", "DL"],
    ("DL", "MP"): ["DL", "UP", "MP"],
    ("MP", "MH"): ["MP", "MH"],
    ("MH", "MP"): ["MH", "MP"],
    ("MH", "KA"): ["MH", "KA"],
    ("KA", "MH"): ["KA", "MH"],
    ("KA", "TN"): ["KA", "TN"],
    ("TN", "KA"): ["TN", "KA"],
    ("MP", "TN"): ["MP", "MH", "KA", "TN"],
    ("TN", "MP"): ["TN", "KA", "MH", "MP"],
    ("DL", "MH"): ["DL", "UP", "MP", "MH"],
    ("MH", "DL"): ["MH", "MP", "UP", "DL"],
    ("DL", "KA"): ["DL", "UP", "MP", "MH", "KA"],
    ("KA", "DL"): ["KA", "MH", "MP", "UP", "DL"],
    ("DL", "TN"): ["DL", "UP", "MP", "MH", "KA", "TN"],
    ("TN", "DL"): ["TN", "KA", "MH", "MP", "UP", "DL"],
}

class TravelRequest(BaseModel):
    from_city: str
    to_city: str
    vehicle_type: str # motorcycle, car

class ConflictItem(BaseModel):
    type: str # 'speed', 'helmet', 'tax', 'other'
    message: str
    severity: str # 'high', 'medium', 'info'

class TravelChecklistResponse(BaseModel):
    from_city: str
    to_city: str
    states_crossed: list[str]
    documents_required: list[str]
    speed_limits: dict[str, int] # state -> limit
    rules_by_state: dict[str, list[str]]
    conflicts: list[ConflictItem]

@router.post("/check", response_model=TravelChecklistResponse)
async def check_travel_route(req: TravelRequest):
    c_from = req.from_city.strip().lower()
    c_to = req.to_city.strip().lower()
    
    st_from = CITY_TO_STATE.get(c_from)
    st_to = CITY_TO_STATE.get(c_to)
    
    if not st_from:
        raise HTTPException(status_code=400, detail=f"Source city '{req.from_city}' is not in our database. Major cities: Bhopal, Delhi, Mumbai, Chennai, Lucknow, Bangalore.")
    if not st_to:
        raise HTTPException(status_code=400, detail=f"Destination city '{req.to_city}' is not in our database.")
        
    # Determine states crossed
    states = STATE_TRANSIT.get((st_from, st_to))
    if not states:
        if st_from == st_to:
            states = [st_from]
        else:
            states = [st_from, st_to]
            
    # Fetch rules for each state crossed
    documents_set = set()
    speed_limits = {}
    rules_by_state = {}
    
    # We will fetch travel_checklists from database
    states_placeholders = ", ".join(["%s"] * len(states))
    query = f"""
        SELECT state_code, vehicle_type, documents_required, speed_limit, special_rules
        FROM travel_checklists
        WHERE state_code IN ({states_placeholders}) AND vehicle_type = %s
    """
    params = list(states) + [req.vehicle_type]
    results, _ = execute_query(query, params, fetch=True)
    
    # Map results
    db_results = {r["state_code"]: r for r in results}
    
    for state in states:
        r = db_results.get(state)
        if r:
            # Add documents
            docs = r["documents_required"]
            if isinstance(docs, list):
                for doc in docs:
                    documents_set.add(doc)
            # Add speed limit
            speed_limits[state] = r["speed_limit"]
            # Add rules
            rules_by_state[state] = r["special_rules"]
        else:
            # Fallback if state metadata missing in DB
            speed_limits[state] = 80 if req.vehicle_type == "car" else 60
            rules_by_state[state] = ["Carry standard documents.", "Follow local traffic rules."]
            
    # Compile Conflicts
    conflicts = []
    
    # 1. Speed limit conflict
    if speed_limits:
        min_limit = min(speed_limits.values())
        max_limit = max(speed_limits.values())
        if min_limit != max_limit:
            conflicting_states = [f"{st}: {limit} km/h" for st, limit in speed_limits.items()]
            conflicts.append(ConflictItem(
                type="speed",
                message=f"Speed limits vary along your route ({', '.join(conflicting_states)}). Maintain a maximum speed of {min_limit} km/h to stay safe across all states.",
                severity="high"
            ))
            
    # 2. Helmet rule conflict
    if req.vehicle_type == "motorcycle":
        has_mp = "MP" in states
        has_double_helmet_state = any(s in states for s in ["MH", "KA", "TN"])
        if has_mp and has_double_helmet_state:
            conflicts.append(ConflictItem(
                type="helmet",
                message="Helmet regulations conflict! Madhya Pradesh allows helmet exemptions for female pillion riders. However, Maharashtra/Karnataka/Tamil Nadu strictly mandate double helmets (rider + pillion). You must wear helmets for both occupants for this trip.",
                severity="high"
            ))
            
    # 3. Tax / out of state vehicle rule
    if "KA" in states and st_from != "KA":
        conflicts.append(ConflictItem(
            type="tax",
            message="Karnataka enforces strict road tax rules. Out-of-state vehicles running in Karnataka for more than 30 days must pay lifetime tax. If staying temporarily, keep toll receipts and fuel bills as proof of entry date.",
            severity="medium"
        ))
        
    # 4. Odd-Even pollution restrictions
    if "DL" in states:
        conflicts.append(ConflictItem(
            type="pollution",
            message="Delhi NCT enforces Odd-Even rules and restriction on older diesel/petrol vehicles during high pollution seasons. Check current environmental notifications before driving into Delhi.",
            severity="medium"
        ))
        
    return TravelChecklistResponse(
        from_city=req.from_city,
        to_city=req.to_city,
        states_crossed=states,
        documents_required=sorted(list(documents_set)) if documents_set else ["Driving License", "Registration Certificate (RC)", "PUC Certificate", "Insurance Policy"],
        speed_limits=speed_limits,
        rules_by_state=rules_by_state,
        conflicts=conflicts
    )
