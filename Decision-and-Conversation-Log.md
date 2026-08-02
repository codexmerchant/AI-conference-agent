# Decision & Conversation Log — AI Conference Agent

A running log of key decisions, conversations, and choices made during the development of the Agentic Conference Secretary product. Add entries in reverse-chronological order (newest at top).

---

## Format

Each entry should include:
- **Date** — when the decision was made
- **Topic** — short label
- **Decision / Summary** — what was decided or discussed
- **Rationale** — why (constraints, trade-offs, preferences)
- **Outcome / Next Steps** — what happened as a result

---

## Log

### 2026-08-02 — Per-Commit Release Notes Required for Codex Commits

**Decision**: Every Codex-created commit must include exactly one release-note entry under `docs/release-notes/`, derived from the complete final staged diff and committed with the changes it describes. A reusable template defines the required content.

**Rationale**: Commit handoffs need an auditable, repository-local explanation of material changes and verification that does not depend on conversation history. Collision handling, explicit quotation designation, amendment behavior, and staged-diff authority prevent ambiguous or misleading notes.

**Outcome**: Added the approved workflow to the root `AGENTS.md` and created `docs/release-notes/TEMPLATE.md`. Requests to commit or commit and push invoke the rule automatically. The first invocation created a dated release entry for the fixture-suite and workflow commit.

### 2026-08-01 — Controlled Simulated Fixture Suite Expanded

**Decision**: Maintain a small, clearly fictional multi-scenario conversation suite in `output/audio/`, with a consistent four-file bundle per fixture: audio, reference script, machine-readable expectations, and raw MLX transcript.

**Rationale**: One accepted health-tech fixture is insufficient to expose name, accent, industry vocabulary, conditional-commitment, timezone, and non-commitment failure modes. Reusable controlled fixtures make those behaviors measurable without customer data or consent risk.

**Outcome**: Added climate partnership, education research, cybersecurity procurement, and accessibility collaboration scenarios alongside the original health-tech fixture. Raw MLX WER ranged from 4.13% to 7.02%. The new fixtures are transcription-verified but remain explicitly outside end-to-end acceptance until evaluated through diarization and Qwen against their expected JSON.

### 2026-07-30 — One-Click Controlled Fixture Metadata

**Decision**: Add a clearly labelled testing helper above the capture metadata fields that fills the canonical controlled fixture context in one click. It does not select audio or bypass permission confirmation.

**Rationale**: Re-entering Maya Chen, the August 2 fixture date, conference, and interaction name on every repeated acceptance run creates avoidable testing friction and increases the chance of invalid ownership or relative-date results.

**Outcome / Next Steps**: Added `Use controlled test settings` above the four metadata fields. Keep this as a demo/testing convenience and exclude or gate it in the production interface.

### 2026-07-30 — Identical-File Reprocessing Accepted During Testing

**Decision**: During the current demo-testing phase, intentionally uploading the same audio again may run the complete transcription, diarization, analysis, and validation pipeline and create a separate interaction if saved. Identical-file caching and content-hash deduplication are deferred.

**Rationale**: Full reruns help evaluate consistency, latency, and model variability. Existing duplicate protection still applies when saving edits to an interaction with the same interaction ID; it does not treat a deliberate new upload as the same interaction.

**Outcome / Next Steps**: This behavior is not a Slice 1 acceptance blocker for testing. Add content-hash detection, result reuse, or an explicit “reprocess versus reopen” choice before production if repeated storage and compute become a concern.

### 2026-07-30 — Slice 1 Accepted with Local FluidAudio Diarization

**Decision**: Accept Slice 1 at 94/100 with all nine critical gates passing. Use pinned FluidAudio 0.7.12 for automatic within-recording speaker diarization on the current Swift 5.10 demo environment, aligned with MLX Whisper timestamps. Keep human review visible for low-confidence evidence and exceptional speaker mappings.

**Rationale**: Prompt-only speaker reconstruction failed the ownership gate. FluidAudio separated the controlled voices locally in approximately 1.5–2.0 seconds, allowing deterministic identity mapping from spoken introductions and correct action ownership. Version 0.7.12 is the newest tested release in this work that builds with the installed Swift toolchain; the newer tested release required Swift 6.

**Outcome / Next Steps**: The controlled score is 94/100, the automated suite passes 27/27, and the browser workflow passes upload through save/reopen. Slice 1 is accepted. Future production work may upgrade the diarization/model stack independently while preserving the same evidence, uncertainty, and correction contracts.

### 2026-07-30 — Automatic Speaker Diarization Approved for Slice 1

