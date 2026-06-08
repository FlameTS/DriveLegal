import numpy as np
import json
from backend.db import execute_query, get_connection
from backend.rag.embedder import get_embedding

def cosine_similarity(v1, v2):
    """Computes cosine similarity between two vectors."""
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return float(dot_product / (norm_v1 * norm_v2))

def retrieve_relevant_laws(query: str, state_code: str = "IN", vehicle_type: str = "all", limit: int = 5) -> list[dict]:
    """
    Retrieves the most semantically relevant laws using vector similarity.
    If database is PostgreSQL, uses raw SQL with pgvector operator <=>.
    If database is SQLite, loads records and performs similarity sorting in-memory.
    """
    query_vector = get_embedding(query)
    
    # Check database type
    _, db_type = get_connection()
    
    if db_type == "postgres":
        # Raw SQL query using pgvector <=> operator (cosine distance)
        # Cosine distance = 1 - Cosine Similarity.
        # Smaller distance means higher similarity.
        sql = """
            SELECT 
                l.id, 
                l.section, 
                l.title, 
                COALESCE(so.description, l.description) as description, 
                l.category, 
                l.vehicle_type,
                COALESCE(so.state_code, 'IN') as state_code,
                (l.embedding <=> %s) AS distance
            FROM laws l
            LEFT JOIN state_overrides so ON l.id = so.law_id AND so.state_code = %s
            WHERE l.vehicle_type = %s OR l.vehicle_type = 'all'
            ORDER BY distance ASC
            LIMIT %s;
        """
        results, _ = execute_query(sql, (query_vector, state_code, vehicle_type, limit), fetch=True)
        return results
    else:
        # SQLite Fallback: Fetch candidate laws & overrides, and calculate cosine similarity in Python
        # Fetch laws and overrides
        laws_sql = "SELECT id, section, title, description, category, vehicle_type, embedding FROM laws"
        overrides_sql = "SELECT law_id, state_code, description, embedding FROM state_overrides WHERE state_code = ?"
        
        laws, _ = execute_query(laws_sql, fetch=True)
        overrides, _ = execute_query(overrides_sql, (state_code,), fetch=True)
        
        override_map = {o["law_id"]: o for o in overrides}
        
        processed_laws = []
        for law in laws:
            # Filter vehicle type
            if law["vehicle_type"] != "all" and vehicle_type != "all" and law["vehicle_type"] != vehicle_type:
                continue
                
            # Check for override
            override = override_map.get(law["id"])
            desc = override["description"] if override else law["description"]
            st_code = state_code if override else "IN"
            
            # Retrieve embedding (fallback if empty/null)
            emb = None
            if override and override.get("embedding"):
                emb = override["embedding"]
            elif law.get("embedding"):
                emb = law["embedding"]
                
            if emb:
                if isinstance(emb, str):
                    try:
                        emb = json.loads(emb)
                    except:
                        emb = None
                        
            # If embedding is valid, calculate similarity
            similarity = 0.0
            if emb and len(emb) == 768:
                similarity = cosine_similarity(query_vector, emb)
            
            processed_laws.append({
                "id": law["id"],
                "section": law["section"],
                "title": law["title"],
                "description": desc,
                "category": law["category"],
                "vehicle_type": law["vehicle_type"],
                "state_code": st_code,
                "similarity": similarity,
                # Convert to distance for uniform return schema (distance = 1 - similarity)
                "distance": 1.0 - similarity
            })
            
        # Sort by distance ASC (similarity DESC)
        processed_laws.sort(key=lambda x: x["distance"])
        return processed_laws[:limit]
