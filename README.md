# AI Conference Agent

An AI-native conference and relationship intelligence platform that turns captured interactions into transcripts, contacts, summaries, action items, and reviewed follow-up drafts.

## Runnable first-slice demo

The repository now includes a self-contained product demo in [`demo/`](demo/README.md). It implements one complete vertical slice:

`Audio → Transcript → Contact and topics → Summary → Actions → Follow-up → Save and reopen`

Run it with Node.js 20 or newer:

```bash
cd demo
npm run dev
```

Then open <http://localhost:4173>. Upload a supported recording for the real workflow, or select **Run clearly labeled sample** to explore the review experience without an API call.

Real transcription and structured analysis can run entirely on the Mac through MLX Whisper and Qwen3. OpenAI remains an explicitly configured alternative rather than an automatic paid fallback. The deterministic sample remains available without either provider. See the [demo README](demo/README.md) for setup, data handling, tests, and current boundaries.

The controlled local-AI evaluation, including the fictional audio fixture, measured transcription accuracy, and known structured-analysis failures, is documented in the [local AI validation record](demo/LOCAL-AI-VALIDATION.md).

## Product documentation

- Product direction: [`Product-Strategy-Vision/`](Product-Strategy-Vision/)
- Capability specifications: `EPIC-01` through `EPIC-14`
- AI-assisted engineering workflow: [`AI-Agent-Workflow-Guidance.md`](AI-Agent-Workflow-Guidance.md)
- Local MLX/Qwen validation evidence: [`demo/LOCAL-AI-VALIDATION.md`](demo/LOCAL-AI-VALIDATION.md)
- Decisions and project history: [`Decision-and-Conversation-Log.md`](Decision-and-Conversation-Log.md)