**Decision**: Add automatic within-recording speaker diarization to Slice 1. The system will separate detected voices, map them to the app user and contact when sufficiently grounded, and request confirmation when uncertain. No persistent biometric voice profile is required.

**Rationale**: Mono transcription timestamps do not identify speakers, and prompt-only attribution failed the critical commitment-ownership gate. Automatic voice separation provides stronger evidence for action ownership while preserving an editable review step.

**Outcome / Next Steps**: Implement and validate the diarization pipeline, transcript labels, and regeneration of ownership-dependent outputs. Do not insert a speaker-confirmation screen into the normal workflow. Surface editable ownership in review and request explicit speaker confirmation only when confidence is low or mappings conflict.

### 2026-07-30 — Explicit Per-Conversation User Identity Defines “Me”

**Decision**: Require the user to identify their name as it appears in each processed conversation. That identity defines `Me` for commitment ownership and the sender perspective for follow-up generation. If the named user cannot be grounded in the transcript, ownership must remain `Unclear` rather than being guessed.

**Rationale**: The controlled fixture contains Maya Chen and Daniel Ruiz while the demo workspace previously displayed a different profile name. Without an explicit participant identity, first-person commitments and follow-up perspective cannot be assigned reliably.

**Outcome**: Approved the complete Slice 1 acceptance contract. Added user name and interaction date to the capture form, automatic browser timezone context, server validation, persistence fields, evidence-bearing action schema, and identity/date-aware prompts for both local Qwen3 and explicitly selected OpenAI analysis.

---

### 2026-07-30 — Slice 1 Uses Weighted Quality Plus Critical Gates

**Decision**: Slice 1 acceptance requires an overall score of at least 85/100 and a pass on every critical failure gate. A high aggregate score cannot compensate for wrong commitment ownership, invented dates, incorrect follow-up perspective, material contact misidentification, false completion claims, consent/provider violations, or duplicate persistence.

**Rationale**: Weighted scoring captures noncritical differences in completeness, wording, and usefulness, while binary gates protect against errors that could cause incorrect action or violate user trust. The acceptance formula is `score >= 85 AND all critical gates pass`.

**Outcome**: Updated the Slice 1 acceptance standard to mark the scoring model and gates approved. The user-identity contract remains the next required product decision before analysis hardening begins.

---

### 2026-07-30 — Seven-Slice Epic-Aligned Delivery Map

**Decision**: Organize delivery into seven ordered vertical slices that collectively cover EPIC-01 through EPIC-14. Define the full sequence and dependencies at roadmap level, then add detailed acceptance criteria and technical design only for the next implementation slice.

**Rationale**: The fourteen epics describe capability ownership but do not by themselves create demonstrable end-to-end user outcomes. A coarse slice map prevents dependency and scope drift while preserving room to adapt later implementation details based on accepted-slice evidence.

**Outcome**: Added `Product-Strategy-Vision/Slice-Map.md` with outcomes, epic alignment, completion evidence, exclusions, an epic-to-slice coverage matrix, and delivery-governance requirements. Slice 1 remains implemented but not accepted; Slice 7 remains explicitly post-V1. Linked the map from the root README.

---

### 2026-07-30 — Shared History Must Be Reusable and Impersonal

**Decision**: Record project history as concise, reusable context rather than a verbatim transcript of personal or behind-the-scenes conversation. Convert useful prompts into self-contained request patterns that collaborators can adapt.

**Rationale**: Shared repository history should help collaborators understand and repeat project work without exposing unnecessary personal phrasing or relationship context.

**Outcome**: Updated `AGENTS.md` with explicit history-writing and privacy-minimization rules. Reworked the July 23–24 prompt list into reusable request patterns and removed unnecessary collaborator-specific wording while preserving authorization and repository-safety outcomes.

---

### 2026-07-29 — Controlled Simulated Conference Fixture Created

**Status**: Implemented test asset; use in the polished demo remains optional.

**Summary**: Created a clearly labeled fictional conference-networking conversation with two distinct local synthetic voices, plus its exact script and expected extraction results. The asset is isolated under `output/audio/` and does not change the Slice 1 application workflow.

**Rationale**: A controlled fixture provides known names, roles, organizations, topics, dates, and commitments, making transcription and grounded-extraction accuracy objectively measurable without privacy or consent concerns.

**Outcome**: Generated a 2:12 M4A and verified it with local MLX Whisper. All critical entities and commitments were retained, including Maya Chen, Daniel Ruiz, ClearPath Labs, Priya Shah, Harborview Community Health, Seattle, the spoken email address, and the August 4, 2026 deadline. Minor transcription substitutions remained, reinforcing human review.

