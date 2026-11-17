-- SSE ECONITES database schema
-- Run this whole file once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- ============ TABLES ============

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  matric      text not null unique,
  department  text not null default '',
  level       text not null default '100L',
  role        text not null default 'Student',
  phone       text not null default '',
  approved    boolean not null default false,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- private per-student data: assignment ticks, courses + scores, quiz history
create table if not exists public.private_dash (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- one row (id = 1) holding site settings: class name, page names, links, welcome message, group link
create table if not exists public.settings (
  id   int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  pinned     boolean not null default false,
  author_id  uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('lecture','test','exam','event')),
  course_code text not null default '',
  title       text not null,
  day         text not null default '',      -- weekly lectures: Monday..Friday
  date        date,                           -- tests, exams, events
  start_time  text not null default '',
  end_time    text not null default '',
  venue       text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'note' check (kind in ('note','assignment')),
  course_code text not null default '',
  title       text not null,
  details     text not null default '',
  url         text not null default '',
  file_path   text not null default '',
  due         date,
  created_at  timestamptz not null default now()
);

create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_created_idx on public.messages (created_at desc);

insert into public.settings (id, data) values (1, jsonb_build_object(
  'className', 'SSE ECONITES',
  'school', 'University of Benin',
  'faculty', 'Faculty of Education',
  'matricPrefixes', 'EDU, B1',
  'welcomeMessage', 'Welcome to {class}, {name}! You''re now part of the family. Join our class group so you never miss a lecture change, test date or update.',
  'groupLink', '',
  'groupLabel', 'Join our class group',
  'links', jsonb_build_array(
    jsonb_build_object('label','University of Benin','url','https://uniben.edu'),
    jsonb_build_object('label','Faculty of Education','url','https://educ.uniben.edu'),
    jsonb_build_object('label','Student portal (Kofa)','url','https://waeup.uniben.edu'),
    jsonb_build_object('label','UNIBEN Institutional Repository','url','https://repository.uniben.edu'),
    jsonb_build_object('label','Institute of Education','url','https://ioe.uniben.edu'),
    jsonb_build_object('label','Centre for Distance Learning','url','https://cdl.uniben.edu')
  )
)) on conflict (id) do nothing;

-- ============ HELPERS ============

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select approved or is_admin from profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- students may edit their own profile, but never their own approval or admin flag
create or replace function public.guard_profile_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    new.approved := old.approved;
    new.is_admin := old.is_admin;
    new.matric   := old.matric;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_flags();

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles      enable row level security;
alter table public.private_dash  enable row level security;
alter table public.settings      enable row level security;
alter table public.announcements enable row level security;
alter table public.events        enable row level security;
alter table public.notes         enable row level security;
alter table public.messages      enable row level security;

-- profiles: you see yourself; approved classmates see the class list; admins see everyone
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.is_approved());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles delete admin" on public.profiles;
create policy "profiles delete admin" on public.profiles for delete
  using (public.is_admin() or id = auth.uid());
-- inserts happen only through the sign-up API (service role), which checks the matric number

-- private dashboard: only the owner
drop policy if exists "dash own" on public.private_dash;
create policy "dash own" on public.private_dash for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- settings: everyone can read (header, sign-up page); only admins write
drop policy if exists "settings read" on public.settings;
create policy "settings read" on public.settings for select using (true);
drop policy if exists "settings write" on public.settings;
create policy "settings write" on public.settings for update using (public.is_admin());

-- class content: approved students read, admins write
do $$
declare t text;
begin
  foreach t in array array['announcements','events','notes'] loop
    execute format('drop policy if exists "%1$s read" on public.%1$s', t);
    execute format('create policy "%1$s read" on public.%1$s for select using (public.is_approved())', t);
    execute format('drop policy if exists "%1$s write" on public.%1$s', t);
    execute format('create policy "%1$s write" on public.%1$s for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- chat: approved students read and post as themselves; delete your own, admins delete any
drop policy if exists "messages read" on public.messages;
create policy "messages read" on public.messages for select using (public.is_approved());
drop policy if exists "messages post" on public.messages;
create policy "messages post" on public.messages for insert
  with check (public.is_approved() and user_id = auth.uid());
drop policy if exists "messages delete" on public.messages;
create policy "messages delete" on public.messages for delete
  using (user_id = auth.uid() or public.is_admin());

-- ============ REALTIME (live chat) ============
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;

-- ============ FILE STORAGE (lecture notes) ============
insert into storage.buckets (id, name, public) values ('notes', 'notes', false)
  on conflict (id) do nothing;

drop policy if exists "notes files read" on storage.objects;
create policy "notes files read" on storage.objects for select
  using (bucket_id = 'notes' and public.is_approved());
drop policy if exists "notes files write" on storage.objects;
create policy "notes files write" on storage.objects for insert
  with check (bucket_id = 'notes' and public.is_admin());
drop policy if exists "notes files delete" on storage.objects;
create policy "notes files delete" on storage.objects for delete
  using (bucket_id = 'notes' and public.is_admin());
