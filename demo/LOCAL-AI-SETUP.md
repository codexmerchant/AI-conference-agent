# Free Local AI Setup — macOS

This is the running setup guide for processing Slice 1 recordings locally, without an OpenAI API key or per-recording API charges.

The intended local pipeline is:

`Audio → MLX Whisper transcription → Qwen3 analysis → Review and save`

Local MLX Whisper transcription and Qwen3 analysis have been verified on an Apple M3 Mac with 18 GB of unified memory. The default workflow does not silently fall back to a paid provider.

## 1. Install MLX Whisper

From the demo directory, run:

```bash
sh scripts/setup-local-transcription.sh
```

The script verifies Apple silicon and FFmpeg, creates an isolated `.venv`, installs the pinned MLX Whisper package, and checks that it can load. The multilingual `mlx-community/whisper-large-v3-turbo` model downloads automatically on the first real transcription and is cached for later use.

## 2. Check whether Ollama is installed and running

Ollama and OpenClaw are separate applications. Run:

```bash
which ollama
ollama --version
ls -d /Applications/Ollama.app 2>/dev/null
pgrep -fl Ollama
```

Interpretation:

- A path from `which ollama` means the command-line client is installed.
- A version warning that it cannot connect means the client exists but the local server is stopped.
- `/Applications/Ollama.app` means the graphical Mac application is installed.
- Output from `pgrep` means the Mac application/server process is running.

## 3. Start Ollama

For a Homebrew installation, start the server in the current terminal:

```bash
ollama serve
```

Keep that terminal open. Alternatively, run it as a background service that starts automatically:

```bash
brew services start ollama
```

For the graphical installation, open **Ollama** from the Applications folder and look for its menu-bar icon.

## 4. Download and run Qwen3 8B

The default Qwen3 Ollama package is approximately 5.2 GB and is suitable for an M3 Mac with 18 GB of memory:

```bash
ollama run qwen3
```

When the `>>>` prompt appears, the model is ready.

## 5. Test clean JSON output

Inside the interactive prompt, enter this command on its own line:

```text
/set nothink
```

Ollama should respond with `Set 'nothink' mode.` Then enter:

```text
Return only valid JSON: {"status":"working","model":"qwen3"}
```

Use `/set nothink`, not `/nothink`. A `...` prompt means Ollama is collecting a multiline message rather than executing a command.

Exit the interactive session with:

```text
/bye
```

The demo integration will also set `think: false` and request JSON through Ollama's local API instead of relying on the interactive setting.

## 6. Verify the local API

```bash
curl http://localhost:11434/api/tags
```

The response should include `qwen3:latest`. Ollama must be running whenever the demo uses local analysis.

## Current status

- [x] Ollama server running locally
- [x] Qwen3 8B downloaded and tested
- [x] Qwen3 connected to the Slice 1 demo
- [x] MLX Whisper approved as the local transcription provider
- [x] MLX Whisper installed and smoke-tested
- [x] MLX Whisper connected to the Slice 1 demo
- [x] Complete local recording workflow browser-tested with a synthetic WAV fixture

## Local transcription provider comparison

### Selected provider: MLX Whisper

MLX Whisper was selected for this Mac because it is built for Apple silicon, installs as a Python package, exposes both a command-line interface and Python API, accepts common audio through FFmpeg, and supports word-level timestamps. The demo uses multilingual Whisper `large-v3-turbo`, which OpenAI describes as a substantially faster version of `large-v3` with minimal accuracy degradation for transcription.

The local smoke test correctly transcribed the full synthetic sentence but rendered “Northstar” as “Northster.” Representative conference recordings should still be evaluated for names, companies, technical terms, accents, noise, overlapping speech, processing time, and memory use.

### Other candidates

- **whisper.cpp** — Best portability and simplest eventual native/mobile path. It is dependency-light, treats Apple silicon as a first-class platform, supports Metal and Core ML, quantization, VAD, and a local HTTP server. Its build and audio-normalization workflow is more involved than MLX Whisper for the current Node demo.
- **SenseVoice** — Attractive for very fast transcription, Mandarin/Cantonese performance, language identification, emotion, and audio-event tags. The released checkpoint supports Mandarin, Cantonese, English, Japanese, and Korean. Those extra capabilities are not current Slice 1 requirements, and its English conference accuracy on this project's recordings has not been established.
- **faster-whisper** — Mature and efficient, with VAD and timestamps, but its documented GPU acceleration targets NVIDIA CUDA. It can run on the Mac CPU but does not use Apple silicon as directly as MLX Whisper or whisper.cpp.
- **OpenAI Whisper Python** — The reference implementation and a useful quality baseline, but heavier and less Apple-specific than MLX Whisper.

Primary sources:

- [Apple MLX Whisper documentation](https://github.com/ml-explore/mlx-examples/tree/main/whisper)
- [OpenAI Whisper documentation](https://github.com/openai/whisper)
- [whisper.cpp documentation](https://github.com/ggml-org/whisper.cpp)
- [faster-whisper documentation](https://github.com/SYSTRAN/faster-whisper)
- [SenseVoice documentation](https://github.com/QwenAudio/SenseVoice)

## How the demo uses Qwen3 now

The demo checks `http://127.0.0.1:11434/api/tags` for the configured model. When Qwen3 is available, real-processing requests use it for structured transcript analysis with:

- `think: false`
- `stream: false`
- temperature `0`
- the Slice 1 JSON schema supplied through Ollama's `format` field

The demo health indicator reports **Fully local · MLX Whisper + qwen3** when both providers are available. If either is missing, it identifies the required local setup step. OpenAI is never selected automatically.

Optional configuration values are listed in `.env.example`. The defaults work with a standard local Ollama installation and the `qwen3` model.

## Troubleshooting

### `ollama server not responding - could not find ollama app`

The CLI is installed but no server is running. Start `ollama serve`, start the Homebrew service, or install/open the graphical Ollama application.

### `Warning: could not connect to a running Ollama instance`

The versioned client is present, but the background server is stopped. Start it using one of the methods in Step 2.

### Qwen prints a long `Thinking...` section

Use `/set nothink` inside an interactive session. The demo will send `think: false` through the local chat API.
