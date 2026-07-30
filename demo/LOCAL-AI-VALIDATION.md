# Local AI Validation Record

**Evidence date:** July 29, 2026

**Scope:** Slice 1 local audio transcription and conference-conversation analysis
**Providers:** MLX Whisper `mlx-community/whisper-large-v3-turbo` and Ollama `qwen3`

## Executive result

The local pipeline is technically viable and runs end to end without a paid API. On the controlled 2:12 conference fixture, MLX Whisper achieved a 4.11% word error rate and retained the business-critical facts. Qwen3 recovered the main contact and discussion themes, but its structured output exposed grounding, ownership, date, email-normalization, and follow-up-perspective defects.

The evidence supports continuing with the local architecture. It does **not** yet support calling Slice 1 complete. Transcription is demo-ready with human review; structured analysis needs targeted hardening and another controlled pass.

## Controlled fixture

The fixture is fictional and contains no customer or personal data:

- Audio: [`../output/audio/simulated-conference-conversation.m4a`](../output/audio/simulated-conference-conversation.m4a)
- Exact script and expected output: [`../output/audio/simulated-conference-reference.md`](../output/audio/simulated-conference-reference.md)
- Raw MLX transcript: [`../output/audio/simulated-conference-mlx-transcript.txt`](../output/audio/simulated-conference-mlx-transcript.txt)
- Duration: 132.145 seconds
- Audio: mono AAC, 44.1 kHz
- Speakers: two distinct built-in macOS synthetic voices
- Scenario: a networking discussion about a privacy-sensitive clinical documentation pilot

The script deliberately includes names, roles, organizations, an email address, topics, commitments, relative timing, an absolute deadline, and a third-party introduction.

## MLX Whisper evaluation

The normalized comparison used lowercase alphanumeric word tokens with punctuation removed. Speaker labels and Markdown formatting were excluded.

| Measure | Result |
| --- | ---: |
| Reference words | 365 |
| Transcript words | 360 |
| Substitutions | 8 |
| Insertions | 1 |
| Deletions | 6 |
| Total edits | 15 |
| Word error rate | 4.11% |
| Approximate word accuracy | 95.89% |

Meaningful recognition errors:

| Script | MLX output | Risk |
| --- | --- | --- |
| `lead` | `led` | Low; grammar/role phrasing |
| `Northstar` | `Northster` | Medium; organization identity |
| `notes` | `nodes` | Medium; product meaning |

Benign normalization differences included `HealthTech` becoming `Health Tech`, the spoken email becoming `daniel.ruiz at clearpathlabs.com`, and spoken numbers becoming digits.

MLX retained Maya Chen, Daniel Ruiz, Daniel's role, ClearPath Labs, Priya Shah, Harborview Community Health, Seattle, the email components, privacy/local-processing context, the commitments, and the August 4, 2026 deadline.

### MLX limitation

The transcript is a single text stream without speaker labels. Downstream analysis must infer who said and promised what. This increases the importance of explicit participant perspective, grounded ownership rules, and human review.

## Qwen3 structured-analysis evaluation

The fixture was submitted through the real `/api/process` path with local MLX transcription and local Qwen3 schema-constrained analysis.

| Area | Result | Evidence |
| --- | --- | --- |
| Primary contact | Pass | Daniel Ruiz, Director of Partnerships, ClearPath Labs |
| Contact confidence | Pass | Returned `0.95` |
| Main topics | Pass | Captured documentation, consent, integration, local processing, privacy, Seattle pilot, security, and correction workflow |
| Third-party introduction | Pass | Captured Priya Shah and Harborview Community Health |
| Absolute deadline | Pass | Captured August 4, 2026 for the introduction |
| Email normalization | Partial | Returned `daniel.ruiz at clearpathlabs.com` instead of an address with `@` |
| Summary grounding | Partial | Preserved the main discussion but repeated MLX's `visit nodes` error |
| Commitment attribution | Fail | Summary incorrectly implied Daniel would send the pilot overview; Maya made that commitment |
| Action ownership | Fail | All three actions were labeled `Me`, including commitments belonging to different speakers |
| Relative dates | Fail | Maya's “tomorrow afternoon” commitment was assigned August 3, 2026 without a supplied date anchor |
| Inferred dates | Fail | The later three-person call received an unsupported August 5 due date |
| Follow-up perspective | Fail | Draft focused on reviewing materials rather than Maya sending the promised materials to Daniel |

