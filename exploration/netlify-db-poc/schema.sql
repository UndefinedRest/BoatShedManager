-- Netlify DB POC: Session Configuration Schema
-- PostgreSQL schema for configurable booking session times

-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS metadata;

-- Sessions table
CREATE TABLE sessions (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    display VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metadata table (tracks configuration changes)
CREATE TABLE metadata (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_sessions_enabled ON sessions(enabled);
CREATE INDEX idx_sessions_sort ON sessions(sort_order);

-- Insert default sessions (same as BoatBooking hardcoded values)
INSERT INTO sessions (id, label, start_time, end_time, display, enabled, sort_order) VALUES
    ('session-1', 'Morning Session 1', '06:30', '07:30', '6:30 AM - 7:30 AM', true, 1),
    ('session-2', 'Morning Session 2', '07:30', '08:30', '7:30 AM - 8:30 AM', true, 2);

-- Insert metadata
INSERT INTO metadata (key, value) VALUES
    ('last_modified', CURRENT_TIMESTAMP::TEXT),
    ('modified_by', 'system'),
    ('version', '1');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on sessions
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on metadata
CREATE TRIGGER update_metadata_updated_at
    BEFORE UPDATE ON metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify schema
SELECT 'Sessions table created successfully' AS status;
SELECT COUNT(*) AS session_count FROM sessions;
