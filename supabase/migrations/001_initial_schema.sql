-- Users profile (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Questions
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.users(id) on delete cascade not null,
  text text not null check (char_length(text) <= 120),
  type text not null check (type in ('yes_no', 'multiple')),
  options jsonb,
  location text not null,
  created_at timestamptz default now()
);

-- Votes
create table public.votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  answer text not null,
  created_at timestamptz default now(),
  unique(user_id, question_id)
);

-- RLS
alter table public.users enable row level security;
alter table public.questions enable row level security;
alter table public.votes enable row level security;

-- Users: anyone can read, only own row editable
create policy "users_read" on public.users for select using (true);
create policy "users_insert" on public.users for insert with check (auth.uid() = id);
create policy "users_update" on public.users for update using (auth.uid() = id);

-- Questions: anyone can read, auth users can insert, only author can delete
create policy "questions_read" on public.questions for select using (true);
create policy "questions_insert" on public.questions for insert with check (auth.uid() = author_id);
create policy "questions_delete" on public.questions for delete using (auth.uid() = author_id);

-- Votes: users see only their own votes, auth users can insert
create policy "votes_read" on public.votes for select using (auth.uid() = user_id);
create policy "votes_insert" on public.votes for insert with check (auth.uid() = user_id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
