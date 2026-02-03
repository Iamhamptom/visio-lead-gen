-- Visio Lead Gen Database Schema
-- Run this in Supabase SQL Editor

-- =============================================
-- USERS PROFILES (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'artist' CHECK (subscription_tier IN ('artist', 'artiste', 'starter_label', 'label', 'agency', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
    subscription_period_end TIMESTAMPTZ,
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
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

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

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
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
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON public.artist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_saved_leads_user_id ON public.saved_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
