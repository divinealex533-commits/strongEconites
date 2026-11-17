-- SSE ECONITES update 3: course rep roles.
-- Admin: everything. Course rep / Assistant course rep: post announcements, timetable, notes,
-- approve new classmates, moderate chat. Students: read and chat only.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.

-- 1. Until now students picked their own role at sign-up. Reset everyone except the admin to Student,
--    so only people the admin chooses become reps. (Runs only the first time; running the file again
--    won't undo reps you have already assigned.)
update public.profiles set role = 'Student'
  where not is_admin
  and not exists (select 1 from public.settings where id = 1 and (data->>'repsAssigned') = 'true');
update public.settings set data = data || '{"repsAssigned": true}'::jsonb where id = 1;

-- 2. Who counts as staff
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin or role in ('Course rep', 'Assistant course rep')
                   from profiles where id = auth.uid() and (approved or is_admin)), false)
$$;

-- 3. Profile protection:
--    students can edit their own name, department, level, phone and photo, never their role or approval;
--    reps can approve other students but change nothing else about them;
--    only the admin can change roles and admin rights.
create or replace function public.guard_profile_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if old.id = auth.uid() then
    new.approved := old.approved;
    new.is_admin := old.is_admin;
    new.matric   := old.matric;
    new.role     := old.role;
    return new;
  end if;
  -- a rep updating someone else: only the approval flag may change
  new.full_name  := old.full_name;   new.matric := old.matric;   new.department := old.department;
  new.level      := old.level;       new.role   := old.role;     new.phone      := old.phone;
  new.is_admin   := old.is_admin;    new.avatar_url := old.avatar_url;
  return new;
end $$;

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update
  using (id = auth.uid() or public.is_admin() or public.is_staff());

-- 4. Class content: reps and admin write
do $$
declare t text;
begin
  foreach t in array array['announcements','events','notes'] loop
    execute format('drop policy if exists "%1$s write" on public.%1$s', t);
    execute format('create policy "%1$s write" on public.%1$s for all using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

drop policy if exists "notes files write" on storage.objects;
create policy "notes files write" on storage.objects for insert
  with check (bucket_id = 'notes' and public.is_staff());
drop policy if exists "notes files delete" on storage.objects;
create policy "notes files delete" on storage.objects for delete
  using (bucket_id = 'notes' and public.is_staff());

-- 5. Chat: reps can delete any message; the admin can switch the chat to "only reps can send"
create or replace function public.chat_open() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (data->>'chatRepsOnly') is distinct from 'true' from settings where id = 1), true)
$$;

drop policy if exists "messages post" on public.messages;
create policy "messages post" on public.messages for insert
  with check (public.is_approved() and user_id = auth.uid() and (public.chat_open() or public.is_staff()));
drop policy if exists "messages delete" on public.messages;
create policy "messages delete" on public.messages for delete
  using (user_id = auth.uid() or public.is_staff());

-- 6. Gallery: reps can remove photos too
drop policy if exists "gallery delete" on public.gallery;
create policy "gallery delete" on public.gallery for delete
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "gallery files delete" on storage.objects;
create policy "gallery files delete" on storage.objects for delete
  using (bucket_id = 'gallery' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
