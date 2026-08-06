#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEMO_DIR=$(dirname "$SCRIPT_DIR")
VENV_DIR="$DEMO_DIR/.venv-cross-platform"

if [ "$(uname -s)" != "Linux" ]; then
  printf '%s\n' "This setup script is for Linux. Use setup-cross-platform-ai.ps1 on Windows." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' "Python 3.10 or newer is required." >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  printf '%s\n' "FFmpeg is required. Install it with your Linux package manager." >&2
  exit 1
fi

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r "$DEMO_DIR/local-ai/requirements-cross-platform.txt"
"$VENV_DIR/bin/python" "$DEMO_DIR/local-ai/transcribe_cross_platform.py" --health
"$VENV_DIR/bin/python" "$DEMO_DIR/local-ai/diarize_cross_platform.py" --health

printf '%s\n' "Cross-platform audio dependencies are installed. Set HUGGINGFACE_TOKEN after accepting access to the configured pyannote model."
