# AGENTS.md — Project Change Log

## 2026-07-19: Dual environment setup (dev & production)

- Created `.env.development` — local Supabase pointing to local PostgreSQL (`postgresql://postgres:postgres@localhost:54322/postgres`)
- Created `.env.production` — production Supabase instance (`awapepidmyfgpfhefpnw.supabase.co`)
- Kept existing `.env` as fallback (ignored by git per `.gitignore`)
- Installed `dotenv-cli` to explicitly control which env file is loaded per script
- Updated scripts in `package.json` to use `dotenv -e <envfile> -- <command>`
  - `npm run dev` → loads `.env.development`
  - `npm run build` → loads `.env.production`
  - `npm run start` / `npm run prod` → loads `.env.production`
- Added `supabase:start` and `supabase:stop` scripts for local Supabase management
