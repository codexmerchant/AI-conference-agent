import argparse
import json
from pathlib import Path


def load_whisper_engine():
    # 1. Try mlx_whisper (macOS Apple Silicon)
    try:
        import mlx_whisper
        return "mlx", mlx_whisper
    except ImportError:
        pass

    # 2. Try faster-whisper (cross-platform, fast)
    try:
        from faster_whisper import WhisperModel
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        return "faster-whisper", (WhisperModel, device, compute_type)
    except ImportError:
        pass

    # 3. Try standard openai-whisper (cross-platform)
    try:
        import whisper
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        return "whisper", (whisper, device)
    except ImportError as error:
        raise RuntimeError(
            "No compatible whisper library (mlx-whisper, faster-whisper, or openai-whisper) is installed."
        ) from error


def main():
    parser = argparse.ArgumentParser(description="Local Whisper adapter for the demo")
    parser.add_argument("--health", action="store_true")
    parser.add_argument("--input")
    parser.add_argument("--output")
    parser.add_argument("--model", default="mlx-community/whisper-large-v3-turbo")
    args = parser.parse_args()

    engine_type, engine = load_whisper_engine()
    if args.health:
        print(json.dumps({"ready": True, "engine": engine_type}))
        return

    if not args.input or not args.output:
        parser.error("--input and --output are required for transcription")

    if engine_type == "mlx":
        mlx_whisper = engine
        result = mlx_whisper.transcribe(args.input, path_or_hf_repo=args.model)
        text = str(result.get("text", "")).strip()
        segments = [
            {
                "id": index,
                "start": segment.get("start"),
                "end": segment.get("end"),
                "text": str(segment.get("text", "")).strip(),
            }
            for index, segment in enumerate(result.get("segments", []))
            if str(segment.get("text", "")).strip()
        ]
    elif engine_type == "faster-whisper":
        WhisperModelClass, device, compute_type = engine
        model_name = args.model
        if "whisper-large-v3-turbo" in model_name:
            model_name = "large-v3-turbo"
        elif "whisper-" in model_name:
            model_name = model_name.split("/")[-1].replace("whisper-", "")

        model = WhisperModelClass(model_name, device=device, compute_type=compute_type)
        segments_raw, info = model.transcribe(args.input, beam_size=5)
        segments_list = list(segments_raw)
        text = " ".join([s.text.strip() for s in segments_list]).strip()
        segments = [
            {
                "id": index,
                "start": s.start,
                "end": s.end,
                "text": s.text.strip()
            }
            for index, s in enumerate(segments_list)
            if s.text.strip()
        ]
    elif engine_type == "whisper":
        whisper_module, device = engine
        model_name = args.model
        if "whisper-large-v3-turbo" in model_name:
            model_name = "turbo"
        elif "whisper-" in model_name:
            model_name = model_name.split("/")[-1].replace("whisper-", "")

        model = whisper_module.load_model(model_name, device=device)
        result = model.transcribe(args.input)
        text = str(result.get("text", "")).strip()
        segments = [
            {
                "id": index,
                "start": segment.get("start"),
                "end": segment.get("end"),
                "text": str(segment.get("text", "")).strip(),
            }
            for index, segment in enumerate(result.get("segments", []))
            if str(segment.get("text", "")).strip()
        ]

    if not text:
        raise RuntimeError(f"{engine_type} Whisper returned an empty transcript")

    Path(args.output).write_text(
        json.dumps({
            "text": text,
            "segments": segments,
        }, ensure_ascii=False),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
