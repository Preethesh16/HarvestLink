# Government market-price refresh

The farmer's **Mandi prices** page now loads the last successful report, attempts a refresh on entry when it is older than 15 minutes, and offers **Refresh government prices**. A failed refresh keeps the existing prices and their original retrieval/reporting dates visible.

## Sources and configuration

1. With `DATA_GOV_API_KEY` in the server's ignored local `.env`, restart the API server to load it; the fetcher calls the official data.gov.in Agmarknet resource `9ef84268-d588-465a-a308-a864a43d0070`. It requests up to 100 Karnataka records and shows market, variety, row reporting date, modal price and minimum/maximum prices. Coverage is explicitly limited to those returned records. Missing source units remain unverified; the app does not guess a conversion.
2. Without that key, the collector attempts the public Agmarknet homepage through an ordinary Chromium session. It reads the visible report and pagination, verifies the published INR/quintal unit and dates, and never logs in or solves a CAPTCHA. This path requires the frontend's development dependencies and installed Playwright Chromium (`cd frontend && npm ci && npx playwright install chromium`). It can fail if the government website blocks automated traffic or changes its page.
3. The previously captured `demo-data/government-prices.json` remains the bootstrap fallback. It is not silently relabelled as a fresh fetch.

**Current verified limitation (21 October 2026):** the public report opens in the interactive browser, but this machine's direct API requests receive HTTP403 and its automated collector cannot load the report controls. NHB's public report returned empty price cells for the tested dates. No data.gov.in key is configured. Therefore a successful automatic external refresh has **not** been verified here. Do not advertise a working live feed until the configured API or collector succeeds.

## Cache and failure handling

- GET `/api/market/catalog`: read the last successful runtime cache, falling back to the bundled dated report.
- POST `/api/market/catalog/refresh`: authenticated farmer-only refresh. No user-controlled external URL is accepted.
- Cache lives beside the selected SQLite DB as `*.market.json`, separating live and test environments. It is written atomically only after a complete valid response.
- Successful results are reused for 15 minutes. Failed attempts have a 60-second retry cooldown; concurrent collectors are prevented within the single-server process.
- A fresh retrieval timestamp means the server successfully fetched a report. It does **not** mean the government published new prices today.
- Prices are reference reports, not guaranteed executable offers. No generated price is used to fill absent source data.

## Verification

Backend tests cover dates/units, malformed/duplicate/empty rows, successful caching, cooldown, failed-refresh preservation, API normalization, secret exclusion and role enforcement. The browser test explicitly mocks both a failure and a successful retry to verify presentation; it is not evidence of external connectivity.
