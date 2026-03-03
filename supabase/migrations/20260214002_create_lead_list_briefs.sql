-- Strategy briefs for lead lists (auto-generated from conversation context)
CREATE TABLE IF NOT EXISTS lead_list_briefs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    summary TEXT NOT NULL,
    target_audience TEXT,
    objective TEXT,
    pitch_angle TEXT,
    country TEXT,
    generated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_lead_list_briefs_user_id ON lead_list_briefs(user_id);

-- Row Level Security
ALTER TABLE lead_list_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own briefs"
    ON lead_list_briefs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefs"
    ON lead_list_briefs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own briefs"
    ON lead_list_briefs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own briefs"
    ON lead_list_briefs FOR DELETE
    USING (auth.uid() = user_id);
