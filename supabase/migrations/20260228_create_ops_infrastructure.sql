-- =============================================
-- OPS INFRASTRUCTURE MIGRATION
-- Error logging, support tickets, feedback, knowledge skills,
-- issue ledger, and learning events
-- Created: 2026-02-28
-- =============================================

-- =============================================
-- 1. ERROR LOGS (centralized error tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Context
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    -- Error details
    error_type TEXT NOT NULL DEFAULT 'runtime',  -- runtime, api, database, auth, payment, scraper, ai
    severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    stack_trace TEXT,
    -- Where it happened
    source_file TEXT,               -- e.g. 'lib/scraper.ts'
    source_function TEXT,           -- e.g. 'scrapeContactsFromUrl'
    api_route TEXT,                 -- e.g. '/api/agent'
    http_status INTEGER,
    -- Request context
    request_method TEXT,
    request_path TEXT,
    request_body JSONB,
    -- Resolution
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored', 'wont_fix')),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    -- Dedup
    error_hash TEXT,                -- hash of message + source for dedup
    occurrence_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_status ON public.error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_hash ON public.error_logs(error_hash);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);

-- =============================================
-- 2. ISSUE LEDGER (known bugs + improvements tracker)
-- =============================================
CREATE TABLE IF NOT EXISTS public.issue_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Issue details
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'bug' CHECK (category IN ('bug', 'security', 'performance', 'ux', 'feature_request', 'improvement', 'debt')),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'in_progress', 'resolved', 'closed', 'wont_fix')),
    -- Source
    source TEXT DEFAULT 'manual',   -- manual, auto_detected, user_report, code_review, error_log
    source_ref TEXT,                -- e.g. error_log id, support ticket id
    affected_file TEXT,             -- e.g. 'app/page.tsx'
    affected_component TEXT,        -- e.g. 'SessionManager'
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    -- Tracking
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_to TEXT,               -- admin email or name
    error_count INTEGER DEFAULT 0,  -- how many times the related error has occurred
    user_impact_count INTEGER DEFAULT 0, -- how many users affected
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_ledger_status ON public.issue_ledger(status);
CREATE INDEX IF NOT EXISTS idx_issue_ledger_category ON public.issue_ledger(category);
CREATE INDEX IF NOT EXISTS idx_issue_ledger_severity ON public.issue_ledger(severity);

-- =============================================
-- 3. SUPPORT TICKETS (customer support)
-- =============================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Ticket details
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'billing', 'bug_report', 'feature_request', 'account', 'technical')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'awaiting_reply', 'resolved', 'closed')),
    -- Context
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    page_url TEXT,
    browser_info TEXT,
    screenshot_url TEXT,
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_notes TEXT,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- =============================================
-- 4. SUPPORT TICKET MESSAGES (conversation thread)
-- =============================================
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);

-- =============================================
-- 5. USER FEEDBACK (per-response ratings)
-- =============================================
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    message_id UUID,
    -- Feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type TEXT NOT NULL DEFAULT 'response' CHECK (feedback_type IN ('response', 'search_result', 'lead_quality', 'general', 'bug_report')),
    comment TEXT,
    -- Context
    ai_response_snippet TEXT,       -- first 500 chars of the AI response being rated
    query_context TEXT,             -- what the user asked
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(feedback_type);

-- =============================================
-- 6. KNOWLEDGE SKILLS (growing skill MDs)
-- =============================================
CREATE TABLE IF NOT EXISTS public.knowledge_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Skill identity
    slug TEXT UNIQUE NOT NULL,           -- e.g. 'amapiano-curator-pitch'
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general', -- general, genre_specific, platform, outreach, campaign, market
    -- Content
    content TEXT NOT NULL,               -- The skill MD content
    version INTEGER DEFAULT 1,
    -- Learning metadata
    source TEXT DEFAULT 'manual',        -- manual, learned, user_contributed, ai_generated
    success_count INTEGER DEFAULT 0,     -- how many times this skill led to positive feedback
    usage_count INTEGER DEFAULT 0,       -- how many times this skill was used
    effectiveness_score FLOAT DEFAULT 0, -- calculated from feedback
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'deprecated', 'archived')),
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_skills_slug ON public.knowledge_skills(slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_skills_category ON public.knowledge_skills(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_skills_status ON public.knowledge_skills(status);

-- =============================================
-- 7. LEARNING EVENTS (reinforcement learning log)
-- =============================================
CREATE TABLE IF NOT EXISTS public.learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    -- Event
    event_type TEXT NOT NULL, -- 'positive_feedback', 'negative_feedback', 'successful_search', 'failed_search', 'lead_saved', 'lead_ignored', 'skill_used', 'pattern_detected'
    -- Context
    query TEXT,                     -- what the user asked
    ai_response_snippet TEXT,       -- what we responded
    skill_id UUID REFERENCES public.knowledge_skills(id) ON DELETE SET NULL,
    -- Outcome
    outcome TEXT,                   -- 'success', 'failure', 'neutral'
    score FLOAT,                    -- numeric outcome score (-1 to 1)
    -- Pattern data
    pattern_key TEXT,               -- e.g. 'genre:amapiano+country:ZA+intent:find_curators'
    pattern_data JSONB DEFAULT '{}',
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_events_type ON public.learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_pattern ON public.learning_events(pattern_key);
CREATE INDEX IF NOT EXISTS idx_learning_events_user ON public.learning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_outcome ON public.learning_events(outcome);

-- =============================================
-- 8. PATTERN MEMORY (accumulated learning patterns)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pattern_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_key TEXT UNIQUE NOT NULL,   -- e.g. 'genre:amapiano+country:ZA+intent:find_curators'
    -- Statistics
    total_events INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_score FLOAT DEFAULT 0,
    -- Best practices derived from pattern
    best_query TEXT,                     -- the query format that works best
    best_response_approach TEXT,         -- what kind of response works best
    recommended_skills TEXT[],           -- skill slugs that work for this pattern
    -- Status
    confidence FLOAT DEFAULT 0,         -- 0-1 confidence in this pattern
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern_memory_key ON public.pattern_memory(pattern_key);
CREATE INDEX IF NOT EXISTS idx_pattern_memory_confidence ON public.pattern_memory(confidence DESC);

-- =============================================
-- RLS POLICIES FOR NEW TABLES
-- =============================================

-- Error logs: admin only (via service role), no user RLS needed
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Issue ledger: admin only
ALTER TABLE public.issue_ledger ENABLE ROW LEVEL SECURITY;

-- Support tickets: users see their own
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR UPDATE USING (auth.uid() = user_id);

-- Support messages: users see messages on their tickets
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages on own tickets" ON public.support_messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()));
CREATE POLICY "Users can create messages on own tickets" ON public.support_messages FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = auth.uid()));

-- Feedback: users manage their own
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Knowledge skills: public read, admin write (via service role)
ALTER TABLE public.knowledge_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active skills" ON public.knowledge_skills FOR SELECT USING (status = 'active');

-- Learning events: service role only (written by server)
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

-- Pattern memory: service role only
ALTER TABLE public.pattern_memory ENABLE ROW LEVEL SECURITY;
