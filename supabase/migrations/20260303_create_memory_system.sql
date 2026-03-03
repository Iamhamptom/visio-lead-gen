-- Memory System: per-user memory, conversation embeddings, voice transcripts
-- Depends on: pgvector extension (already enabled for knowledge table)

-- ═══════════════════════════════════════════════════════
-- 1. message_embeddings — semantic search over past conversation turns
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS message_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    embedded_text TEXT NOT NULL,
    embedding vector(768),
    role TEXT NOT NULL DEFAULT 'turn' CHECK (role IN ('user', 'model', 'turn')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_embeddings_user ON message_embeddings(user_id);
CREATE INDEX idx_message_embeddings_session ON message_embeddings(session_id);

ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own message embeddings"
    ON message_embeddings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own message embeddings"
    ON message_embeddings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS for server-side writes
-- (admin client uses service role key)


-- ═══════════════════════════════════════════════════════
-- 2. user_memory — per-user facts, preferences, goals
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('preference', 'fact', 'goal', 'style', 'contact_preference')),
    content TEXT NOT NULL,
    embedding vector(768),
    source TEXT NOT NULL DEFAULT 'conversation' CHECK (source IN ('conversation', 'voice_call', 'explicit')),
    source_session_id UUID,
    confidence FLOAT NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    times_referenced INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    superseded_by UUID REFERENCES user_memory(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_memory_user ON user_memory(user_id);
CREATE INDEX idx_user_memory_active ON user_memory(user_id, is_active);
CREATE INDEX idx_user_memory_category ON user_memory(user_id, category);

ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"
    ON user_memory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
    ON user_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
    ON user_memory FOR UPDATE
    USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════
-- 3. voice_call_transcripts — persistent voice call history
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS voice_call_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    duration_seconds INT NOT NULL DEFAULT 0,
    exchange_count INT NOT NULL DEFAULT 0,
    transcript JSONB NOT NULL DEFAULT '[]',
    summary TEXT,
    summary_embedding vector(768),
    extracted_memories JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_transcripts_user ON voice_call_transcripts(user_id);

ALTER TABLE voice_call_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice transcripts"
    ON voice_call_transcripts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice transcripts"
    ON voice_call_transcripts FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════
-- 4. RPC: match_message_memory — cosine similarity search over message embeddings
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION match_message_memory(
    p_user_id UUID,
    query_embedding vector(768),
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    id UUID,
    session_id TEXT,
    message_id TEXT,
    embedded_text TEXT,
    role TEXT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        me.id,
        me.session_id,
        me.message_id,
        me.embedded_text,
        me.role,
        1 - (me.embedding <=> query_embedding) AS similarity,
        me.created_at
    FROM message_embeddings me
    WHERE me.user_id = p_user_id
      AND 1 - (me.embedding <=> query_embedding) > match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


-- ═══════════════════════════════════════════════════════
-- 5. RPC: match_user_memory — cosine similarity search over user memory
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION match_user_memory(
    p_user_id UUID,
    query_embedding vector(768),
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    id UUID,
    category TEXT,
    content TEXT,
    source TEXT,
    confidence FLOAT,
    times_referenced INT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        um.id,
        um.category,
        um.content,
        um.source,
        um.confidence,
        um.times_referenced,
        1 - (um.embedding <=> query_embedding) AS similarity,
        um.created_at
    FROM user_memory um
    WHERE um.user_id = p_user_id
      AND um.is_active = TRUE
      AND 1 - (um.embedding <=> query_embedding) > match_threshold
    ORDER BY um.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
