#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEMO_DIR=$(dirname "$SCRIPT_DIR")
VENV_DIR="$DEMO_DIR/.venv"

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
  printf '%s\n' "MLX Whisper setup requires an Apple-silicon Mac." >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  printf '%s\n' "FFmpeg is required. Install it with: brew install ffmpeg" >&2
  exit 1
fi

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r "$DEMO_DIR/local-ai/requirements.txt"
"$VENV_DIR/bin/python" "$DEMO_DIR/local-ai/transcribe.py" --health

printf '%s\n' "MLX Whisper is ready. The model downloads automatically on the first transcription."
