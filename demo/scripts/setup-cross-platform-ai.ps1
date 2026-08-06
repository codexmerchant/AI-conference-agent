$ErrorActionPreference = "Stop"

$DemoDirectory = Split-Path -Parent $PSScriptRoot
$VirtualEnvironment = Join-Path $DemoDirectory ".venv-cross-platform"
$Requirements = Join-Path $DemoDirectory "local-ai\requirements-cross-platform.txt"
$Python = Join-Path $VirtualEnvironment "Scripts\python.exe"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw "Python 3.10 or newer is required."
}
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "FFmpeg is required and must be available on PATH."
}

python -m venv $VirtualEnvironment
& $Python -m pip install --upgrade pip
& $Python -m pip install -r $Requirements
& $Python (Join-Path $DemoDirectory "local-ai\transcribe_cross_platform.py") --health
& $Python (Join-Path $DemoDirectory "local-ai\diarize_cross_platform.py") --health

Write-Host "Cross-platform audio dependencies are installed. Set HUGGINGFACE_TOKEN after accepting access to the configured pyannote model."
