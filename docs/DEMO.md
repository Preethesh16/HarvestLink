# HarvestLink — 3 minutes, 50 seconds

[Watch the narrated screen recording](video/harvestlink-demo.mp4) · [Optional English subtitles](video/harvestlink-demo.srt) · [Exact narration script](demo/scenes.json)

The film follows one farmer and The Green Table, with two additional restaurant offers. It records the working application using synthetic accounts and histories. All payments are simulated. Local computation and service waits are shortened to fit the chapters; session changes are edited between perspectives. The Kannada answer is held on screen during its speech excerpt.

## Chapter guide

| Time | Screen / story |
| --- | --- |
| 00:00–00:18 | Agricultural entrance; direct market-access problem and solution |
| 00:18–00:36 | Farmer role, sign-in and name/location onboarding |
| 00:36–00:56 | Real harvest CSV upload and validation; dated market-reference disclosure |
| 00:56–01:14 | Farmer minimum price, order size and radius; save private limits |
| 01:14–01:36 | Kannada interface, Madhu answer and actual Sarvam Kannada speech |
| 01:36–01:56 | Next-crop suggestions, seasonal assumptions, demand evidence and water constraints |
| 01:56–02:20 | Restaurant inventory import controls and actual Chronos-2 consumption forecast |
| 02:20–02:40 | Approve purchase requirement, buyer budget/price limits and marketplace |
| 02:40–03:00 | Three offers, negotiation steps, illustrative nearby distances and farmer choice |
| 03:00–03:18 | Buyer agreement, stock reservation and funded simulated escrow |
| 03:18–03:38 | Farmer pickup, buyer receipt, inventory update and settlement |
| 03:38–03:50 | Outcome, verification evidence and next validation step |

## Narration and provenance

- **English narration:** OpenAI `gpt-realtime-2.1`, **Marin**, generated through the Realtime WebSocket API on 21 October 2026. This is an AI-generated voice, not a human recording.
- **Kannada excerpt:** the actual audio returned by the application’s Sarvam `bulbul:v3` integration when the recorded farmer asks Madhu for guidance.
- The current [OpenAI speech guide](https://developers.openai.com/api/docs/guides/text-to-speech) points new integrations toward Realtime. Model availability was checked on the configured account before generation. The [Realtime conversation guide](https://developers.openai.com/api/docs/guides/realtime-conversations) documents audio output and event handling.
- [Scene text and timing](demo/scenes.json) and [voice metadata](demo/voice-provenance.json) accompany the artifact. Modest pitch-preserving speech timing adjustments align narration to chapters. The recording includes visible AI-voice and demo-data disclosure.
- [Recorded workflow evidence](demo/workflow-evidence.json) lists the three actual generated offers and settled order. The recorder exercises actual UI actions. No API response mocks are used. The capture backend runs OpenAI negotiation and actual local Chronos inference. The underlying data is still synthetic.
- Distance comparison is shown, **not live road routing**. No government key was configured, so the market reference is explicitly synthetic. Crop planning is a scenario, not an agricultural prescription. These boundaries are stated in the narration.

## Reproduce safely on an isolated demo

The recording script resets its target database. It intentionally targets **8001 / 5174**, not the main demo ports.

First install dependencies and Chromium:

```bash
uv sync --extra forecast --extra demo
cd frontend
npm ci
npx playwright install chromium
cd ..
```

With authorized `OPENAI_API_KEY` and `SARVAM_API_KEY` in the ignored `.env`, start two terminals:

```bash
API_PORT=8001 HARVESTLINK_DB=var/visual-tests.sqlite3 \
  NEGOTIATION_MODE=openai FORECAST_MODE=chronos \
  PYTHONPATH=. .venv/bin/python scripts/serve-api.py
```

```bash
cd frontend
API_TARGET=http://127.0.0.1:8001 npm run dev -- --host 127.0.0.1 --port 5174
```

Then record, narrate and assemble. FFmpeg and FFprobe must be installed:

```bash
node frontend/e2e/record-judges.mjs
.venv/bin/python scripts/narrate-demo.py
.venv/bin/python scripts/render-demo.py
```

Voice generation incurs provider usage. Audio is cached in ignored `var/demo-production`; remove an individual cached narration WAV only when intentionally regenerating that scene. Keep scene text and audio in sync. Raw footage, service audio and intermediates stay outside Git. The final MP4, subtitles, script and provenance are published.

## Presenter’s fallback

If an external service is unavailable during a live presentation, use the published recording and identify the failed service. For an offline interactive negotiation demonstration, configure `NEGOTIATION_MODE=local` and leave its local-policy label visible. Do not present fallback behavior as a successful live model call.
