import argparse
import json
from pathlib import Path


def load_mlx_whisper():
    try:
        import mlx_whisper
    except ImportError as error:
        raise RuntimeError(
            "MLX Whisper is not installed. Run ./scripts/setup-local-transcription.sh from the demo directory."
        ) from error
    return mlx_whisper


def main():
    parser = argparse.ArgumentParser(description="Local MLX Whisper adapter for the demo")
    parser.add_argument("--health", action="store_true")
    parser.add_argument("--input")
    parser.add_argument("--output")
    parser.add_argument("--model", default="mlx-community/whisper-large-v3-turbo")
    args = parser.parse_args()

    mlx_whisper = load_mlx_whisper()
    if args.health:
        print(json.dumps({"ready": True}))
        return

    if not args.input or not args.output:
        parser.error("--input and --output are required for transcription")

    result = mlx_whisper.transcribe(args.input, path_or_hf_repo=args.model)
    text = str(result.get("text", "")).strip()
    if not text:
        raise RuntimeError("MLX Whisper returned an empty transcript")

    Path(args.output).write_text(
        json.dumps({"text": text}, ensure_ascii=False),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
