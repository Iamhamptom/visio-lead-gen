-- Music submission orders (Marketplace "Send Your Music" feature)
-- Admin team processes these manually after payment confirmation

CREATE TABLE IF NOT EXISTS music_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_name TEXT NOT NULL,
    email TEXT NOT NULL,
    genre TEXT NOT NULL,
    song_link TEXT NOT NULL,
    epk_link TEXT DEFAULT '',
    message TEXT DEFAULT '',

    -- Payment tracking
    checkout_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'free')),
    amount_cents INTEGER DEFAULT 18000,
    currency TEXT DEFAULT 'ZAR',

    -- Fulfillment tracking (for admin team)
    fulfillment_status TEXT DEFAULT 'new' CHECK (fulfillment_status IN ('new', 'in_progress', 'sent', 'completed', 'rejected')),
    admin_notes TEXT DEFAULT '',
    pages_sent_to INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_submissions_status ON music_submissions(payment_status, fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON music_submissions(email);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON music_submissions(created_at DESC);

-- RLS: Only admins can read/update submissions
ALTER TABLE music_submissions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access" ON music_submissions
    FOR ALL
    USING (true)
    WITH CHECK (true);
