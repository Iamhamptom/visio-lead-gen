-- Add results storage and admin processing columns to lead_requests

-- Store actual contact results as JSONB
ALTER TABLE lead_requests ADD COLUMN IF NOT EXISTS results JSONB DEFAULT NULL;

-- Track which admin processed the request
ALTER TABLE lead_requests ADD COLUMN IF NOT EXISTS processed_by UUID DEFAULT NULL;

-- Expand status values to include admin workflow states
ALTER TABLE lead_requests DROP CONSTRAINT IF EXISTS lead_requests_status_check;
ALTER TABLE lead_requests ADD CONSTRAINT lead_requests_status_check
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'archived', 'admin_processing'));
