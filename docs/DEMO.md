# Demo walkthrough — under four minutes

Use one browser, a local API, and the seeded synthetic scenario. Reset from the farmer workspace before presenting. Payments and distances are simulated; market reference remains synthetic unless a real source is connected.

1. **0:00 — Farmer perspective.** Show the farm dashboard and procedural scene. Explain that the farmer keeps the final choice. Edit the profile or open a harvest listing to show crop, grade, quantity and dates.
2. **0:25 — Simple onboarding.** Show the harvest CSV template and upload control. Explain that restaurant inventory and consumption have separate templates with atomic validation.
3. **0:45 — Why restaurants join.** Switch to Restaurant A, open Inventory & forecast, run Chronos. Show shortage date, expiry waste and the recommended purchase quantity. Mention the held-out comparison honestly; the baseline may perform better.
4. **1:20 — Buyer-controlled requirements.** Create a purchase requirement and show the restaurant’s private agent limits. Other demo restaurants already have approved requirements.
5. **1:45 — Farmer’s negotiation.** Return to farmer, select Tomato and run negotiation. Open the steps on an offer. Compare quantity, unit price and collection responsibility across three restaurants.
6. **2:15 — Human selection.** Choose an offer. Switch to that restaurant and confirm the agreement, then fund the simulated payment.
7. **2:40 — Delivery and settlement.** Farmer records pickup; buyer confirms receipt; farmer releases simulated funds. Show the completed timeline and inventory update.
8. **3:10 — Honest boundaries.** No real money or carrier movement; government data is dated rather than promised live; the default negotiation is a local policy engine with an optional credentialed LLM adapter.

The checked-in recording follows this flow with concise visual captions. Its duration may be shorter than this spoken presentation because it contains no voice-over.

## Regenerate the recording

With both local services running:

```bash
cd frontend
node e2e/record.mjs
cd ..
ffmpeg -y -i docs/video/harvestlink-demo.webm -c:v libx264 -preset fast -crf 25 -pix_fmt yuv420p -movflags +faststart -an docs/video/harvestlink-demo.mp4
```

The recorder resets the local demo, adds explanatory captions, exercises real UI controls and captures screenshots. It does not contact buyers or move funds. The final MP4 is the published artifact; the intermediate WebM can be removed after conversion.