### Required structured-analysis fixes

1. Supply an explicit interaction date and resolve relative dates only against that anchor.
2. Define the user's identity or perspective before assigning `Me` and generating follow-up text.
3. Preserve distinct speaker/participant ownership; use `Unclear` when the transcript cannot support an assignment.
4. Prohibit invented deadlines. Omit a date when none is supported.
5. Normalize spoken email forms while retaining a confidence/review signal.
6. Require every summary and action claim to be traceable to transcript evidence.
7. Add controlled tests for crossed commitments: the contact promises an introduction while the user promises materials.

## Long-form lecture stress test

A separate 49:01 personal lecture recording was used only as a private local stress test. It produced a 32,694-character MLX transcript. A temporary seven-section Qwen summary correctly identified the main physics topic and most major concepts, but two synthesis errors required correction. The recording began mid-explanation and ended with unrelated conversation after class.

This test supports the long-form transcription and summarization foundation, but it is not a representative conference-schema evaluation. The current interface forces contact, action, and follow-up fields and therefore should not be used to judge lecture-summary quality. No personal lecture audio, raw transcript, or derived PDF is part of the repository validation fixture.

## Reproduction

Set up and start the local providers as described in [`LOCAL-AI-SETUP.md`](LOCAL-AI-SETUP.md), then run:

```bash
cd demo
npm test
npm run dev
```

Open <http://localhost:4173>, upload the fictional M4A fixture, confirm permission, and choose **Transcribe & analyze**. Compare the review screen with the reference expectations and raw MLX transcript linked above.

## Validation conclusion

- **Local execution:** Pass
- **Long-form transcription feasibility:** Pass with human review
- **Controlled short-form transcription:** Pass with minor entity/word corrections
- **Contact and topic extraction:** Pass on this fixture
- **Grounded ownership, dates, and follow-up:** Fail on this fixture
- **Slice 1 status:** Core pipeline proven; structured-analysis hardening remains

This is an evidence snapshot, not a general benchmark. Results may change with model versions, hardware, prompts, audio conditions, and fixture design.

## July 30 hardened acceptance run

The hardened implementation adds required user identity, interaction date and timezone, evidence-bearing actions, deterministic email/date/ownership validation, derived confidence, visible review flags, editable owners and dates, and persistence of corrections. The automated suite passes 21 of 21 tests, and browser validation confirmed the sample workflow, editing, save/reopen, and absence of browser errors.

The controlled real-audio run used immutable MLX timestamp segments and a constrained Qwen3 speaker-label contract. It completed successfully in approximately 126 seconds and correctly returned Daniel Ruiz, his role and company, and `daniel.ruiz@clearpathlabs.com`. Supported dates were preserved and the unsupported `later that week` date remained absent.

The run still failed the critical ownership gate. Several commitments were labeled with an unclear speaker, while two Maya commitments were confidently attributed to Daniel. The generated summary also misattributed who would send the overview. Because the source is a mono recording and MLX timestamps do not contain speaker identity, prompt-only attribution is not adequate acceptance evidence. The required product decision is whether Slice 1 adds automatic two-speaker diarization or requires explicit human speaker confirmation before actions become accepted.

## July 30 final diarized acceptance run

The failed prompt-only speaker reconstruction was replaced with local FluidAudio 0.7.12 diarization. MLX timestamp segments are aligned to FluidAudio voice segments, and spoken self-introductions map the within-recording voice clusters to the supplied app user and extracted contact. Voice embeddings are not persisted.

The final controlled result correctly assigned Maya's preparation tasks to `Me`, Daniel's Harborview introduction to `Contact`, and the three-person call to `Mutual`. Daniel's identity, role, company, and normalized email were correct. August 3 and August 4 were grounded from the supplied interaction date and transcript evidence; `later that week` remained undated. The summary and follow-up used Maya's perspective and made no false completion claims.

Final evidence:

- Weighted controlled score: **94/100**
- Critical gates: **9/9 pass**
- Automated tests: **27/27 pass**
- Browser workflow: **pass** for upload, consent, labelled transcript, review, save, list, and reopen
- FluidAudio diarization time: approximately **1.5–2.0 seconds** for the 2:12 fixture after model setup
- Remaining review signal: one overview action is 25% supported because its selected evidence says “materials” rather than repeating the full overview description
- Slice 1 status: **accepted with visible human review for uncertain evidence and exceptional speaker mappings**
