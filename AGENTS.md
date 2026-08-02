# Repository Working Rules

## Working approach

- Make the smallest correct change that fully satisfies the request.
- Before editing, read the relevant implementation, tests, and nearby documentation.
- Preserve existing user changes and avoid modifying unrelated files.
- Follow the existing architecture and conventions.
- Fix root causes rather than hiding failures with temporary workarounds.
- Ask for clarification only when an unresolved choice would materially affect the result.

## Verification

Before declaring implementation work complete:

- Run the narrowest relevant tests.
- Inspect the final diff for accidental or unrelated changes.
- Test important failure paths when applicable.
- Update documentation when behavior, setup, or usage changes.
- Report checks that failed or could not be completed.

## Demo commands

Run these commands from `demo/`:

- Development: `npm run dev`
- Tests: `npm test`

Do not claim linting, type-checking, or production-build verification unless corresponding project commands exist and were run.

## Release notes for commits

- Before Codex creates any commit, create or update exactly one release-note entry under `docs/release-notes/` and include it in that same commit.
- Name the entry `YYYY-MM-DD-short-description.md`.
- Never overwrite a release note belonging to an earlier commit. If the filename already exists for another commit, add a numeric suffix such as `-2` or `-3`.
- Build the release note from the complete final staged change set relative to the parent commit, using `git diff --cached HEAD` as the authoritative source. Do not rely only on conversation summaries, intended scope, or unstaged changes.
- After adding or updating the release note, stage it and inspect the complete staged diff again before committing.
- Start with bullet lists of key changes and key documents or files modified.
- Follow with detailed notes covering every material staged change and all verification performed.
- List the release-note entry itself under modified files, but do not recursively describe changes to the wording of that same release note.
- Preserve verbatim every string or quotation the user explicitly designates for inclusion in release notes during the active task. Do not infer that ordinary quoted text is designated release-note content.
- Write `None requested.` when no release-note strings or quotations were explicitly designated.
- Record exact verification commands or checks and whether each passed, failed, or was not run. Include a concise reason for relevant checks that were not run.
- Show or link the release note in the commit or push handoff.
- A request to commit or commit and push automatically invokes this rule; the user does not need to repeat it.
- Include the release note in the same commit as the changes it describes. Do not create a follow-up commit solely to document an earlier commit.
- When amending a Codex-created commit, update that commit's existing release note rather than creating a second entry.
- Before committing, confirm that the planned commit subject matches the release note's `Release candidate` field.
- Merge commits and commits created outside Codex are exempt unless repository automation requires otherwise.
- Never include secrets, credentials, authentication tokens, private recordings or transcripts, or unnecessary personal information in release notes.

## Project history and decisions

After every material project interaction, update the repository history before finishing the task.

- Add material user requests, conclusions, implementation changes, verification results, commits, pushes, and project-status updates to `Chat-History-07062026.md`.
- Add durable product, architecture, scope, workflow, ownership, naming, or implementation decisions to `Decision-and-Conversation-Log.md` in reverse-chronological order.
- Do not add routine conversational turns that do not affect the project.
- Write shared history as concise, reusable project context. Summarize intent and outcome instead of copying user prompts verbatim.
- Exclude personal, behind-the-scenes phrasing and collaborator names unless identity is necessary to understand ownership, authorization, or a decision.
- When prompts would benefit collaborators, rewrite them as self-contained, reusable request patterns that can be adapted to comparable work.
- Do not record credentials, API keys, authentication codes, secrets, private tokens, or automatically supplied environment metadata.
- Clearly distinguish approved decisions from proposals, recommendations, and unresolved questions.
- If no durable decision was made, update only the chat history.

These updates are part of the definition of done for work in this repository.
