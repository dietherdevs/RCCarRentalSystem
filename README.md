# RC Rental & Track Management

Counter, fleet and track operations for an RC car rental business: per-car hourly rentals (₱200/hr default), a separate track access pass (₱300 default), payments, maintenance, reports and an audit log. Roles: Admin, Staff, Customer.

## Tech stack
React 19, Vite, Tailwind CSS v4, TypeScript, Supabase (Postgres, Auth, Storage, Realtime, Edge Functions).

## Setup
1. `pnpm install`
2. Create a Supabase project, then copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Run the migrations (below).
4. `pnpm dev`

## Environment variables
| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe in the browser; RLS protects data) |

The service_role key is never used in the frontend. The `invite-user` Edge Function reads it from Supabase's own function environment.

## Running migrations
Either paste `supabase/migrations/001_init.sql` then `supabase/seed.sql` into the Supabase SQL editor, or with the CLI:
```
supabase link --project-ref <ref>
supabase db push
supabase functions deploy invite-user
```
`seed.sql` inserts only the settings row (₱200/hr, ₱300 track, 30-minute rounding, Asia/Manila). There is no sample data.

In Auth settings, add your site URL (and `http://localhost:5173`) to the allowed redirect URLs so password reset links work.

## Creating the first admin
1. Open the app and use "Create an account" to sign up.
2. In the SQL editor run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Sign in again. Admins can invite staff from Settings > Users and change roles there.

## How booking safety works
Overlaps are prevented by a Postgres `EXCLUDE USING gist` constraint on `rentals`. Price is computed server-side by the `create_rental` RPC. Cars in Maintenance, Damaged or Inactive status cannot be rented.

## Deploy
`pnpm build` outputs `dist/`. Host it on any static host (Vercel, Netlify, Cloudflare Pages) and set the two `VITE_` variables there.
