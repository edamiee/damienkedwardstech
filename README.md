# damienkedwardstech

Personal site — public landing page, Writing (blog + linked documents), an
About page, and a gated Projects area (Arcade + whatever's added later)
behind sign-in.

## Stack

- Next.js (App Router) + Tailwind v4
- Supabase — **shares the same project as Class_app-web/web** (the arcade
  app), so the arcade's admin login works here too
- Anthropic API for AI-assisted features (server-only)
- Deployed on Vercel

## First-time setup

1. **Run the schema migration** against the *same* Supabase project the
   arcade app uses — open its SQL editor and run
   [`supabase/migrations/0001_personal_site.sql`](supabase/migrations/0001_personal_site.sql).
   This only adds new tables (`posts`, `papers`, `site_projects`,
   `project_viewer_invites`) — it does not touch the arcade's existing
   tables, and it depends on `public.admins` / `public.is_admin()` already
   existing there.
2. Copy `.env.local.example` to `.env.local` and fill in the **same**
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY` values as
   `Class_app-web/web/.env.local`. Generate a fresh `ADMIN_API_SECRET`
   (`openssl rand -base64 32`) — this one's new and just for this app.
3. `npm install && npm run dev` — [http://localhost:3000](http://localhost:3000)
4. Sign in at `/admin/login` with the same email/password used for the
   arcade admin — you're already in `public.admins`, so no extra setup
   needed there.
5. Optional: run [`supabase/seed_example.sql`](supabase/seed_example.sql)
   (edit the arcade URL first) to add the Arcade game as a gated project,
   and to see how inviting a viewer works.

## Content model

- **Posts** (`posts` table) — full blog posts, written as Markdown, edited
  at `/admin/posts`.
- **Papers** (`papers` table) — external links (writeups, case studies,
  hosted PDFs/docs), edited at `/admin/papers`. Posts and papers are shown
  together on `/writing`.
- **Gated projects** (`site_projects`) — the list shown at `/projects` to
  signed-in admins/viewers, edited at `/admin/projects`.
- **Viewer invites** (`project_viewer_invites`) — email allowlist for
  `/projects` access, managed at `/admin/viewers`. You (the admin) don't
  need an entry here — admin access already includes it.

## Remote content — Hermes / Claude

`POST /api/admin/content` accepts a bearer token (`ADMIN_API_SECRET`) and
creates or updates a post or paper — this is the integration point for the
Hermes agent (or a direct Claude API call) to publish content without going
through the `/admin` UI. See the comment at the top of
[`src/app/api/admin/content/route.ts`](src/app/api/admin/content/route.ts)
for the request shape.

`POST /api/admin/draft-post` is an admin-session-only helper that drafts a
post from a topic using Claude — a starting point for other AI features
that need to call Claude server-side (`src/lib/anthropic.ts`).

## Deploying

This is meant to go on the `damienkedwardstech` domain, already on Vercel:

1. `vercel link` this project (or import it in the Vercel dashboard) —
   either attach it to the existing `damienkedwardstech` Vercel project if
   you want this to replace what's there, or create a new project and move
   the domain to it.
2. In the Vercel project's Environment Variables, set
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` (same values as the
   arcade app's Vercel project), and `ADMIN_API_SECRET` (the one generated
   above — share it with Hermes out of band, e.g. via its own config, not
   in this repo).
3. Push to trigger a deploy, then confirm the domain is pointed at this
   project in Vercel's Domains settings.

The Arcade game itself stays deployed separately — this site only links to
it from `/projects` once someone's signed in.
