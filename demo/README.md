# AI Conference Agent — First-Slice Demo

This runnable demo implements the first vertical slice described in the product planning:

1. Create a conference interaction.
2. Upload or select a sample audio conversation.
3. Generate a simulated transcript.
4. Extract a contact and topics.
5. Generate an editable summary and action items.
6. Generate an editable follow-up draft.
7. Save the interaction and reopen it later.

The demo has two explicit modes:

- **Real uploaded-audio processing:** securely stores the file in the local demo workspace, transcribes it locally with MLX Whisper, and generates schema-constrained interaction intelligence with local Qwen3.
- **Clearly labeled sample workflow:** returns deterministic Maya Chen sample data and requires no API key.

MLX Whisper local transcription and Qwen3 local analysis are integrated. Follow the continuously updated [local AI setup guide](LOCAL-AI-SETUP.md) for verified Mac installation and troubleshooting steps.

See the [local AI validation record](LOCAL-AI-VALIDATION.md) for the controlled fictional fixture, measured MLX accuracy, Qwen extraction results, known failures, and reproduction steps.

Slice 1 completion is governed by the [acceptance standard](SLICE-1-ACCEPTANCE.md), including its weighted scorecard, critical failure gates, required fixtures, and evidence requirements.

## Run

Requires Node.js 20 or newer on an Apple-silicon Mac. First install the local transcription environment:

```bash
cd demo
sh scripts/setup-local-transcription.sh
```

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

Not yet included:

- Native SwiftUI capture
- Live/background recording
- Authentication or multi-user isolation
- External messaging or integrations
- Production database, queue, or cloud deployment

## Data and safety boundary

- With the default provider settings, audio and transcripts remain on-device through MLX Whisper and Qwen3.
- The Qwen request disables thinking, streaming, and temperature variation while enforcing the interaction JSON schema.
- OpenAI receives data only when the corresponding provider is explicitly set to `openai`; there is no automatic paid fallback.
- The Responses API request sets `store: false`.
- AI-generated information must be reviewed before use.
- The local demo is single-user and must not be exposed to an untrusted network.
- Production use still requires authentication, encryption-key management, retention/deletion controls, audit logging, and a security/privacy review.
