# SSE ECONITES

Class website for **SSE ECONITES** — Social Science Education (Economics), Faculty of Education, University of Benin.

Students sign up and log in with their **UNIBEN matric number** (EDU24\*\*\*\*\* or B1\*\*\*\*\*\*) and a password. A class rep approves each new member before they can see class content.

## What's inside

- **Sign-up / login** with a chalkboard intro and "Tap me" cap toss, then a welcome message with your class group link
- **My Dashboard** — today's lectures, assignment ticks, next-exam countdown, registered courses, Kofa shortcuts
- **Class Chat** — live group chat with who's online and typing indicators (Supabase Realtime)
- **Study Hub** — AI tutor and 5-question practice quizzes (optional, needs an Anthropic API key)
- **CGPA Calculator** — UNIBEN 5-point scale with class of degree
- **Class Gallery** and profile photos
- **Know UNIBEN** — school leaders, rules from the Student Handbook, the UNIBEN anthem and the national anthem (class reps can edit)
- **Announcements, Timetable & Events, Notes & Assignments** (file uploads), **Classmates**, **School Links**
- **Manage Site** — rename the class and every page, set allowed matric prefixes, welcome message, group link, school links
- Class reps can approve members, reset passwords, make other admins and remove members

The **first person to sign up becomes the admin** automatically. Sign up first yourself.

## Deploy (about 15 minutes, all free tiers)

### 1. Supabase (database, logins, live chat, file storage)
1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a region close to Nigeria (e.g. *West EU* or *Cape Town*).
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql), and press **Run**. Then do the same with [`supabase/002_gallery_about.sql`](supabase/002_gallery_about.sql).
3. Open **Authentication → Sign In / Providers → Email** and turn **Confirm email** **off** (students sign in with matric numbers, not real emails).
4. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` key (secret)

### 2. Vercel (hosting)
1. Go to [vercel.com/new](https://vercel.com/new) and import **divinealex533-commits/strongEconites**.
2. Under **Environment Variables**, add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret) |
| `ANTHROPIC_API_KEY` | optional — turns on Study Hub |

3. Set the **Project Name** to `econites` so the address becomes **econites.vercel.app** (if that name is taken, Vercel suggests another).
4. Press **Deploy**.

### 3. First login
1. Open the site and **Sign up** with your own matric number. You become the admin.
2. Go to **Manage Site** and paste your WhatsApp/Telegram class group link.
3. Share the site link with your coursemates and approve them on **Classmates** as they sign up.

## Run on a computer (optional)
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

## Security notes
- Only the sign-up API (server side) can create accounts, and it rejects matric numbers that don't match the allowed formats.
- Row Level Security means pending students see nothing until approved; chat, notes and timetable are approved-only.
- Students can't approve themselves or make themselves admin (a database trigger blocks it).
- Each student's courses, scores and assignment ticks are private to them.
- The site checks the *format* of a matric number, not the school's records — class rep approval is the real check.
