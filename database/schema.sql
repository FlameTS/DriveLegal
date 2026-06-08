-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- States Table
CREATE TABLE IF NOT EXISTS states (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- National Laws / Core Laws
CREATE TABLE IF NOT EXISTS laws (
    id SERIAL PRIMARY KEY,
    section VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    embedding vector(768),
    category VARCHAR(50) NOT NULL, -- documents, safety, vehicle_condition, speed, general
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'all' -- all, motorcycle, car, heavy
);

-- State Specific Overrides/Additions
CREATE TABLE IF NOT EXISTS state_overrides (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(10) REFERENCES states(code) ON DELETE CASCADE,
    law_id INTEGER REFERENCES laws(id) ON DELETE CASCADE,
    override_type VARCHAR(50) NOT NULL, -- modify, exempt, add
    description TEXT NOT NULL,
    embedding vector(768)
);

-- Common Violations (Fines Schedule)
CREATE TABLE IF NOT EXISTS violations (
    code VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- documents, safety, vehicle_condition, behavior
    fine_first_national INTEGER NOT NULL,
    fine_repeat_national INTEGER NOT NULL
);

-- State Fine Overrides
CREATE TABLE IF NOT EXISTS state_fines (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(10) REFERENCES states(code) ON DELETE CASCADE,
    violation_code VARCHAR(100) REFERENCES violations(code) ON DELETE CASCADE,
    fine_first_override INTEGER,
    fine_repeat_override INTEGER,
    UNIQUE (state_code, violation_code)
);

-- Travel Rules per State
CREATE TABLE IF NOT EXISTS travel_checklists (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(10) REFERENCES states(code) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL, -- motorcycle, car, heavy
    documents_required TEXT[] NOT NULL,
    speed_limit INTEGER NOT NULL, -- in km/h
    special_rules TEXT[] NOT NULL,
    UNIQUE (state_code, vehicle_type)
);
