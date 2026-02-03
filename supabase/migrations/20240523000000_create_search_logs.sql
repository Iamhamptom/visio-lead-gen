-- Create search_logs table
create table if not exists search_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  query text not null,
  country text default 'ZA',
  results_count int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table search_logs enable row level security;

-- Policy: Users can only see their own logs (for Admin, we will use service key or special admin policy later)
create policy "Users can insert their own logs"
  on search_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own logs"
  on search_logs for select
  using (auth.uid() = user_id);
