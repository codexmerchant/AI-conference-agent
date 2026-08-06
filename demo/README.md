# AI Conference Agent — First-Slice Demo

This runnable demo implements the first vertical slice described in the product planning:

1. Create a conference interaction.
2. Upload or select a sample audio conversation.
3. Generate a speaker-labelled transcript.
4. Extract a contact and topics.
5. Generate an editable summary and action items.
6. Generate an editable follow-up draft.
7. Save the interaction and reopen it later.

The demo has two explicit modes:

- **Real uploaded-audio processing:** securely stores the file in the local demo workspace, transcribes it with MLX Whisper, separates voices with FluidAudio, and generates schema-constrained interaction intelligence with local Qwen3.
- **Clearly labeled sample workflow:** returns deterministic Maya Chen sample data and requires no API key.

The accepted Mac pipeline uses MLX Whisper, FluidAudio speaker diarization, and Qwen3. Linux and Windows use the same application contract through faster-whisper, pyannote, and Qwen3. Follow the continuously updated [local AI setup guide](LOCAL-AI-SETUP.md) for installation and troubleshooting.

See the [local AI validation record](LOCAL-AI-VALIDATION.md) for the controlled fictional fixture, measured MLX accuracy, failed intermediate approaches, final diarized result, and reproduction steps.

Slice 1 is accepted at 94/100 with all nine critical gates passing and 27 automated tests. The [acceptance record](SLICE-1-ACCEPTANCE.md) contains the weighted scorecard, gates, fixtures, and final evidence.

## Run

Requires Node.js 20 or newer. On an Apple-silicon Mac, install the accepted local pipeline:

```bash
cd demo
sh scripts/setup-local-transcription.sh
sh scripts/setup-local-diarization.sh
```

On Linux, install FFmpeg and Python 3.10 or newer, then run:

```bash
cd demo
sh scripts/setup-cross-platform-ai.sh
```

On Windows, install FFmpeg and Python 3.10 or newer, then run from PowerShell:

```powershell
cd demo
.\scripts\setup-cross-platform-ai.ps1
```

Linux and Windows default to `faster-whisper` transcription and `pyannote` diarization. Accept the `pyannote/speaker-diarization-community-1` model agreement, create a scoped Hugging Face token, and set `HUGGINGFACE_TOKEN` in the server environment. Do not commit that token. pyannote metrics are disabled by the adapter unless explicitly overridden.

Start Ollama and ensure `qwen3` is installed, then run the demo:

```bash
cd demo
npm run dev
```

The MLX model downloads automatically on the first real transcription and is reused afterward. No API key is required. OpenAI processing remains available only when explicitly selected:

```bash
export OPENAI_API_KEY="your-project-api-key"
export TRANSCRIPTION_PROVIDER=openai
export ANALYSIS_PROVIDER=openai
npm run dev
```

Do not paste the key into the application or commit it to the repository. Optional model overrides are documented in `.env.example`; the server intentionally does not load `.env` files without an explicit environment loader.

Open <http://localhost:4173>. Upload an MP3, MP4, MPEG, MPGA, M4A, WAV, or WebM file up to 25 MB, confirm permission to process it, and choose **Transcribe & analyze**. To evaluate the interface without credentials or API usage, choose **Run clearly labeled sample**.

Choose **Vision preview** in the sidebar to explore a clearly simulated Slices 3–6 product concept covering session intelligence, relationship memory, approval-gated follow-through, and conference reporting. The preview uses fictional static data, does not send or synchronize anything, does not save changes, and is not evidence that those later slices are implemented or accepted.

Saved interactions are written to `demo/.data/interactions.json`. Uploaded audio is stored under opaque identifiers in `demo/.data/uploads/`. The entire `.data` directory is excluded from Git.

## Test

```bash
cd demo
npm test
```

## Demo boundaries

Included:

- Audio selection and local preview
- Real audio upload and local storage
- Local MLX Whisper file transcription
- Local FluidAudio within-recording speaker diarization and speaker-labelled transcript
- Local faster-whisper and pyannote adapters for Linux and Windows
- Schema-constrained local Qwen3 contact, topic, summary, action-item, and follow-up extraction
- Explicitly configured OpenAI transcription and analysis alternatives
- Visible staged processing
- Consent confirmation before real processing
- Clear errors and retry controls
- Editable generated artifacts
- Human-review warning
- Action completion and editing
- Local API persistence and reopen
- Responsive desktop/mobile-web layout
- Clearly labelled, fictional Slices 3–6 vision preview with source-reference and approval-boundary examples

Not yet included:

- Native SwiftUI capture
- Live/background recording
- Authentication or multi-user isolation
- External messaging or integrations
- Functional Slice 3–6 workflows, persistence, synchronization, or reporting pipelines
- Production database, queue, or cloud deployment

## Data and safety boundary

- With the default provider settings, audio and transcripts remain local through MLX Whisper/FluidAudio on macOS or faster-whisper/pyannote on Linux and Windows, followed by Qwen3.
- FluidAudio voice embeddings are used only to separate speakers within the current recording and are not persisted by the demo.
- The Qwen request disables thinking, streaming, and temperature variation while enforcing the interaction JSON schema.
- OpenAI receives data only when the corresponding provider is explicitly set to `openai`; there is no automatic paid fallback.
- The Responses API request sets `store: false`.
- AI-generated information must be reviewed before use.
- The local demo is single-user and must not be exposed to an untrusted network.
- Production use still requires authentication, encryption-key management, retention/deletion controls, audit logging, and a security/privacy review.
