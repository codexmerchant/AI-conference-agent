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

Real transcription, speaker diarization, and structured analysis can run entirely on the Mac through MLX Whisper, FluidAudio, and Qwen3. OpenAI remains an explicitly configured alternative rather than an automatic paid fallback. The deterministic sample remains available without those providers. See the [demo README](demo/README.md) for setup, data handling, tests, and current boundaries.

Slice 1 is accepted at 94/100 with all critical gates passing and 27 automated tests. The controlled local-AI evaluation—including the fictional audio fixture, measured transcription accuracy, failed intermediate approaches, and final diarized result—is documented in the [local AI validation record](demo/LOCAL-AI-VALIDATION.md) and [acceptance record](demo/SLICE-1-ACCEPTANCE.md).

## Product documentation

- Product direction: [`Product-Strategy-Vision/`](Product-Strategy-Vision/)
- Vertical delivery roadmap: [`Product-Strategy-Vision/Slice-Map.md`](Product-Strategy-Vision/Slice-Map.md)
- Capability specifications: `EPIC-01` through `EPIC-14`
- AI-assisted engineering workflow: [`AI-Agent-Workflow-Guidance.md`](AI-Agent-Workflow-Guidance.md)
- Local MLX/Qwen validation evidence: [`demo/LOCAL-AI-VALIDATION.md`](demo/LOCAL-AI-VALIDATION.md)
- Decisions and project history: [`Decision-and-Conversation-Log.md`](Decision-and-Conversation-Log.md)
