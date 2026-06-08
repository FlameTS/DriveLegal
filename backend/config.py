import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend or root directory
root_dir = Path(__file__).resolve().parent.parent
dotenv_path = root_dir / ".env"
load_dotenv(dotenv_path)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "") # E.g., postgresql://user:password@host/db
SQLITE_DB_PATH = os.environ.get("SQLITE_DB_PATH", str(root_dir / "database" / "drivelegal.db"))

# Create database folder if it doesn't exist
os.makedirs(os.path.dirname(SQLITE_DB_PATH), exist_ok=True)
