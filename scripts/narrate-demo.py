"""Generate AI-disclosed demo narration via OpenAI Realtime (requires websockets)."""

import asyncio
import base64
import json
import os
import wave
from pathlib import Path

import websockets

ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.strip().split("=", 1)
        os.environ.setdefault(k, v.strip("\"'"))
OUT = ROOT / "var/demo-production"
OUT.mkdir(parents=True, exist_ok=True)
MODEL = os.getenv("NARRATION_MODEL", "gpt-realtime-2.1")


async def narrate(scene):
    dst = OUT / (scene["id"] + ".wav")
    if dst.exists():
        return
    async with websockets.connect(
        "wss://api.openai.com/v1/realtime?model=" + MODEL,
        additional_headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"]},
        max_size=16000000,
    ) as ws:
        await ws.send(
            json.dumps(
                {
                    "type": "session.update",
                    "session": {
                        "type": "realtime",
                        "output_modalities": ["audio"],
                        "audio": {
                            "output": {
                                "format": {"type": "audio/pcm", "rate": 24000},
                                "voice": "marin",
                            }
                        },
                        "instructions": "You are a warm, clear documentary narrator. Speak natural English with a light Indian English pronunciation. Read the supplied script exactly, without introduction, commentary, or additions. Confident but conversational, around 155 words per minute. Do not rush. This audio will be disclosed as AI generated.",
                    },
                }
            )
        )
        await ws.send(
            json.dumps(
                {
                    "type": "conversation.item.create",
                    "item": {
                        "type": "message",
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": "Read exactly:\n" + scene["text"]}
                        ],
                    },
                }
            )
        )
        await ws.send(json.dumps({"type": "response.create"}))
        chunks = []
        transcript = ""
        async for raw in ws:
            e = json.loads(raw)
            if e["type"] == "error":
                raise RuntimeError(e["error"].get("message", "Voice API error"))
            if e["type"] == "response.output_audio.delta":
                chunks.append(base64.b64decode(e["delta"]))
            if e["type"] == "response.output_audio_transcript.delta":
                transcript += e["delta"]
            if e["type"] == "response.done":
                if e["response"]["status"] != "completed":
                    raise RuntimeError("Narration did not complete")
                break
        if not chunks:
            raise RuntimeError("No audio received")
        pcm = b"".join(chunks)
        with wave.open(str(dst), "wb") as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(24000)
            f.writeframes(pcm)
        (OUT / (scene["id"] + ".txt")).write_text(transcript)
        print(scene["id"], round(len(pcm) / 48000, 2), "seconds", flush=True)


async def main():
    for scene in json.loads((ROOT / "docs/demo/scenes.json").read_text()):
        await narrate(scene)
    (OUT / "voice-provenance.json").write_text(
        json.dumps(
            {
                "provider": "OpenAI",
                "model": MODEL,
                "voice": "marin",
                "api": "Realtime WebSocket",
                "disclosure": "AI-generated narration",
            },
            indent=2,
        )
    )


asyncio.run(main())
