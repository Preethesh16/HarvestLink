# HarvestLink — 3 minutes, 50 seconds

[Watch the narrated screen recording](video/harvestlink-demo.mp4) · [Optional English subtitles](video/harvestlink-demo.srt) · [Exact narration script](demo/scenes.json)

The film follows one farmer and The Green Table, with two additional restaurant offers. The farmer uploads the actual `demo-data/farmer-harvest.xlsx` workbook, inspects its preview and imports every row before opening the separate mandi report. It records the working application using synthetic accounts and histories. All payments are simulated. Local computation and service waits are shortened to fit the chapters; session changes are edited between perspectives. The Kannada chapter uses six seconds of English introduction followed by fourteen seconds for the full natural-speed Sarvam response, held against the actual captured Kannada answer. Long measured provider waits are removed; the recorded replay and delivery animation remain actual application interactions.

## Chapter guide

| Time | Screen / story |
| --- | --- |
| 00:00–00:12 | HarvestLink · From harvest to a human-approved deal |
| 00:12–00:26 | 01 / FARMER · A private workspace |
| 00:26–00:48 | Actual Excel workbook → preview → every validated harvest row |
| 00:48–01:02 | Separate mandi report · Source, date and units stay visible |
| 01:02–01:16 | The farmer sets the boundaries |
| 01:16–01:36 | Kannada workspace · Madhu with actual Sarvam speech |
| 01:36–01:54 | Next-crop planning · Explainable scenarios |
| 01:54–02:16 | 02 / RESTAURANT · Forecast consumption, account for expiry |
| 02:16–02:32 | Buyer limits → an approved purchase requirement |
| 02:32–03:00 | Actual AI offers · Replay, price chart and farmer choice |
| 03:00–03:22 | Mutual agreement → stock reservation → simulated escrow |
| 03:22–03:44 | Leaflet delivery simulation · Receipt and settlement |
| 03:44–03:50 | HarvestLink · Better-informed trade. Human decisions. |

## Narration and provenance

- **English narration:** OpenAI `gpt-realtime-2.1`, **Marin**, generated through the Realtime WebSocket API on 21 October 2026. This is an AI-generated voice, not a human recording.
- **Kannada response:** the actual audio returned by the application’s Sarvam `bulbul:v3` integration when the recorded farmer asks Madhu for guidance.
- The current [OpenAI speech guide](https://developers.openai.com/api/docs/guides/text-to-speech) points new integrations toward Realtime. Model availability was checked on the configured account before generation. The [Realtime conversation guide](https://developers.openai.com/api/docs/guides/realtime-conversations) documents audio output and event handling.
- [Scene text and timing](demo/scenes.json) and [voice metadata](demo/voice-provenance.json) accompany the artifact. Modest pitch-preserving speech timing adjustments align narration to chapters. The recording includes visible AI-voice and demo-data disclosure.
- [Recorded workflow evidence](demo/workflow-evidence.json) lists the three actual generated offers and settled order. The recorder exercises actual UI actions, including the real XLSX upload, recorded negotiation replay and price chart, agreement confirmation, simulated escrow funding, Leaflet delivery playback, receipt and settlement. No API response mocks are used. The capture backend runs OpenAI negotiation and actual local Chronos inference. The underlying data is still synthetic.
- The Leaflet map shows an **illustrative delivery route and simulated vehicle movement**, not live road routing, GPS or courier tracking. The separate mandi report displays 24 cached government records dated 19 October, with source provenance and unit cautions; it is not a continuously live feed. Crop planning is a scenario, not an agricultural prescription. These boundaries are stated in the narration.

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

Voice generation incurs provider usage. Audio is cached in ignored `var/demo-production`; each scene has a text hash so script changes regenerate only the changed narration. Keep scene text and audio in sync. Raw footage, service audio and intermediates stay outside Git. The final MP4, subtitles, script and provenance are published.

## Presenter’s fallback

If an external service is unavailable during a live presentation, use the published recording and identify the failed service. For an offline interactive negotiation demonstration, configure `NEGOTIATION_MODE=local` and leave its local-policy label visible. Do not present fallback behavior as a successful live model call.

Price narration revision: the mandi chapter now describes **original government-published Agmarknet prices**, while retaining the 19 October reporting date. This wording distinguishes real source data from the synthetic demo inventory without claiming a continuous real-time feed.
