# Verification record

Executed locally on 21 October 2026.

| Check | Result |
| --- | --- |
| Backend pytest suite | 15 passed |
| Playwright browser suite | 4 passed |
| TypeScript + Vite production build | Passed; lazy Three.js chunk size advisory |
| Ruff static checks | Passed |
| Python compile check | Passed |
| Actual project-local Chronos-2 CPU inference | Passed |
| Captioned full-workflow recording | Completed, 30.68 seconds, no captured browser exceptions |
| Manual screenshot review | Desktop offers/forecast, mobile farm and harvest layout, video frame inspected |

Browser journeys cover harvest creation, three-buyer negotiation, farmer selection, confirmation, simulated funding, pickup, receipt, settlement, actual Chronos forecasting, private policy visibility, malformed CSV feedback, successful CSV imports/replacement, mobile width and dialog keyboard focus return.

Backend checks cover concurrent selection/reservation, repeated commands, expiry release, cancellation/refund, missing external services, invalid agent proposals, no-deal behavior, distinct eligible offers and counting incoming stock only after funding.

One synthetic held-out week: Chronos MAE 0.598 kg; seasonal-naive MAE 0.469 kg. This does not establish real-world accuracy. After user configuration, one live OpenAI exchange completed successfully and produced a valid offer. Authenticated government API calls remain untested because those credentials were not supplied. No real money, logistics provider or production authentication was tested or represented as connected.

The test suite is evidence for the covered prototype paths, not a guarantee that software has no defects.
