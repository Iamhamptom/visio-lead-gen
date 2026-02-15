-- Visio Lead Gen Database Schema (Consolidated)
-- Run this in Supabase SQL Editor
-- Last updated: 2026-02-15
-- Includes all migrations through 20260214

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================
-- USERS PROFILES (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'artist' CHECK (subscription_tier IN ('artist', 'starter', 'artiste', 'starter_label', 'label', 'agency', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
    subscription_period_end TIMESTAMPTZ,
    -- Credits system
    credits_balance INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    credits_reset_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ARTIST PROFILES (for multi-artist management)
-- =============================================
CREATE TABLE IF NOT EXISTS public.artist_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    genre TEXT,
    bio TEXT,
    image_url TEXT,
    socials JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHAT SESSIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Research',
    folder_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHAT MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    leads JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SAVED LEADS
-- =============================================
CREATE TABLE IF NOT EXISTS public.saved_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    match_score INTEGER,
    socials JSONB DEFAULT '{}',
    image_url TEXT,
    source TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVOICES (for billing history)
-- =============================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'refunded')),
    yoco_checkout_id TEXT,
    yoco_payment_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CREDIT TRANSACTIONS (audit trail)
-- =============================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CAMPAIGN FOLDERS (session organization)
-- =============================================
CREATE TABLE IF NOT EXISTS public.campaign_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#5EEAD4',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LEAD LIST BRIEFS (auto-generated strategy summaries)
-- =============================================
CREATE TABLE IF NOT EXISTS public.lead_list_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    summary TEXT NOT NULL,
    target_audience TEXT,
    objective TEXT,
    pitch_angle TEXT,
    country TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- KNOWLEDGE BASE (RAG / vector search)
-- =============================================
CREATE TABLE IF NOT EXISTS public.knowledge (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    category TEXT,
    source_title TEXT,
    embedding vector(3072),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SEARCH LOGS (analytics)
-- =============================================
CREATE TABLE IF NOT EXISTS public.search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    query TEXT NOT NULL,
    country TEXT DEFAULT 'ZA',
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_list_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Artist Profiles: Users can manage their own artist profiles
CREATE POLICY "Users can view own artist profiles" ON public.artist_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own artist profiles" ON public.artist_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own artist profiles" ON public.artist_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own artist profiles" ON public.artist_profiles FOR DELETE USING (auth.uid() = user_id);

-- Sessions: Users can manage their own sessions
CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.sessions FOR DELETE USING (auth.uid() = user_id);

-- Messages: Users can view messages from their sessions
CREATE POLICY "Users can view messages from own sessions" ON public.messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "Users can create messages in own sessions" ON public.messages FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));

-- Saved Leads: Users can manage their own leads
CREATE POLICY "Users can view own saved leads" ON public.saved_leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own saved leads" ON public.saved_leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved leads" ON public.saved_leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved leads" ON public.saved_leads FOR DELETE USING (auth.uid() = user_id);

-- Invoices: Users can view their own invoices
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);

-- Credit Transactions: Users can view their own transactions
CREATE POLICY "Users view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- Campaign Folders: Users can manage their own folders
CREATE POLICY "Users manage own folders" ON public.campaign_folders FOR ALL USING (auth.uid() = user_id);

-- Lead List Briefs: Users can manage their own briefs
CREATE POLICY "Users can read own briefs" ON public.lead_list_briefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own briefs" ON public.lead_list_briefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own briefs" ON public.lead_list_briefs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own briefs" ON public.lead_list_briefs FOR DELETE USING (auth.uid() = user_id);

-- Search Logs: Users can manage their own logs
CREATE POLICY "Users can insert their own logs" ON public.search_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own logs" ON public.search_logs FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- Includes credit seeding for new users
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, subscription_tier, subscription_status, credits_balance, credits_used, credits_reset_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'name',
        'artist',
        'active',
        20,
        0,
        NOW() + INTERVAL '30 days'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- MONTHLY CREDITS RESET (call via pg_cron or cron API)
-- =============================================
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles SET credits_balance = 20, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'artist' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    UPDATE public.profiles SET credits_balance = 50, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'starter' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    UPDATE public.profiles SET credits_balance = 100, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'artiste' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    UPDATE public.profiles SET credits_balance = 250, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'starter_label' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    UPDATE public.profiles SET credits_balance = 500, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'label' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    UPDATE public.profiles SET credits_balance = 2000, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'agency' AND subscription_status = 'active' AND credits_reset_at <= NOW();

    UPDATE public.profiles SET credits_balance = 99999, credits_used = 0, credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE subscription_tier = 'enterprise' AND subscription_status = 'active' AND credits_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- KNOWLEDGE VECTOR SEARCH FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION match_knowledge (
    query_embedding vector(3072),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id bigint,
    content text,
    category text,
    source_title text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        knowledge.id,
        knowledge.content,
        knowledge.category,
        knowledge.source_title,
        1 - (knowledge.embedding <=> query_embedding) AS similarity
    FROM knowledge
    WHERE 1 - (knowledge.embedding <=> query_embedding) > match_threshold
    ORDER BY knowledge.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON public.artist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_saved_leads_user_id ON public.saved_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_folders_user_id ON public.campaign_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_list_briefs_user_id ON public.lead_list_briefs(user_id);
