# LookSharp
Nano Banana 🍌 powered webapp to try out glasses. So, you can look sharp and your look is sharp

LookSharp uses Google Gemini 2.5 Flash Image to quickly and consistently composite frames onto a user’s photo, preserving facial detail and background for natural‑looking results. The speed and consistency of Gemini 2.5 Flash let users try multiple styles fast with reliable quality.

## Quick Start

- Requirements: Node.js >= 18.18
- Setup
  - Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (required for Try‑On).
  - Optional: set `BLOB_READ_WRITE_TOKEN` to upload assets to Vercel Blob. Without it, assets can save under `public/assets/glasses/` locally when allowed.
  - Database: local dev defaults to SQLite at `.data/dev.sqlite`. For Postgres/Supabase, set `POSTGRES_PRISMA_URL` (or `DATABASE_URL`) and run `npm run prisma:push` once.
- Install dependencies: `npm install`
- Seed data (options below)
- Run the dev server: `npm run dev` and open http://localhost:3000

## Seeding Data

You have three seeding paths depending on your environment and source of truth.

- Local dev (SQLite):
  - `npm run db:seed` — inserts a single sample product and a reference asset into `.data/dev.sqlite` and `public/assets/...`.

- Supabase (labels.csv only):
  - Place images and a `labels.csv` file in `./.seed_data/`.
    - Image name should match `key` (e.g., `key=hmt0258_0` → `.seed_data/hmt0258_0.jpg|png`).
    - One-level subfolders are also scanned.
  - Apply the schema to Supabase:
    - Bash: `POSTGRES_PRISMA_URL="postgres://..." npm run prisma:push`
    - PowerShell: `$env:POSTGRES_PRISMA_URL="postgres://..."; npm run prisma:push`
    - Tip: Prefer a non‑pooling (port 5432) URL for schema pushes when possible.
  - Seed from labels only (no AI/inference):
    - Bash: `POSTGRES_PRISMA_URL="$POSTGRES_PRISMA_URL" npm run db:seed:pg`
    - PowerShell: `$env:DATABASE_URL=$env:POSTGRES_PRISMA_URL; npm run db:seed:pg`
  - Image upload behavior:
    - With `BLOB_READ_WRITE_TOKEN` set: images upload to Vercel Blob and the public URL is stored in `media_assets.cdn_url`.
    - By default when targeting Postgres, uploads are required. To allow copying into `public/assets/...` instead, set `REQUIRE_BLOB_FOR_IMAGES=0`.

- Image‑driven seeding (labels preferred, AI fallback):
  - `npm run db:seed:images`
    - Reads `./.seed_data/labels.csv` when present for authoritative metadata.
    - If a row is missing in labels, it can infer metadata via Gemini (requires `GEMINI_API_KEY`), then inserts to SQLite or Postgres depending on your env vars.
    - Image handling matches the rules above for Vercel Blob vs. local `public/` copies.

### labels.csv format

CSV headers are flexible; these are recognized (case‑insensitive):

`key, filename, sku, name, brand, style, shape, color, sex, frameWidthMm, lensHeightMm, priceCents, priceUsd, tags, altText`

- Required for each row: `sku`, `name` (brand defaults to `LookSharp` if omitted)
- `tags` can be separated by `,` or `;`
- `shape` normalizes to one of: aviator, wayfarer, round, rectangle, square, oval, cat-eye, browline, geometric
- `color` normalizes to: black, gold, silver, tortoise, clear, gunmetal, brown, blue, green, red, pink, gray, amber, champagne

### Verifying

- Inspect data: `npm run prisma:studio` (tables `glasses`, `media_assets`, `leads`)
- Run app: `npm run dev`

## Notes

- Featured carousel via Vercel Edge Config is supported. If enabling, see `lib/edge-config.ts` and `app/api/admin/edge-config/sync-featured/route.ts` for the admin sync endpoint and required env vars.
