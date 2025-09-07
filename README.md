# Look-Sharp
Nano Banana 🍌 powered webapp to try out glasses. So, you can look sharp and your look is sharp

## Image-Based Seeding

You can seed the database from PNG images placed under `./.seed_data`.

- Grouping rules:
  - If `./.seed_data` contains subfolders, each subfolder is treated as one product. All PNGs inside become assets for that product.
  - If you put PNGs directly under `./.seed_data` (no subfolders), each file is treated as a separate product.
- Metadata inference:
  - Brand: first token of the folder name (e.g., `ray-ban_round_gold` → brand `Ray Ban`).
  - Model: the rest of the folder name tokens in Title Case.
  - Shape, style, color: inferred from folder/filenames if keywords are present (e.g., `round`, `aviator`, `gold`, `tortoise`, `retro`).
  - Frame width and lens height: realistic defaults (≈130–150mm width, ≈38–52mm height) chosen deterministically per product.
  - Price: realistic range (≈$89–$289) based on inferred material keywords.
  - Reference image: file containing `ref`, `reference`, or `front` in the name; otherwise the first file.
- Asset storage:
  - If `BLOB_READ_WRITE_TOKEN` is set, images upload to Vercel Blob and the CDN URL is stored.
  - Otherwise, images are copied to `public/assets/glasses/<SKU>/` and referenced by relative URL.

AI-assisted metadata (optional):
- If `GEMINI_API_KEY` is set, the seeder inspects the reference image with Gemini and generates realistic metadata: brand, model, shape, style, color, sex, sizes, price, tags, and alt text. It then normalizes fields and falls back to filename-based inference if anything is missing.
- Set `GEMINI_MODEL_ID` to override the default (`gemini-2.5-flash-image-preview`).

Run the seeder (SQLite by default):

```
npm run db:seed:images
```

Notes:
- For Postgres (Supabase), ensure the database schema is applied first: `npm run prisma:push` (or `prisma migrate deploy` in CI).
- For local (SQLite), the script creates `.data/dev.sqlite` with the minimal schema if missing.

## Supabase (Postgres) Setup

To use a hosted Postgres (e.g., Supabase) and upload product images to Vercel Blob:

- Set your connection string in `.env.local`:
  - `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require`
  - Or `POSTGRES_PRISMA_URL` if using Vercel + Supabase integration.
- Make sure `FORCE_SQLITE` is not set (or is `0`).
- Provide a Vercel Blob token so images go to Blob, not the local `public` folder:
  - `BLOB_READ_WRITE_TOKEN=...`
- Optionally set the base URL for server-side fetches:
  - `NEXT_PUBLIC_APP_URL=https://your-dev-url.example.com`

Apply schema to Postgres:

```
npm run prisma:push
```

Seed from images (enforcing Blob uploads):

```
REQUIRE_BLOB_FOR_IMAGES=1 npm run db:seed:images
```

If an upload fails or the token is missing while `REQUIRE_BLOB_FOR_IMAGES=1`, the seeder will stop with an error instead of copying images into `public/`.
