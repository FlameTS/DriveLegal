import sqlite3
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import re
from backend.config import DATABASE_URL, SQLITE_DB_PATH

def get_connection():
    """
    Returns a connection object.
    If DATABASE_URL is set, connects to PostgreSQL.
    Otherwise, connects to SQLite.
    """
    if DATABASE_URL:
        # PostgreSQL
        conn = psycopg2.connect(DATABASE_URL)
        return conn, "postgres"
    else:
        # SQLite
        conn = sqlite3.connect(SQLITE_DB_PATH)
        # Enable row factory for dictionary-like access
        conn.row_factory = sqlite3.Row
        return conn, "sqlite"

def execute_query(query, params=None, fetch=True):
    """
    Utility function to run queries and handle conversion between DB types.
    """
    conn, db_type = get_connection()
    try:
        if db_type == "postgres":
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params or ())
                if fetch:
                    res = cur.fetchall()
                    # Convert psycopg2 dict cursor results to standard dict list
                    return [dict(r) for r in res], db_type
                conn.commit()
                return None, db_type
        else:
            # SQLite conversion
            # Convert %s placeholders to ? placeholders
            # (In raw SQL queries we write %s or :params)
            # To keep it simple, we'll write standard parameterized SQL or convert it.
            # Let's standardize on named parameters or %s.
            sqlite_query = query.replace("%s", "?")
            # If using named parameters like :param, sqlite3 supports it natively.
            
            cur = conn.cursor()
            cur.execute(sqlite_query, params or ())
            if fetch:
                res = cur.fetchall()
                # Convert SQLite Rows to list of dicts
                output = []
                for row in res:
                    d = dict(row)
                    # If there's an embedding or array type stored as text/json in SQLite, unpack it
                    for k, v in d.items():
                        if k == "documents_required" or k == "special_rules":
                            if isinstance(v, str):
                                try:
                                    d[k] = json.loads(v)
                                except:
                                    # Fallback if it's comma separated or Postgres array format e.g. {a,b}
                                    if v.startswith('{') and v.endswith('}'):
                                        d[k] = [x.strip().strip('"') for x in v[1:-1].split(',')]
                                    else:
                                        d[k] = [v]
                        elif k == "embedding" and isinstance(v, str):
                            try:
                                d[k] = json.loads(v)
                            except:
                                pass
                    output.append(d)
                return output, db_type
            conn.commit()
            return None, db_type
    finally:
        conn.close()

def init_db():
    """
    Creates tables and seeds initial data.
    """
    conn, db_type = get_connection()
    try:
        # Read schema and seed files
        import os
        schema_path = os.path.join("database", "schema.sql")
        seed_path = os.path.join("database", "seed.sql")
        
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_sql = f.read()
            
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_sql = f.read()

        if db_type == "postgres":
            cur = conn.cursor()
            # Run schema
            cur.execute(schema_sql)
            conn.commit()
            # Run seed
            cur.execute(seed_sql)
            conn.commit()
            print("PostgreSQL Database initialized and seeded successfully.")
        else:
            # SQLite setup
            # Clean postgres-specific syntax
            # 1. Remove vector extension enable
            schema_sql = schema_sql.replace("CREATE EXTENSION IF NOT EXISTS vector;", "")
            # 2. Convert vector(768) to TEXT
            schema_sql = re.sub(r"vector\(\d+\)", "TEXT", schema_sql)
            # 3. Convert TEXT[] to TEXT
            schema_sql = schema_sql.replace("TEXT[]", "TEXT")
            # 4. Remove ON DELETE CASCADE if needed or leave it (sqlite supports it)
            
            cur = conn.cursor()
            # SQLite executescript can run multiple statements
            cur.executescript(schema_sql)
            conn.commit()
            
            # For seed_sql, SQLite doesn't support ARRAY['a', 'b'] syntax.
            # We must convert ARRAY['item1', 'item2'] to '["item1", "item2"]' (JSON format)
            # Let's do a regex replacement for ARRAY[...]
            def array_replacer(match):
                items_str = match.group(1)
                # Split by comma and strip quotes
                items = [item.strip().strip("'").strip('"') for item in items_str.split(',')]
                return "'" + json.dumps(items) + "'"
            
            cleaned_seed_sql = re.sub(r"ARRAY\[([^\]]+)\]", array_replacer, seed_sql)
            # Also SQLite does not support ON CONFLICT (state_code, violation_code) DO NOTHING
            # We can use INSERT OR IGNORE or split/run them.
            # Let's replace ON CONFLICT ... DO NOTHING with OR IGNORE
            cleaned_seed_sql = cleaned_seed_sql.replace("ON CONFLICT (code) DO NOTHING", "")
            cleaned_seed_sql = cleaned_seed_sql.replace("ON CONFLICT (state_code, violation_code) DO NOTHING", "")
            cleaned_seed_sql = cleaned_seed_sql.replace("ON CONFLICT (id) DO NOTHING", "")
            cleaned_seed_sql = cleaned_seed_sql.replace("ON CONFLICT (state_code, vehicle_type) DO NOTHING", "")
            cleaned_seed_sql = cleaned_seed_sql.replace("ON CONFLICT DO NOTHING", "")
            
            # Since SQLite doesn't do ON CONFLICT easily with general queries, we can change INSERT to INSERT OR IGNORE
            cleaned_seed_sql = re.sub(r"(?i)INSERT INTO", "INSERT OR IGNORE INTO", cleaned_seed_sql)
            
            # Execute statement by statement or executescript
            cur.executescript(cleaned_seed_sql)
            conn.commit()
            print("SQLite Database initialized and seeded successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
