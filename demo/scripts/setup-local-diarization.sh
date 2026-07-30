#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEMO_DIR=$(dirname "$SCRIPT_DIR")
INSTALL_DIR="$DEMO_DIR/.local-ai/FluidAudio"
RELEASE="v0.7.12"

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
  printf '%s\n' "FluidAudio setup requires an Apple-silicon Mac." >&2
  exit 1
fi

if ! command -v swift >/dev/null 2>&1; then
  printf '%s\n' "Swift is required. Install the Xcode command-line tools first." >&2
  exit 1
fi

mkdir -p "$DEMO_DIR/.local-ai"
if [ ! -d "$INSTALL_DIR/.git" ]; then
  git clone --depth 1 --branch "$RELEASE" https://github.com/FluidInference/FluidAudio.git "$INSTALL_DIR"
fi

git -C "$INSTALL_DIR" fetch --depth 1 origin tag "$RELEASE"
git -C "$INSTALL_DIR" checkout --detach "$RELEASE"
swift build --package-path "$INSTALL_DIR" -c release --product fluidaudio

printf '%s\n' "FluidAudio diarization is ready. Models download automatically on the first recording."
