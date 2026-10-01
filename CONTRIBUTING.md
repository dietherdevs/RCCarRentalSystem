# Contributing

- `main` is production. It is always deployable; do not commit to it directly.
- Create a feature branch (`feat/...`, `fix/...`), open a pull request into `main`, and merge after review.
- Schema changes go in a new numbered file under `supabase/migrations/` (never edit an applied migration).
- Never commit secrets: `.env`, `.env.local`, service_role keys, tokens or passwords.
- Commit style: `feat:`, `fix:`, `chore:`, `docs:`.
