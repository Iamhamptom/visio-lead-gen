-- Lead Requests: tracks every lead generation request for admin visibility
-- Replaces brittle keyword-matching in /api/admin/leads

CREATE TABLE IF NOT EXISTS lead_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID,
    query TEXT NOT NULL,
    contact_types TEXT[] DEFAULT '{}',
    markets TEXT[] DEFAULT '{}',
    genre TEXT DEFAULT '',
    target_count INTEGER DEFAULT 100,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    results_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_requests_user_id ON lead_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_requests_status ON lead_requests(status);
CREATE INDEX IF NOT EXISTS idx_lead_requests_created_at ON lead_requests(created_at DESC);

ALTER TABLE lead_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lead requests"
    ON lead_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own lead requests"
    ON lead_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own lead requests"
    ON lead_requests FOR UPDATE
    USING (auth.uid() = user_id);
