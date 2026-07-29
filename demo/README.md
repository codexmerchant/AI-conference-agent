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

- **Real uploaded-audio processing:** securely stores the file in the local demo workspace, transcribes it through OpenAI, and generates schema-constrained interaction intelligence with local Qwen3 when available. It falls back to OpenAI analysis when Ollama/Qwen3 is unavailable.
- **Clearly labeled sample workflow:** returns deterministic Maya Chen sample data and requires no API key.

Qwen3 local analysis is integrated. SenseVoice transcription is the remaining step for a completely free, on-device workflow. Follow the continuously updated [local AI setup guide](LOCAL-AI-SETUP.md) for verified Mac installation and troubleshooting steps.

## Run

Requires Node.js 20 or newer.

```bash
cd demo
npm run dev
```

For real processing, set an OpenAI project API key in the shell before starting:

```bash
export OPENAI_API_KEY="your-project-api-key"
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
- OpenAI file transcription
- Schema-constrained local Qwen3 or OpenAI contact, topic, summary, action-item, and follow-up extraction
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

- Until SenseVoice is integrated, real audio is transmitted to OpenAI only after the user confirms permission and starts processing.
- When Ollama and Qwen3 are available, transcript analysis remains on-device and the Qwen request disables thinking, streaming, and temperature variation while enforcing the interaction JSON schema.
- The Responses API request sets `store: false`.
- AI-generated information must be reviewed before use.
- The local demo is single-user and must not be exposed to an untrusted network.
- Production use still requires authentication, encryption-key management, retention/deletion controls, audit logging, and a security/privacy review.