**Validation finding**: The controlled end-to-end Qwen3 run passed contact, topic, third-party introduction, and absolute-deadline extraction, but failed reliable commitment ownership, relative/inferred dates, normalized email output, and user-perspective follow-up. The local architecture remains selected; Slice 1 structured-analysis hardening is required before completion. Evidence and reproduction steps are recorded in `demo/LOCAL-AI-VALIDATION.md`.

### 2026-07-29 — MLX Whisper Selected and Integrated for Local Transcription

**Decision**: Use MLX Whisper with multilingual `mlx-community/whisper-large-v3-turbo` as the default Slice 1 transcription provider on the Apple-silicon demo Mac. Keep Qwen3 through Ollama as the default analysis provider. OpenAI providers remain available only through explicit configuration and are never automatic fallbacks.

**Rationale**: The user selected MLX Whisper after clarifying that avoiding API billing is more important than using the already implemented paid transcription path. MLX Whisper is optimized for Apple silicon and provides a direct local path without per-recording charges.

**Outcome**: Added an isolated MLX environment setup script, pinned dependency, Python transcription adapter, Node provider service, readiness detection, explicit provider routing, provenance, interface status, documentation, and three focused tests. Installed MLX Whisper 0.4.3 and downloaded the `large-v3-turbo` model. All 13 automated tests pass. A synthetic supported WAV was processed through MLX Whisper and Qwen3 with no API key; the result was saved and reopened in the browser. The transcript reproduced the sentence but rendered “Northstar” as “Northster,” reinforcing the existing human-review requirement. Synthetic verification records and audio were removed afterward.

**Supersedes**: The earlier same-day decision to retain OpenAI transcription as the fastest demo path. OpenAI transcription is now an explicitly selected alternative, not the default.

---

### 2026-07-29 — Prioritize Fastest Working Demo over Local Transcription

**Decision**: Keep the existing OpenAI transcription path for the current demo rather than delaying the demo to integrate MLX Whisper, SenseVoice, whisper.cpp, or another local transcription engine. Continue using local Qwen3 for structured analysis when available, with the existing OpenAI fallback.

**Rationale**: The current OpenAI transcription path is already implemented and covered by automated tests. The immediate priority is getting the end-to-end demo working as quickly as possible, not eliminating API usage or completing a fully local pipeline.

**Outcome**: Local transcription becomes an optional post-demo optimization. The immediate remaining validation is a live end-to-end recording test with an OpenAI project API key, followed by correction of any observed demo-blocking issues.

---

### 2026-07-29 — Correction: Local Transcription Provider Not Yet Selected

**Status**: Correction and unresolved decision.

**Summary**: No explicit user approval was found selecting SenseVoice as the local transcription provider. SenseVoice was introduced during local-AI setup work as an implementation assumption and was later described too strongly in project documentation and earlier log entries.

**Outcome / Next Steps**: Treat SenseVoice as one candidate only. The approved local-provider decision currently covers Qwen3 transcript analysis through Ollama. Compare suitable local transcription options and obtain approval before integrating one. Earlier references stating that SenseVoice “will” be connected should be read as superseded proposals pending documentation cleanup.

---

### 2026-07-29 — Preserve AI Agent Workflow Guidance with Qualified Attribution

**Decision**: Preserve the shared AI-assisted engineering workflow as a repository Markdown reference, while describing it as community guidance inspired by Andrej Karpathy's observations rather than as Karpathy's verified personal or leaked `CLAUDE.md`.

**Rationale**: The workflow concepts are useful project context, but public source material identifies other authors and compilers for the specific checklist and graphic. Separating the explanatory reference from the enforceable `AGENTS.md` keeps project instructions concise and attribution accurate.

**Outcome**: Added `AI-Agent-Workflow-Guidance.md` with source links, principles, the verification loop, selective-agent guidance, and the project's application of those ideas. Linked it from the root README.

---

### 2026-07-29 — Repository Agent Operating Rules Expanded

**Decision**: Expand the root `AGENTS.md` with concise repository-wide rules for scoped implementation, preservation of existing work, root-cause fixes, relevant verification, final-diff inspection, documentation updates, and accurate reporting of uncompleted checks. Document only the demo commands that currently exist: `npm run dev` and `npm test` from `demo/`.

**Rationale**: The prior file enforced project-history maintenance but did not define the broader implementation and verification behavior expected from coding agents. A repository-specific rule set provides durable guidance without embedding task-specific acceptance criteria or claiming unavailable automated checks.

