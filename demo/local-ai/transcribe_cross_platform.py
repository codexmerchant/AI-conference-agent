import argparse
import json
from pathlib import Path


def load_faster_whisper():
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise RuntimeError("faster-whisper is not installed. Run the cross-platform AI setup for this operating system.") from error
    return WhisperModel


def main():
    parser = argparse.ArgumentParser(description="Cross-platform faster-whisper adapter")
    parser.add_argument("--health", action="store_true")
    parser.add_argument("--input")
    parser.add_argument("--output")
    parser.add_argument("--model", default="large-v3-turbo")
    args = parser.parse_args()
    whisper_model = load_faster_whisper()
    if args.health:
        print(json.dumps({"ready": True}))
        return
    if not args.input or not args.output:
        parser.error("--input and --output are required")
    model = whisper_model(args.model, device="auto", compute_type="default")
    generated, _ = model.transcribe(args.input, vad_filter=True)
    segments = [
        {"id": index, "start": float(segment.start), "end": float(segment.end), "text": segment.text.strip()}
        for index, segment in enumerate(generated)
        if segment.text.strip()
    ]
    text = " ".join(segment["text"] for segment in segments).strip()
    if not text:
        raise RuntimeError("faster-whisper returned an empty transcript")
    Path(args.output).write_text(json.dumps({"text": text, "segments": segments}, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
