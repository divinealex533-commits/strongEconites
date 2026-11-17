-- SSE ECONITES update 2: profile photos, class photo gallery, "Know UNIBEN" page.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.

-- profile photos
alter table public.profiles add column if not exists avatar_url text not null default '';

-- class photo gallery
create table if not exists public.gallery (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  path       text not null,
  caption    text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists gallery_created_idx on public.gallery (created_at desc);
alter table public.gallery enable row level security;

drop policy if exists "gallery read" on public.gallery;
create policy "gallery read" on public.gallery for select using (public.is_approved());
drop policy if exists "gallery post" on public.gallery;
create policy "gallery post" on public.gallery for insert
  with check (public.is_approved() and user_id = auth.uid());
drop policy if exists "gallery delete" on public.gallery;
create policy "gallery delete" on public.gallery for delete
  using (user_id = auth.uid() or public.is_admin());

-- storage: gallery photos are private to approved members; profile photos are public images
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

drop policy if exists "gallery files read" on storage.objects;
create policy "gallery files read" on storage.objects for select
  using (bucket_id = 'gallery' and public.is_approved());
drop policy if exists "gallery files write" on storage.objects;
create policy "gallery files write" on storage.objects for insert
  with check (bucket_id = 'gallery' and public.is_approved() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "gallery files delete" on storage.objects;
create policy "gallery files delete" on storage.objects for delete
  using (bucket_id = 'gallery' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "avatar files write" on storage.objects;
create policy "avatar files write" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar files update" on storage.objects;
create policy "avatar files update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar files delete" on storage.objects;
create policy "avatar files delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- starting content for the "Know UNIBEN" page (class reps can edit it on the site)
update public.settings set data = data || jsonb_build_object('about', jsonb_build_object(
  'checked', 'November 2026',
  'leaders', jsonb_build_array(
    jsonb_build_object('role', 'Vice-Chancellor', 'name', 'Prof. Edoba Bright Omoregie', 'note', '11th substantive Vice-Chancellor, in office since December 2024'),
    jsonb_build_object('role', 'Dean of Students', 'name', 'Prof. Fred Osaro Ekhaise', 'note', 'Appointed July 2025'),
    jsonb_build_object('role', 'Dean, Faculty of Education', 'name', 'Prof. Osamede Kingsley Omorogiuwa', 'note', 'Listed on the Faculty website (2022 to date)')
  ),
  'rules', jsonb_build_array(
    jsonb_build_object('group', 'ID card', 'text', 'Your student ID card is valid for one session. Carry it on campus; you need it for the library, lectures and exams.'),
    jsonb_build_object('group', 'ID card', 'text', 'Report a lost ID card to Security and the Dean of Students. Return it when you graduate or withdraw.'),
    jsonb_build_object('group', 'Conduct', 'text', 'Secret cults (e.g. Eiye, Maphite, Buccaneer) are banned. Membership leads to severe disciplinary action. Join only registered clubs.'),
    jsonb_build_object('group', 'Conduct', 'text', 'Sanctions range from fines, probation and loss of privileges to suspension and expulsion. You can appeal to the Vice-Chancellor, then Council.'),
    jsonb_build_object('group', 'Hostel', 'text', 'Only registered students may live in halls. Bed spaces cannot be sold or transferred, and squatting is not allowed.'),
    jsonb_build_object('group', 'Hostel', 'text', 'Hall gates close from midnight to 6:00 a.m. You need an exeat to sleep out.'),
    jsonb_build_object('group', 'Hostel', 'text', 'Room visiting hours: 4–8 p.m. on weekdays, noon–8 p.m. on weekends and holidays. Visitors sign in at the porter''s lodge.'),
    jsonb_build_object('group', 'Hostel', 'text', 'No cooking, heavy electrical appliances, candles or pets in rooms. Fighting can cost you your accommodation.'),
    jsonb_build_object('group', 'Matriculation', 'text', 'Dress for matriculation: suit and tie for men; gown or suit for women. Unmatriculated students cannot stay beyond mid-semester.')
  ),
  'rulesSource', 'UNIBEN Student Handbook (Student Affairs Division, 2022 edition)',
  'handbookUrl', 'https://uniben.edu/STUDENTHANDBOOK.pdf',
  'schoolAnthemTitle', 'The University of Benin Anthem',
  'schoolAnthem', '',
  'schoolAnthemUrl', 'https://eng.uniben.edu/about-the-university-of-benin/',
  'nationalAnthemTitle', 'Nigeria, We Hail Thee (national anthem since 2024)',
  'nationalAnthem', ''
)) where id = 1 and not (data ? 'about');