**Outcome**: Updated the root instructions while preserving the existing history requirements. Nested `AGENTS.md` files, speculative lint/type-check/build commands, and permanent multi-agent roles were intentionally deferred until the repository has a demonstrated need for them.

---

### 2026-07-28 — Qwen3 Integrated as the Preferred Transcript-Analysis Provider

**Decision**: Prefer locally running Qwen3 for Slice 1 structured transcript analysis whenever Ollama is reachable and the configured model is installed; retain OpenAI analysis as the fallback.

**Rationale**: Local analysis reduces API usage and keeps transcript interpretation on the Mac while preserving a working cloud path for collaborators who do not have Ollama configured.

**Outcome**: Added Ollama health/model detection, schema-constrained Qwen3 chat requests with thinking disabled, deterministic temperature, provider-specific provenance, UI readiness status, configuration options, and tests. Verified the integration against the installed Qwen3 8.2B Q4 model using a real local request. Audio transcription still uses OpenAI until SenseVoice is connected.

---

### 2026-07-28 — Maintain a Verified Local-AI Setup Guide

**Decision**: Maintain `demo/LOCAL-AI-SETUP.md` as a continuously updated guide while the free local Qwen3 and SenseVoice workflow is implemented.

**Rationale**: Installation, model selection, background-service behavior, and troubleshooting steps were being discovered interactively and need to remain reproducible for collaborators.

**Outcome**: Added the guide with verified Ollama/Qwen3 steps, troubleshooting, and an implementation-status checklist. Future local-model setup and connection steps will be added only as they are implemented or verified.

---

### 2026-07-28 — Slice 1 Upgraded from Simulation to Real Audio Processing

**Decision**: Complete Slice 1 with an optional real-processing path that sends a consented audio upload to OpenAI for transcription and schema-constrained conversation analysis, while retaining the deterministic workflow as an explicitly labeled sample.

**Rationale**: A selected recording must produce results from that recording; silently returning the Maya Chen fixture is misleading. The slice also needs to remain easy to demonstrate when an API key is unavailable.

**Outcome**: Added real audio validation, consent confirmation, transcription, structured contact/topic/summary/action/follow-up extraction, local source-audio storage, review/save/reopen behavior, provider error handling, and a non-retryable missing-key state. The interface now labels sample results and never substitutes sample data for a real upload. Eight automated tests and browser tests of both paths pass. A live provider call remains an environment smoke check because no API key was available during implementation. This supersedes the prior statement that real transcription and LLM calls were outside Slice 1.

---

### 2026-07-28 — Project Name Retained for the Demo

**Decision**: Use **AI Conference Agent** as the demo's visible product name. Do not introduce an unapproved working brand in product surfaces.

**Rationale**: The initial demo interface temporarily used “Gather,” but that name was not present in the product documents and had not been approved by the collaborators.

**Outcome**: Replaced all “Gather” references in the demo title, navigation, and accessibility text with “AI Conference Agent.” Future naming exploration should be handled as an explicit product decision.

---

### 2026-07-28 — Repository History Updates Made a Definition-of-Done Rule

**Decision**: Treat chat-history and decision-log maintenance as a repository-level working rule for all future material work.

**Rationale**: The project spans multiple sessions and collaborators. Keeping only an informal reminder inside a prior chat-history entry was not strong enough to ensure every future agent or contributor sees the requirement.

**Outcome**: Added a root `AGENTS.md` requiring material requests and outcomes to be recorded in `Chat-History-07062026.md` and durable decisions to be recorded in this log, while excluding credentials, secrets, authentication data, and routine conversation.

---

### 2026-07-27 — First Vertical Slice Implemented as a Runnable Demo

**Decision**: Implement the first product slice as a dependency-free web demo with a small local Node.js API, deterministic simulated AI processing, and JSON persistence.

**Rationale**: The repository contained comprehensive product documentation but no executable application. The team still needs to confirm production provider and infrastructure decisions, so the demo establishes the complete user workflow without requiring API keys or prematurely coupling the product to a vendor. Clear client/API boundaries allow simulated processing and local persistence to be replaced incrementally.

**Outcome**: Added a runnable `demo/` application covering audio selection, staged processing, transcript, contact/topic extraction, summary, action items, follow-up draft, human review, save, conversation library, and reopen. Added automated tests and verified the full workflow in-browser. Real transcription, LLM calls, native capture, authentication, and cloud infrastructure remain outside this first slice.

---

### 2026-07-19 — GPT Used to Complete EPIC-06 through EPIC-14 Test Cases

