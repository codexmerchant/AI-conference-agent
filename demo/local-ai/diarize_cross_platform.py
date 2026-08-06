import argparse
import json
import os
import time
from pathlib import Path


def load_pipeline():
    os.environ.setdefault("PYANNOTE_METRICS_ENABLED", "0")
    try:
        from pyannote.audio import Pipeline
    except ImportError as error:
        raise RuntimeError("pyannote.audio is not installed. Run the cross-platform AI setup for this operating system.") from error
    return Pipeline


def main():
    parser = argparse.ArgumentParser(description="Cross-platform pyannote diarization adapter")
    parser.add_argument("--health", action="store_true")
    parser.add_argument("--input")
    parser.add_argument("--output")
    parser.add_argument("--model", default="pyannote/speaker-diarization-community-1")
    args = parser.parse_args()
    pipeline_class = load_pipeline()
    if args.health:
        print(json.dumps({"installed": True}))
        return
    token = os.environ.get("HUGGINGFACE_TOKEN")
    if not args.input or not args.output or not token:
        parser.error("--input, --output, and HUGGINGFACE_TOKEN are required")
    started = time.monotonic()
    pipeline = pipeline_class.from_pretrained(args.model, token=token)
    output = pipeline(args.input)
    diarization = getattr(output, "exclusive_speaker_diarization", None) or getattr(output, "speaker_diarization", output)
    if hasattr(diarization, "itertracks"):
        tracks = ((turn, speaker) for turn, _, speaker in diarization.itertracks(yield_label=True))
    else:
        tracks = iter(diarization)
    segments = [
        {"speakerId": str(speaker), "start": float(turn.start), "end": float(turn.end)}
        for turn, speaker in tracks
        if turn.end > turn.start
    ]
    Path(args.output).write_text(json.dumps({
        "segments": segments,
        "processingTimeSeconds": time.monotonic() - started,
    }), encoding="utf-8")


if __name__ == "__main__":
    main()
