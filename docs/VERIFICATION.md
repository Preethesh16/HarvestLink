# Verification record

Executed locally on 21 October 2026.

| Check | Result |
| --- | --- |
| Backend pytest suite | 45 passed |
| Playwright browser suite | 15 passed |
| TypeScript + Vite production build | Passed; lazy Three.js chunk size advisory |
| Ruff static checks | Passed |
| Python compile check | Passed |
| Actual project-local Chronos-2 CPU inference | Passed |
| Captioned full-workflow recording | Completed, no captured browser exceptions |
| Manual screenshot review | Desktop offers/forecast, mobile farm and harvest layout, video frame inspected |

Browser journeys cover harvest creation, three-buyer negotiation, farmer selection, confirmation, simulated funding, pickup, receipt, settlement, actual Chronos forecasting, private policy visibility, malformed CSV feedback, successful CSV imports/replacement, mobile width and dialog keyboard focus return.

Backend checks cover concurrent selection/reservation, repeated commands, expiry release, cancellation/refund, missing external services, invalid agent proposals, no-deal behavior, distinct eligible offers and counting incoming stock only after funding.

One synthetic held-out week: Chronos MAE 0.598 kg; seasonal-naive MAE 0.469 kg. This does not establish real-world accuracy. After user configuration, one live OpenAI exchange completed successfully and produced a valid offer. Authenticated government API calls remain untested because those credentials were not supplied. No real money, logistics provider or production authentication was tested or represented as connected.

The test suite is evidence for the covered prototype paths, not a guarantee that software has no defects.

## Agricultural redesign regression

The production build and all four Playwright journeys passed again after the visual redesign. Tests ran against an isolated SQLite database on ports 8001/5174 with local policy negotiation, preserving the running OpenAI-enabled demo and avoiding paid negotiation calls. Desktop and 390px mobile captures were visually inspected; screenshots and walkthrough were refreshed. The Three.js farm remains lazy-loaded with reduced-motion and WebGL fallback support.

## Entrance and native-language assistance

- Four explicit demo accounts now use password verification, HttpOnly SameSite cookies, 12-hour server-side sessions and workspace enforcement. Login attempts are throttled after repeated failures; logout revokes the session. These remain public hackathon identities, not production customer accounts.
- Backend identity tests cover missing login, invalid password, actor-header impersonation, farmer-only actions, onboarding validation, logout and cross-origin rejection.
- Inception's user-owned CareMascot geometry was adapted into Madhu. The helper uses scoped workspace data for text answers and Sarvam Bulbul v3 for spoken replies. Actual Kannada text generation and audio synthesis were verified; all ten regional voices have not individually been listened to.
- English plus Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Gujarati, Bengali, Punjabi and Odia are offered. Standard labels are bundled; dynamic text uses cached server translation with explicit English fallback. Machine-generated translations need native-speaker review before production.
- Source reference: https://docs.sarvam.ai/api-reference/text-to-speech/convert. Cinematic entrance inspiration: https://higgsfield.ai/; all farm geometry is local/original rather than copied media.

Final entrance verification: 19 backend tests, 6 Playwright tests, TypeScript/Vite build and Ruff pass. Updated workflow recording completed without browser exceptions after introducing authenticated participants. Native-language mobile layout was visually inspected with no horizontal overflow.

## Independent workflow audit and seasonal planning

An independent browser-testing agent reviewed all four accounts, desktop and 320px mobile layouts, keyboard focus and missing-data states. It found and we corrected: 320px branding overlap, desktop sign-in/language collision, assistant Escape focus loss, and empty forecasts appearing as zero demand plus a default 40kg purchase. Mobile navigation now wraps so destinations are visible. The hidden dashboard farm renderer was removed to avoid unnecessary GPU work.

The farm now rotates slowly while idle, supports direct pointer dragging and keyboard arrow/Home control, and respects reduced motion. The overlapping visual control strip was removed at the user's request.

