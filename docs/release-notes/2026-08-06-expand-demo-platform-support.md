# Expand demo platform support and vision preview

**Release candidate:** `Expand demo platform support and vision preview`

## Key changes

- Added explicit macOS, Linux, and Windows provider routing for the Slice 1 real-audio workflow while preserving the accepted Mac defaults.
- Added faster-whisper and pyannote adapters plus Linux and Windows setup scripts for local cross-platform transcription and speaker diarization.
- Added platform-aware readiness reporting and provider-specific setup failures without silent cloud fallback.
- Added a clearly simulated, fictional Slices 3–6 vision preview with evidence references and no external effects.
- Expanded automated coverage from 27 to 31 tests and completed a real controlled-audio Mac regression through save and reopen.

## Key files modified

- `demo/server.mjs`
- `demo/lib/platform-providers.mjs`
- `demo/lib/provider-routing.mjs`
- `demo/lib/faster-whisper-service.mjs`
- `demo/lib/pyannote-diarization-service.mjs`
- `demo/lib/python-runtime.mjs`
- `demo/local-ai/transcribe_cross_platform.py`
- `demo/local-ai/diarize_cross_platform.py`
- `demo/local-ai/requirements-cross-platform.txt`
- `demo/scripts/setup-cross-platform-ai.sh`
- `demo/scripts/setup-cross-platform-ai.ps1`
- `demo/public/index.html`
- `demo/public/app.js`
- `demo/public/styles.css`
- `demo/public/vision-data.js`
- `demo/test/demo.test.mjs`
- `demo/.env.example`
- `demo/README.md`
- `demo/LOCAL-AI-SETUP.md`
- `demo/SLICE-1-ACCEPTANCE.md`
- `docs/release-notes/2026-08-06-expand-demo-platform-support.md`

## Detailed notes

- macOS defaults to MLX Whisper, FluidAudio, and Ollama/Qwen. Linux and Windows default to faster-whisper, pyannote, and Ollama/Qwen. Explicit environment overrides remain supported.
- The health endpoint now reports the operating system, selected transcription/diarization/analysis providers, individual readiness, models, and Hugging Face token configuration state.
- Cross-platform Python adapters use isolated temporary files and normalize their output to the existing transcript and diarization contracts. The Hugging Face token is supplied through the child-process environment instead of command arguments.
- The Linux shell and Windows PowerShell installers create a dedicated cross-platform Python environment and verify both adapters. The documentation records FFmpeg, Python, model-agreement, token, privacy, and clean-machine requirements.
- The user interface reports platform-specific provider readiness and uses platform-neutral privacy wording.
- The vision workspace presents fictional examples for session intelligence, relationship memory, approval-gated follow-through, and conference reporting. It is explicitly labelled as simulated, saves nothing, synchronizes nothing, and creates no external action.
- The historical 94/100 Slice 1 acceptance remains specific to Apple-silicon Mac. Linux and Windows require controlled-fixture and critical-gate runs on their actual environments before cross-platform acceptance.

## Verification

- `cd demo && npm test` — passed, 31/31 tests.
- `node --check server.mjs` — passed.
- `node --check lib/faster-whisper-service.mjs` — passed.
- `node --check lib/pyannote-diarization-service.mjs` — passed.
- `node --check lib/platform-providers.mjs` — passed.
- `node --check lib/provider-routing.mjs` — passed.
- `node --check public/app.js` — passed.
- `python3 -m py_compile local-ai/transcribe_cross_platform.py local-ai/diarize_cross_platform.py` — passed.
- `sh -n scripts/setup-cross-platform-ai.sh` — passed.
- `git diff --check` — passed.
- Browser controlled-fixture regression on macOS — passed real 2:12 audio upload, MLX transcription, FluidAudio diarization, Qwen analysis, review, save, list, and reopen with no browser warnings or errors.
- Linux real-audio acceptance — not run; requires Shayeez's Linux environment, dependency installation, scoped Hugging Face token, and controlled-fixture execution.
- Windows setup-script and real-audio acceptance — not run; requires an actual Windows environment.

## Explicitly designated release-note strings or quotations

None requested.
