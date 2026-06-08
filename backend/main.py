from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.db import init_db
from backend.routes import chat, states, challan, travel, explain

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize and seed database on startup
    print("Initializing Database...")
    init_db()
    yield
    print("Shutting down...")

app = FastAPI(
    title="DriveLegal API",
    description="Backend services for DriveLegal - Traffic Law AI, state rules, and travel checklists",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration to allow local React app connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all. In production, lock this down.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat.router, prefix="/api", tags=["Chatbot"])
app.include_router(states.router, prefix="/api", tags=["State Rules"])
app.include_router(challan.router, prefix="/api", tags=["Challan Calculator"])
app.include_router(travel.router, prefix="/api", tags=["Travel Checker"])
app.include_router(explain.router, prefix="/api", tags=["Law Explainer"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