The farmer-only crop planner is an explainable shortlist, not a trained crop-yield model: broad season and irrigation assumptions, previous-crop family caution, and aggregate restaurant consumption from the last 28 completed days. Its 14-day demand range assumes repeated usage at harvest, with an illustrative ±25% variation. It does not turn the short-term Chronos forecast into a months-ahead prediction. No observed demand is shown explicitly. Agricultural references are linked in the page; local timing, varieties, soil and weather remain unverified.

Independent UI rubric: **8.4/10** for this hackathon demo (visual hierarchy8.5, task clarity8.5, mobile8, keyboard8.5, feedback/data honesty8.5). This is an engineering/browser review, not a trial with actual farmers. Remaining limitations include native-speaker review and some technical inventory labels.

Final combined audit: **22 backend tests +13 browser tests pass**. The actual canvas image changes after keyboard rotation; direct pointer dragging and reset are covered with reduced motion enabled.

## Narrated publication demo

The 3:50 walkthrough uses actual UI actions on an isolated database. Three OpenAI-mode offers were generated; the chosen 11 kg Green Table order reached `settled`. Chronos inference and Kannada Sarvam speech succeeded. No browser exceptions were captured in the completed recording. Public evidence is in [workflow-evidence.json](demo/workflow-evidence.json).

OpenAI `gpt-realtime-2.1` with Marin generated the English narration. All 13 returned audio transcripts matched the scripted text after punctuation normalization. The finished H.264/AAC MP4 is 1440×1000 at 30 fps, with embedded optional English subtitles and visible AI-voice disclosure. FFprobe confirmed 230.000 seconds for both video and audio. Audio peak was −0.5 dBFS (no clipping); representative frames were visually reviewed. Recording wait time is edited; synthetic data, simulated funds and illustrative distances remain explicitly disclosed.

## Excel, role separation and visible delivery revision

45 backend tests and 15 browser journeys pass. The first browser run passed 12 journeys; three selectors were updated for the new heading/status/progress elements and all three reruns passed. Independent backend review added 23 spreadsheet and access cases, exposing silent truncation outside the accepted worksheet bounds. The parser now rejects excess dimensions rather than dropping data. Valid Excel previews preserve Unicode, dates and CSV quoting; invalid headers, formulas, macro/archive limits and extra cells are rejected. Preview never imports or changes stock.

Browser checks verify actual four-row Excel upload, dated Agmarknet figures, missing-crop disclosure, absence of farmer controls/artwork in buyer navigation, negotiation replay visibility and a full simulated route. Reaching 100% delivery playback leaves the order funded; role-specific confirmation is still needed to advance it. The existing full settlement journey also passes. Map tiles rendered successfully during screenshot review. The map is illustrative, not calculated road routing or live GPS.

The public government homepage was read in a browser on21 October 2026:24 published commodities, all states/markets, FAQ grade, frozen through19 October 2026, INR/quintal. Captured values and provenance live in `demo-data/government-prices.json`. The app shows the checked-in dated snapshot and a link to the latest official report; it does not claim automatic refresh. Missing harvest-crop quotes remain unavailable.

The revised 13-chapter video is exactly 230.000 seconds for both audio and video. All 13 English narration transcripts match the script; the full 13.312-second Kannada response is preserved at natural speed. Full FFmpeg decode passes, audio peak is −0.5 dBFS, and workbook, negotiation, agreement and moving-vehicle frames were reviewed. The completed recording captured no browser exceptions.

## Automatic market refresh

55 backend tests pass, including 10 new market-cache/parser cases. A browser regression passes for saved-price retention on refresh failure and updating source/date/price after a mocked successful retry. The official external fetch is not verified successful: direct Agmarknet requests returned403 and the automated public report failed to load. No data.gov.in API key is configured. This is an explicit connectivity limitation, not a passing live-feed test. See [market data setup](MARKET-DATA.md).
