-- Migration: {{DESCRIPTION}}
-- Created: YYYY-MM-DD

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS {{table_name}} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_{{table_name}}_{{column}}
    ON {{table_name}} ({{column}});

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP INDEX IF EXISTS idx_{{table_name}}_{{column}};
DROP TABLE IF EXISTS {{table_name}};

COMMIT;
