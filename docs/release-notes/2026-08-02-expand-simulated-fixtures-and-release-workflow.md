# Release note: expand simulated fixtures and release workflow

- Date: `2026-08-02`
- Previous commit: `d1ffc35`
- Release candidate: `Expand simulated fixtures and release workflow`

## Key changes

- Expanded the fictional local-audio validation suite from one health-tech conversation to five varied conference-style scenarios.
- Added exact scripts, machine-readable expectations, raw MLX transcripts, and generated M4A audio for climate, education, cybersecurity, and accessibility fixtures.
- Added a mandatory per-commit release-note workflow and reusable template for future Codex-created commits.
- Renamed the root demo overview from `README.md` to `README_DemoALLSLICES.md` without changing its content.

## Key documents and files modified

- `AGENTS.md` — requires one staged-diff-grounded release note in every Codex-created commit.
- `Decision-and-Conversation-Log.md` — records the approved fixture-suite and release-note workflow decisions.
- `README_DemoALLSLICES.md` — preserves the former root README content under its new name.
- `demo/LOCAL-AI-VALIDATION.md` — records the expanded fixture set, durations, MLX word error rates, proper-name findings, and acceptance boundary.
- `docs/release-notes/TEMPLATE.md` — provides the standard release-note structure.
- `docs/release-notes/2026-08-02-expand-simulated-fixtures-and-release-workflow.md` — documents this staged change set.
- `output/audio/README.md` — indexes the five fictional fixture bundles and their conventions.
- `output/audio/simulated-*-reference.md` — contains the four new exact scripts and human-readable expectations.
- `output/audio/simulated-*-expected.json` — contains machine-readable identities, topics, commitments, dates, follow-up requirements, and critical gates.
- `output/audio/simulated-*-mlx-transcript.txt` — preserves uncorrected MLX output for the four new fixtures.
- `output/audio/simulated-*.m4a` — adds four generated two-voice local-audio fixtures.

## Detailed changes

### Fixture coverage

- Added supplier-emissions, adaptive-learning research, manufacturing cybersecurity, and civic accessibility scenarios alongside the accepted clinical-documentation fixture.
- Varied speaker voices, industries, identities, timezones, explicit and relative dates, conditional commitments, mutual next steps, and explicit non-commitments.
- Kept every identity, organization, event, email address, and commitment fictional.
- Standardized each new fixture as a four-file bundle: M4A audio, reference Markdown, expected JSON, and uncorrected MLX transcript.

### Transcription evidence

- Recorded durations from 78.739 to 94.389 seconds and raw MLX word error rates from 4.13% to 7.02%.
- Documented that scenario logic, companies, dates, commitments, and guardrails survived while several proper names were imperfectly recognized.
- Marked the new fixtures as transcription-verified only; they are not represented as full diarized-Qwen acceptance passes.

### Repository workflow

- Added collision-safe, same-commit release-note requirements based on the authoritative `git diff --cached HEAD` change set.
- Required explicit designation before quoted text is treated as requested release-note content.
- Added requirements for exact verification reporting, amendment handling, commit-subject matching, privacy exclusions, and non-recursive self-description.
- Added the standard release-note template and recorded the durable workflow decision.

### Documentation organization

- Renamed `README.md` to `README_DemoALLSLICES.md` with 100% content similarity.
- Operational note: GitHub and similar repository browsers may not automatically display the renamed file as the repository landing-page README.

## Verification

- `npm test` from `demo/` — passed, 27 of 27 tests.
- `jq -e` for all four new `*-expected.json` files — passed.
- `ffprobe` for all four new M4A files — passed; each reports a nonzero duration and size.
- Normalized reference-to-MLX word-error calculation — completed; results range from 4.13% to 7.02%.
- `git diff --cached --check` — passed after removing trailing blank lines from newly created text files.
- Staged secret and private-artifact scan — passed; no credentials, private keys, private lecture artifacts, or personal recordings are staged.
- `git fetch origin` and `git rev-list --left-right --count HEAD...origin/main` — passed; local and remote `main` were synchronized at `d1ffc35` before commit.

## Requested release-note strings

None requested.

## Requested quotations

None requested.

## Additional notes

- `Chat-History-07062026.md` remains intentionally excluded from the commit under the standing project instruction.
- The new fixtures require future diarized-Qwen evaluation against their expected JSON before they can extend the formal Slice 1 acceptance evidence.
