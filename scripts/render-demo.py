"""Assemble recorded UI chapters and narrated audio into exactly 230 seconds."""

import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "var/demo-production"
OUT = ROOT / "docs/video"
OUT.mkdir(exist_ok=True)
scenes = json.loads((ROOT / "docs/demo/scenes.json").read_text())
timeline = json.loads((WORK / "timeline.json").read_text())
assert len(scenes) == len(timeline) == 12
assert sum(s["seconds"] for s in scenes) == 230


def run(args):
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *map(str, args)], check=True
    )


def duration(path):
    return float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ]
        )
    )


for s, t in zip(scenes, timeline):
    if os.getenv("RENDER_SCENE") and s["id"] != os.environ["RENDER_SCENE"]:
        continue
    target = s["seconds"]
    audio = WORK / (s["id"] + ".wav")
    audio_duration = duration(audio)
    voice_slot = target - 0.6 if s["id"] != "05-language" else 15.2
    tempo = max(1, audio_duration / voice_slot)
    narration = WORK / (s["id"] + "-mix.wav")
    if s["id"] == "05-language":
        native = WORK / "sarvam.wav"
        native_tempo = max(1, duration(native) / 6)
        filt = f"[0:a]atempo={tempo:.6f},apad,atrim=duration=16[a];[1:a]atempo={native_tempo:.6f},afade=t=out:st=5.7:d=0.3,apad,atrim=duration=6[b];[a][b]concat=n=2:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]"
        run(
            [
                "-i",
                audio,
                "-i",
                native,
                "-filter_complex",
                filt,
                "-map",
                "[out]",
                "-ar",
                48000,
                narration,
            ]
        )
    else:
        run(
            [
                "-i",
                audio,
                "-af",
                f"atempo={tempo:.6f},apad,atrim=duration={target},loudnorm=I=-16:TP=-1.5:LRA=11",
                "-ar",
                48000,
                narration,
            ]
        )
    capture_duration = 10 if s["id"] == "05-language" else t["duration"]
    ratio = min(1, target / capture_duration)
    timing = f"setpts={ratio:.9f}*(PTS-STARTPTS)"
    if s["id"] == "09-negotiation":
        # Shorten the provider wait, preserve a readable offer comparison, then show selection.
        timing = "setpts=PTS-STARTPTS,setpts='if(lt(T,11),0.3*T,if(lt(T,15),3.3+(T-11)*2.5,13.3+(T-15)*1.34))/TB'"
    run(
        [
            "-ss",
            t["start"],
            "-t",
            capture_duration,
            "-i",
            WORK / t.get("video", "screen.webm"),
            "-i",
            narration,
            "-vf",
            f"{timing},fps=30,tpad=stop_mode=clone:stop_duration={target},trim=duration={target},format=yuv420p",
            "-map",
            "0:v",
            "-map",
            "1:a",
            "-t",
            target,
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "22",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",
            WORK / (s["id"] + ".mp4"),
        ]
    )
    print(s["id"], "rendered", target, "seconds; voice tempo", round(tempo, 3), flush=True)
concat = WORK / "concat.txt"
concat.write_text(
    "\n".join("file '" + str(WORK / (s["id"] + ".mp4")).replace("'", "'\\''") + "'" for s in scenes)
)
run(
    [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concat,
        "-c",
        "copy",
        "-t",
        "230",
        "-metadata",
        "title=HarvestLink — A better harvest. A better deal.",
        "-metadata",
        "comment=Screen-recorded prototype. AI-generated OpenAI narration. Synthetic data; simulated payments.",
        "-movflags",
        "+faststart",
        WORK / "assembled.mp4",
    ]
)


# Readable optional subtitles; chapter text split into short phrase groups.
def stamp(sec):
    ms = round(sec * 1000)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


subtitles = []
offset = 0
for s in scenes:
    words = s["text"].split()
    chunks = [" ".join(words[i : i + 11]) for i in range(0, len(words), 11)]
    span = s["seconds"] - 0.5 if s["id"] != "05-language" else 15.2
    for i, c in enumerate(chunks):
        subtitles.append(
            f"{len(subtitles) + 1}\n{stamp(offset + i * span / len(chunks))} --> {stamp(offset + (i + 1) * span / len(chunks))}\n{c}\n"
        )
    if s["id"] == "05-language":
        subtitles.append(
            f"{len(subtitles) + 1}\n{stamp(offset + 16)} --> {stamp(offset + 22)}\n[Sarvam Kannada voice: the farmer chooses after comparing offers.]\n"
        )
    offset += s["seconds"]
(OUT / "harvestlink-demo.srt").write_text("\n".join(subtitles))
run(
    [
        "-i",
        WORK / "assembled.mp4",
        "-i",
        OUT / "harvestlink-demo.srt",
        "-map",
        "0:v",
        "-map",
        "0:a",
        "-map",
        "1:0",
        "-vf",
        "setpts=PTS-STARTPTS",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "20",
        "-af",
        "atrim=duration=230,asetpts=PTS-STARTPTS",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-c:s",
        "mov_text",
        "-metadata:s:s:0",
        "language=eng",
        "-t",
        "230",
        "-movflags",
        "+faststart",
        OUT / "harvestlink-demo.mp4",
    ]
)
assert abs(duration(OUT / "harvestlink-demo.mp4") - 230) < 0.001
shutil.copy(WORK / "voice-provenance.json", ROOT / "docs/demo/voice-provenance.json")
print("FINAL", duration(OUT / "harvestlink-demo.mp4"), "seconds")
