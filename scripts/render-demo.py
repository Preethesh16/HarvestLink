"""Assemble recorded UI chapters and narrated audio into exactly 230 seconds."""

import hashlib
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "var/demo-production"
OUT = ROOT / "docs/video"
OUT.mkdir(exist_ok=True)
scenes = json.loads((ROOT / "docs/demo/scenes.json").read_text())
timeline = json.loads((WORK / "timeline.json").read_text())
assert len(scenes) == len(timeline)
assert [s["id"] for s in scenes] == [t["id"] for t in timeline]
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
    voice_slot = target - 0.6 if s["id"] != "06-language" else 5.4
    tempo = max(1, audio_duration / voice_slot)
    narration = WORK / (s["id"] + "-mix.wav")
    if s["id"] == "06-language":
        native = WORK / "sarvam.wav"
        native_tempo = 1  # Full natural-speed native response.
        filt = f"[0:a]atempo={tempo:.6f},apad,atrim=duration=6[a];[1:a]atempo={native_tempo:.6f},afade=t=out:st=13.7:d=0.3,apad,atrim=duration=14[b];[a][b]concat=n=2:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]"
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
    capture_duration = t["duration"]
    keeps = t.get("keeps", [[0, capture_duration]])
    kept_duration = sum(b - a for a, b in keeps)
    ratio = min(1, target / kept_duration)
    trims = ";".join(
        f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}]" for i, (a, b) in enumerate(keeps)
    )
    inputs = "".join(f"[v{i}]" for i in range(len(keeps)))
    lead = target - 14 if s["id"] == "06-language" else target
    ratio = min(1, lead / kept_duration)
    timing = f"{trims};{inputs}concat=n={len(keeps)}:v=1:a=0[joined];[joined]setpts={ratio:.9f}*(PTS-STARTPTS),fps=30,tpad=stop_mode=clone:stop_duration={lead},trim=duration={lead},format=yuv420p"
    extra_inputs = []
    if s["id"] == "06-language":
        # Hold the actual captured Kannada answer during the service's voice excerpt.
        extra_inputs = ["-loop", "1", "-i", ROOT / "docs/images/kannada-workspace.png"]
        timing += "[lead];[2:v]scale=1440:1000:force_original_aspect_ratio=decrease,pad=1440:1000:(ow-iw)/2:(oh-ih)/2:color=0x102e24,setsar=1,fps=30,trim=duration=14,setpts=PTS-STARTPTS,format=yuv420p[hold];[lead][hold]concat=n=2:v=1:a=0[outv]"
    else:
        timing += "[outv]"
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
            *extra_inputs,
            "-filter_complex",
            timing,
            "-map",
            "[outv]",
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
    span = s["seconds"] - 0.5 if s["id"] != "06-language" else 5.4
    for i, c in enumerate(chunks):
        subtitles.append(
            f"{len(subtitles) + 1}\n{stamp(offset + i * span / len(chunks))} --> {stamp(offset + (i + 1) * span / len(chunks))}\n{c}\n"
        )
    if s["id"] == "06-language":
        subtitles.append(
            f"{len(subtitles) + 1}\n{stamp(offset + 6)} --> {stamp(offset + 20)}\n[Actual Sarvam Kannada response: guidance on comparing buyer offers.]\n"
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

# Preserve machine-checkable evidence for the exact published file.
video = OUT / "harvestlink-demo.mp4"
verification = json.loads(
    subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_name,width,height,start_time,duration:format=duration,size",
            "-of",
            "json",
            str(video),
        ]
    )
)
verification["sha256"] = hashlib.sha256(video.read_bytes()).hexdigest()
verification["chapters"] = len(scenes)
verification["narration_checks"] = []
for scene in scenes:

    def normalize(text):
        return re.sub(r"[^a-z0-9]+", "", text.lower())

    transcript = (WORK / (scene["id"] + ".txt")).read_text()
    matches = normalize(transcript) == normalize(scene["text"])
    assert matches, "Narration transcript differs: " + scene["id"]
    verification["narration_checks"].append(
        {"scene": scene["id"], "normalized_script_matches": matches}
    )
verification["sarvam_response_seconds"] = duration(WORK / "sarvam.wav")
verification["sarvam_presentation"] = "Full natural-speed response in a fourteen-second slot"
(ROOT / "docs/demo/media-verification.json").write_text(json.dumps(verification, indent=2) + "\n")
