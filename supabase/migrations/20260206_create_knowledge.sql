-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your knowledge base
create table if not exists knowledge (
  id bigserial primary key,
  content text,
  category text,
  source_title text,
  embedding vector(768), -- Gemini Text Embedding 004 uses 768 dimensions
  created_at timestamptz default now()
);

-- Create a function to search for knowledge chunks
create or replace function match_knowledge (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  category text,
  source_title text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    knowledge.id,
    knowledge.content,
    knowledge.category,
    knowledge.source_title,
    1 - (knowledge.embedding <=> query_embedding) as similarity
  from knowledge
  where 1 - (knowledge.embedding <=> query_embedding) > match_threshold
  order by knowledge.embedding <=> query_embedding
  limit match_count;
end;
$$;
