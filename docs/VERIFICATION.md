# Verification record

Executed locally on 21 October 2026.

| Check | Result |
| --- | --- |
| Backend pytest suite | 19 passed |
| Playwright browser suite | 6 passed |
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
