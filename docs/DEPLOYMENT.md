# Vercel deployment

Live demo: https://harvestlink-jade.vercel.app

Hosted on Vercel with Neon free PostgreSQL in Singapore. Public demo accounts are `farmer`, `restaurant1`, `restaurant2`, `restaurant3`, all using `Harvest@123`.

Deploy the repository root. `vercel.json` builds the Vite frontend and routes `/api/*` to the FastAPI ASGI function in `api/index.py`.

## Required configuration

- `DATABASE_URL`: PostgreSQL connection string from a connected Neon database (free plan supported). The Vercel entry point deliberately rejects a missing database rather than storing orders in ephemeral files.
- `FORECAST_MODE=baseline`: labeled expiry-aware baseline. Local Amazon Chronos-2 inference is not packaged into the serverless function; use the local runtime for the Chronos demo until an external inference service is implemented.
- `NEGOTIATION_MODE=openai` and `OPENAI_API_KEY`: optional live proposal model. Use `local` for deterministic proposals.
- `OPENAI_MODEL`: proposal/assistant model setting.
- `SARVAM_API_KEY`: optional native-language speech.
- `DATA_GOV_API_KEY`: optional government data refresh. The keyless Chromium collector is not available inside this Python deployment. The existing dated report remains available.

Provider keys are server-side Vercel secrets, never Vite-prefixed browser configuration. Local `.env`, databases, recordings and unrelated presentation files are excluded from uploads.

## Persistence

Cloud instances use a shared PostgreSQL state row with a transaction lock. Sessions are stored in PostgreSQL and logout revokes them. Without `DATABASE_URL`, local development retains SQLite and in-memory sessions. Market and translation caches on Vercel use `/tmp` and are disposable; trades are not stored there.

Four public demo accounts share one demo workspace. This is a hackathon demonstration, with simulated payments and delivery, not a production financial marketplace. Login throttling remains process-local.

## Verification

Run backend tests plus PostgreSQL integration tests against an isolated database:

```sh
HARVESTLINK_TEST_POSTGRES_URL='postgresql://…/isolated_test_database' .venv/bin/pytest backend/tests
npm --prefix frontend run build
npx vercel build --prod
```

Integration tests clear only the configured test database tables. Never point the test variable at a production database.

After deployment, check `/api/health`, login as farmer and buyer, upload a sheet, create a request, negotiate and verify mutually confirmed simulated payment transitions. Confirm sessions and orders survive independent HTTP requests before sharing the URL.
