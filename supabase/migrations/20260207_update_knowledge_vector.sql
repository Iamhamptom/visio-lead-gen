-- Update the knowledge table to use 3072 dimensions
alter table knowledge alter column embedding type vector(3072);

-- Update the matching function to accept 3072 dimensions
drop function if exists match_knowledge(vector, float, int);
drop function if exists match_knowledge(vector, double precision, integer);

create or replace function match_knowledge (
  query_embedding vector(3072),
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
