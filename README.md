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

Real transcription currently requires an OpenAI project API key. Structured analysis runs locally through Qwen3 when available, with OpenAI as a fallback. The deterministic sample remains available without either provider. See the [demo README](demo/README.md) for setup, data handling, tests, and current boundaries.

## Product documentation

- Product direction: [`Product-Strategy-Vision/`](Product-Strategy-Vision/)
- Capability specifications: `EPIC-01` through `EPIC-14`
- AI-assisted engineering workflow: [`AI-Agent-Workflow-Guidance.md`](AI-Agent-Workflow-Guidance.md)
- Decisions and project history: [`Decision-and-Conversation-Log.md`](Decision-and-Conversation-Log.md)
