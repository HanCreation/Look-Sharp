# LookSharp
Nano Banana 🍌 powered webapp to try out glasses. So, you can look sharp and your look is sharp

LookSharp uses Google Gemini 2.5 Flash Image to quickly and consistently composite frames onto a user’s photo, preserving facial detail and background for natural‑looking results. The speed and consistency of Gemini 2.5 Flash let users try multiple styles fast with reliable quality.

## Quick Start

- Requirements: Node.js >= 18.18
- Setup
  - Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (required for Try‑On).
  - Optional: set `BLOB_READ_WRITE_TOKEN` to upload assets to Vercel Blob. Without it, assets save under `public/assets/glasses/` locally.
  - Optional database: by default, local dev uses SQLite at `.data/dev.sqlite`. To use Postgres/Supabase, set `POSTGRES_PRISMA_URL` or `DATABASE_URL` and run `npm run prisma:push` once.
- Install dependencies: `npm install`
- Seed sample data (optional): `npm run db:seed` or `npm run db:seed:images`
- Run the dev server: `npm run dev` and open http://localhost:3000

## Notes

- Featured carousel via Vercel Edge Config is supported. If enabling, see `lib/edge-config.ts` and `app/api/admin/edge-config/sync-featured/route.ts` for the admin sync endpoint and required env vars.