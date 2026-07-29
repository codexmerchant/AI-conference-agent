# Free Local AI Setup — macOS

This is the running setup guide for processing Slice 1 recordings locally, without an OpenAI API key or per-recording API charges.

The planned local pipeline is:

`Audio → SenseVoice transcription → Qwen3 analysis → Review and save`

Local Qwen3 setup and demo analysis have been verified on an Apple M3 Mac with 18 GB of unified memory. SenseVoice transcription will be added to this guide as it is implemented and verified.

## 1. Check whether Ollama is installed and running

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

## 2. Start Ollama

For a Homebrew installation, start the server in the current terminal:

```bash
ollama serve
```

Keep that terminal open. Alternatively, run it as a background service that starts automatically:

```bash
brew services start ollama
```

For the graphical installation, open **Ollama** from the Applications folder and look for its menu-bar icon.

## 3. Download and run Qwen3 8B

The default Qwen3 Ollama package is approximately 5.2 GB and is suitable for an M3 Mac with 18 GB of memory:

```bash
ollama run qwen3
```

When the `>>>` prompt appears, the model is ready.

## 4. Test clean JSON output

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

## 5. Verify the local API

```bash
curl http://localhost:11434/api/tags
```

The response should include `qwen3:latest`. Ollama must be running whenever the demo uses local analysis.

## Current status

- [x] Ollama server running locally
- [x] Qwen3 8B downloaded and tested
- [x] Qwen3 connected to the Slice 1 demo
- [ ] SenseVoice installed and tested
- [ ] SenseVoice connected to the Slice 1 demo
- [ ] Complete local recording workflow browser-tested

## How the demo uses Qwen3 now

The demo checks `http://127.0.0.1:11434/api/tags` for the configured model. When Qwen3 is available, real-processing requests use it for structured transcript analysis with:

- `think: false`
- `stream: false`
- temperature `0`
- the Slice 1 JSON schema supplied through Ollama's `format` field

The demo health indicator reports **Local qwen3 ready · transcription setup next** when Qwen is ready but local transcription has not been installed. At this stage, processing an uploaded recording still requires OpenAI transcription. SenseVoice integration will remove that final API-key requirement.

Optional configuration values are listed in `.env.example`. The defaults work with a standard local Ollama installation and the `qwen3` model.

## Troubleshooting

### `ollama server not responding - could not find ollama app`

The CLI is installed but no server is running. Start `ollama serve`, start the Homebrew service, or install/open the graphical Ollama application.

### `Warning: could not connect to a running Ollama instance`

The versioned client is present, but the background server is stopped. Start it using one of the methods in Step 2.

### Qwen prints a long `Thinking...` section

Use `/set nothink` inside an interactive session. The demo will send `think: false` through the local chat API.
