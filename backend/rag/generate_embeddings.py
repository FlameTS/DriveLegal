"""
Embedding Generation Script for DriveLegal

Fetches all laws and state_overrides from the database,
generates embeddings using the Gemini API (text-embedding-004),
and stores them back in the embedding column.

Usage:
    python -m backend.rag.generate_embeddings

Supports both PostgreSQL (native pgvector) and SQLite (JSON text).
"""
import time
import json
import sys
import os

# Ensure the project root is on the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.db import get_connection
from backend.rag.embedder import get_embedding, chunk_law
from backend.config import GEMINI_API_KEY


def generate_law_embeddings():
    """Generate and store embeddings for all rows in the `laws` table."""
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY is not set. Cannot generate real embeddings.")
        print("Set it in your .env file and try again.")
        return

    conn, db_type = get_connection()
    try:
        cur = conn.cursor()

        # Fetch all laws
        if db_type == "postgres":
            cur.execute("SELECT id, section, title, description, category, vehicle_type FROM laws")
            laws = [dict(row) for row in cur.fetchall()] if db_type != "postgres" else None
            # For postgres with RealDictCursor we need to re-fetch
            from psycopg2.extras import RealDictCursor
            cur.close()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT id, section, title, description, category, vehicle_type FROM laws")
            laws = [dict(row) for row in cur.fetchall()]
        else:
            cur.execute("SELECT id, section, title, description, category, vehicle_type FROM laws")
            laws = [dict(row) for row in cur.fetchall()]

        print(f"\n📚 Found {len(laws)} laws to embed.\n")

        for i, law in enumerate(laws):
            # Build the text chunk
            text = chunk_law(law)
            print(f"  [{i+1}/{len(laws)}] Embedding: {law['section']} — {law['title'][:50]}...")

            # Generate embedding
            embedding = get_embedding(text)

            # Store it back
            if db_type == "postgres":
                cur.execute(
                    "UPDATE laws SET embedding = %s WHERE id = %s",
                    (str(embedding), law["id"])
                )
            else:
                cur.execute(
                    "UPDATE laws SET embedding = ? WHERE id = ?",
                    (json.dumps(embedding), law["id"])
                )

            # Rate limit: Gemini free tier allows ~1500 req/day, ~15/min for embeddings
            time.sleep(0.5)

        conn.commit()
        print(f"\n✅ Successfully embedded {len(laws)} laws.\n")
    except Exception as e:
        print(f"❌ Error generating law embeddings: {e}")
        conn.rollback()
    finally:
        conn.close()


def generate_override_embeddings():
    """Generate and store embeddings for all rows in the `state_overrides` table."""
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY is not set.")
        return

    conn, db_type = get_connection()
    try:
        cur = conn.cursor()

        if db_type == "postgres":
            from psycopg2.extras import RealDictCursor
            cur.close()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT so.id, so.state_code, so.description, so.override_type,
                       l.section, l.title
                FROM state_overrides so
                JOIN laws l ON so.law_id = l.id
            """)
            overrides = [dict(row) for row in cur.fetchall()]
        else:
            cur.execute("""
                SELECT so.id, so.state_code, so.description, so.override_type,
                       l.section, l.title
                FROM state_overrides so
                JOIN laws l ON so.law_id = l.id
            """)
            overrides = [dict(row) for row in cur.fetchall()]

        print(f"\n🏛️  Found {len(overrides)} state overrides to embed.\n")

        for i, override in enumerate(overrides):
            text = chunk_law({
                "section": override["section"],
                "title": override["title"],
                "description": override["description"],
                "state_code": override["state_code"]
            })
            print(f"  [{i+1}/{len(overrides)}] Embedding override: {override['section']} ({override['state_code']})...")

            embedding = get_embedding(text)

            if db_type == "postgres":
                cur.execute(
                    "UPDATE state_overrides SET embedding = %s WHERE id = %s",
                    (str(embedding), override["id"])
                )
            else:
                cur.execute(
                    "UPDATE state_overrides SET embedding = ? WHERE id = ?",
                    (json.dumps(embedding), override["id"])
                )

            time.sleep(0.5)

        conn.commit()
        print(f"\n✅ Successfully embedded {len(overrides)} state overrides.\n")
    except Exception as e:
        print(f"❌ Error generating override embeddings: {e}")
        conn.rollback()
    finally:
        conn.close()


def main():
    print("=" * 60)
    print("  DriveLegal — Embedding Generation Script")
    print("=" * 60)

    _, db_type = get_connection()
    print(f"\n🔗 Connected to: {'PostgreSQL (Supabase)' if db_type == 'postgres' else 'SQLite (Local Dev)'}")

    generate_law_embeddings()
    generate_override_embeddings()

    print("=" * 60)
    print("  Done! RAG chatbot is now ready for semantic search.")
    print("=" * 60)


if __name__ == "__main__":
    main()
