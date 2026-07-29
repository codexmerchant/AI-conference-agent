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

## Project history and decisions

After every material project interaction, update the repository history before finishing the task.

- Add material user requests, conclusions, implementation changes, verification results, commits, pushes, and project-status updates to `Chat-History-07062026.md`.
- Add durable product, architecture, scope, workflow, ownership, naming, or implementation decisions to `Decision-and-Conversation-Log.md` in reverse-chronological order.
- Do not add routine conversational turns that do not affect the project.
- Do not record credentials, API keys, authentication codes, secrets, private tokens, or automatically supplied environment metadata.
- Clearly distinguish approved decisions from proposals, recommendations, and unresolved questions.
- If no durable decision was made, update only the chat history.

These updates are part of the definition of done for work in this repository.