**Decision**: Use GPT to generate test cases for EPIC-06 through EPIC-14 after Claude's monthly spend limit was hit mid-run.

**Rationale**: All 9 Claude agents launched in parallel for EPIC-06–14 failed immediately due to the monthly spend limit being exhausted. Rather than wait, GPT was used as a fallback to complete the generation.

**Outcome**: All 9 epics now have feature-level test case files. Quality assessment: structure matches the established template, code samples are domain-specific and realistic. One gap — READMEs are missing from all 9 GPT-generated test folders (EPIC-02–05 generated by Claude have READMEs; EPIC-06–14 do not). READMEs to be added separately.

---

### 2026-07-19 — Model Selection for This Project

**Decision**: Use Claude Sonnet 4.6 as the primary model for documentation generation and coordination tasks.

**Rationale**: Sonnet 4.6 hits the sweet spot — fast enough for parallel agent spawning, capable enough for domain-specific generation (NLP, graph DB, encryption, etc.). Haiku 4.5 was evaluated and deemed insufficient for complex multi-file generation. Sonnet 5 offers marginally better quality at higher cost, not justified for this workload.

**Outcome**: Ongoing sessions default to Sonnet 4.6.

---

### 2026-07-19 — Decision & Conversation Log Created

**Decision**: Create a persistent `Decision-and-Conversation-Log.md` at the repo root to track key decisions and session summaries.

**Rationale**: No record of decisions was being kept across sessions. As the project spans multiple AI-assisted sessions and two collaborators, a log helps maintain context and rationale over time.

**Outcome**: File created at repo root with reverse-chronological format. Back-filled with decisions from prior sessions (2026-07-06 and 2026-07-18).

---

### 2026-07-19 — Test Case Generation for EPIC-02 through EPIC-05

**Decision**: Generate test cases for EPIC-02, 03, 04, and 05 in parallel using 4 Claude agents.

**Rationale**: EPIC-01 already had test cases. The next priority was the foundational epics — transcription, intelligence, contacts, and session analysis.

**Outcome**: 39 files committed (`c101d3e`), pushed to `codexmerchant/AI-conference-agent`. EPIC-04 agent hit the spend limit but had written all 9 files before failing.

---

### 2026-07-18 — Test Case Generation (EPIC-02 through EPIC-05)

**Decision**: Generate test cases for EPIC-02, 03, 04, and 05 first, skipping EPIC-06–14 for now.

**Rationale**: Prioritize the foundational epics (capture, transcription, intelligence, contacts, sessions) before the higher-layer ones. EPIC-01 already had test cases from a prior session.

**Outcome**: 39 test case files created (~30 test cases per feature), committed and pushed to `codexmerchant/AI-conference-agent`. EPIC-04 agent hit a monthly spend limit mid-run but completed all 9 feature files before failing.

---

### 2026-07-18 — Epic Depth Parity Pass (EPIC-04 through EPIC-14)

**Decision**: Expand all 11 thin epics (EPIC-04–14) from single-page boilerplate to match EPIC-01/02 depth: one 20-section `FEATURE-*.md` per feature plus 3-perspective user stories (user/operator/admin).

**Rationale**: EPIC-01 and EPIC-02 had rich feature specs and user stories; the remaining 11 epics each had only a single generic overview file. Needed parity before test case generation.

**Outcome**: 382 files generated across 11 epics, committed as `a8d3349`, pushed to `codexmerchant/AI-conference-agent`.

---

### 2026-07-18 — Repository Push Target

**Decision**: Push all work to the authorized private fork, not to the collaborator-owned `origin` repository.

**Rationale**: The collaborator owns the `origin` remote, and the user explicitly did not authorize modifying it.

**Outcome**: New private repo created at `https://github.com/codexmerchant/AI-conference-agent`, added as `personal` remote. All pushes go there only.

---

### 2026-07-06 — User Story Depth (EPIC-03)

**Decision**: Use rich 3-perspective user stories (user / operator / admin) with 13 sections each, matching EPIC-03's format.

**Rationale**: Richer stories surface operational and compliance requirements earlier, reducing rework downstream.

**Outcome**: 24 user stories created for EPIC-03 (8 features × 3 variations).

---

### 2026-07-06 — Test Cases Deferred

**Decision**: Skip test case generation during the initial epic depth-parity pass.

**Rationale**: Prioritize getting feature specs and user stories complete across all 14 epics first; test cases are a separate pass.

**Outcome**: EPIC-01 test cases pre-existed; test case generation for EPIC-02–05 handled in a follow-up session (2026-07-18).

---

*Add new entries above this line.*
