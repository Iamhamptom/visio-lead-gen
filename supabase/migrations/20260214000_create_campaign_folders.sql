-- Campaign folders for organizing chat sessions
CREATE TABLE IF NOT EXISTS campaign_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#5EEAD4',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_folders_user_id ON campaign_folders(user_id);

ALTER TABLE campaign_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folders" ON campaign_folders FOR ALL USING (auth.uid() = user_id);
