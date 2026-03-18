-- Bookings Department: Campaign-based venue/promoter outreach system
-- VIP feature: agency + enterprise tiers only, requires admin approval

-- Booking campaigns (tour planning, venue outreach, etc.)
CREATE TABLE IF NOT EXISTS public.booking_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_regions TEXT[] DEFAULT '{}',
    target_types TEXT[] DEFAULT '{}',
    genres TEXT[] DEFAULT '{}',
    tour_dates TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'researching', 'contacts_ready', 'review', 'outreach_sent', 'active', 'completed')),
    contact_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    booked_count INTEGER DEFAULT 0,
    outreach_email_subject TEXT,
    outreach_email_body TEXT,
    approved_by_admin BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking contacts (venues, promoters, agencies, clubs, etc.)
CREATE TABLE IF NOT EXISTS public.booking_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.booking_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Contact',
    type TEXT NOT NULL DEFAULT 'venue'
        CHECK (type IN ('venue', 'promoter', 'agency', 'events_company', 'club', 'festival')),
    city TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    region TEXT,
    website TEXT,
    linkedin TEXT,
    socials JSONB DEFAULT '{}',
    capacity INTEGER,
    genres TEXT[] DEFAULT '{}',
    verified BOOLEAN DEFAULT false,
    enriched_at TIMESTAMPTZ,
    notes TEXT,
    outreach_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (outreach_status IN ('pending', 'sent', 'opened', 'replied', 'booked', 'declined')),
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_booking_campaigns_user ON public.booking_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_campaigns_status ON public.booking_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_booking_contacts_campaign ON public.booking_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_booking_contacts_user ON public.booking_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_contacts_type ON public.booking_contacts(type);
CREATE INDEX IF NOT EXISTS idx_booking_contacts_outreach ON public.booking_contacts(outreach_status);

-- RLS policies
ALTER TABLE public.booking_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own booking campaigns"
    ON public.booking_campaigns FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users manage own booking contacts"
    ON public.booking_contacts FOR ALL
    USING (auth.uid() = user_id);
