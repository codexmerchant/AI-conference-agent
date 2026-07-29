# AI Agent Workflow Guidance

This note preserves the useful engineering guidance shared with the project while keeping its attribution precise. It is background and rationale; the enforceable repository rules live in [`AGENTS.md`](AGENTS.md).

## Attribution

The supplied graphic is based on a practical workflow guide published by Alireza Rezvani and described as **inspired by Andrej Karpathy's workflow principles**. A separate community project, `andrej-karpathy-skills`, likewise describes its instructions as derived from Karpathy's observations about recurring LLM coding failures.

These materials should not be described as Karpathy's personal or leaked `CLAUDE.md` unless a direct primary source establishes that claim.

Sources:

- [Alireza Rezvani's workflow Gist](https://gist.github.com/alirezarezvani/75161f5c44d09757d999a10408f8c934)
- [Karpathy-Inspired Claude Code Guidelines](https://github.com/multica-ai/andrej-karpathy-skills)

## Core idea

Reliable AI-assisted engineering comes from a system around the agent, not from one elaborate prompt. That system combines:

1. Durable repository instructions.
2. Clear outcomes, constraints, and success criteria for each task.
3. An implementation and verification loop.
4. Selective parallel work when tasks are genuinely independent.
5. Automated checks that catch recurring failures mechanically.

In short: put durable knowledge in repository instructions, judgment and outcomes in the task, and correctness in verification.

## Working principles

### Think and plan before editing

- Read the relevant code, tests, and nearby documentation.
- Surface assumptions, ambiguities, risks, and meaningful tradeoffs.
- For non-trivial work, identify the intended outcome and a short plan.
- Ask for input only when an unresolved decision would materially change the result.

### Keep solutions simple

- Implement the smallest solution that fully meets the request.
- Avoid speculative features, premature abstractions, and unnecessary configurability.
- Prefer the existing architecture and conventions unless the task requires changing them.

### Make surgical changes

- Change only what is needed for the requested outcome.
- Do not refactor, reformat, rename, or clean up unrelated code.
- Preserve existing worktree changes and public behavior unless changes are required.
- Remove newly unused code caused by the current change, but do not silently remove pre-existing unrelated code.

### Execute toward verifiable goals

Use this loop:

`Understand → Plan → Implement → Test → Inspect diff → Correct → Report`

- Express substantial work as observable success criteria.
- Reproduce bugs and add regression tests when practical.
- Run the narrowest checks that provide meaningful evidence.
- Exercise important edge cases and failure paths.
- Continue correcting until the criteria are met or a genuine blocker is reported.
- Never equate code being written with the task being complete.

### Use parallel agents deliberately

Parallel agents are useful for independent research, exploration, testing, or review. Each assignment should have one bounded deliverable, and the primary agent remains responsible for reconciling results and judging the final outcome. Small or tightly coupled changes generally do not benefit from parallelization.

### Turn repeated failures into enforcement

Behavioral guidance belongs in `AGENTS.md` when it is durable and relevant. Mechanically detectable failures should instead become tests, formatting rules, lint rules, type checks, pre-commit checks, or CI gates. Obsolete guidance should be removed periodically.

## How this repository applies the guidance

- [`AGENTS.md`](AGENTS.md) contains concise, enforceable working and verification rules.
- Material interactions are recorded in [`Chat-History-07062026.md`](Chat-History-07062026.md).
- Durable approved decisions are recorded in [`Decision-and-Conversation-Log.md`](Decision-and-Conversation-Log.md).
- Task-specific outcomes and acceptance criteria should stay in the relevant task rather than accumulating in the global instruction file.
- Additional nested instruction files or automated checks should be introduced only when the repository demonstrates a concrete need.
