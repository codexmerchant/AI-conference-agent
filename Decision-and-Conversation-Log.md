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

**Decision**: Push all work to a new private repo under `codexmerchant` (user's own GitHub account), not to `origin` (`6shamim/AI-conference-agent`).

**Rationale**: Collaborator Shamim owns the `origin` remote. User explicitly does not want to modify that repo.

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
