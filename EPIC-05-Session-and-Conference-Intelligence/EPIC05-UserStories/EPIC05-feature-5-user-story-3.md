# EPIC05 Feature 5 User Story 3

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-05 — Session Summarization

---

# User Story

As an admin,
I want to control which sessions are eligible for summarization, restrict export/sharing of summaries, and audit regeneration history,
so that AI-generated summaries do not misrepresent sensitive session content or get shared beyond authorized boundaries.

---

# Business Value

- Prevents AI-generated misrepresentation of sensitive or confidential session content from spreading unchecked
- Provides an auditable version history so a disputed summary claim can be traced to its source and generation context
- Ensures summary export/sharing respects the same governance rules as the underlying transcript
- Reduces compliance risk from LLM-generated content that could be misread as an official record

---

# Acceptance Criteria

## Functional Criteria
- Summarization can be disabled at the conference or session level for sensitive content
- Summary export/sharing is permission-checked against the session's visibility settings
- Every regeneration is versioned with model version, trigger cause, and actor (if manually triggered)

## UX Criteria
- Admin view lists summary version history with the ability to compare versions
- A disclaimer is shown alongside AI-generated summaries indicating they are not a verbatim record
- Disabling summarization for a session is discoverable from the same settings area as other session controls

## Technical Criteria
- Summarization eligibility checks are enforced server-side before a job is queued
- Version history records are immutable and retained per the organization's compliance retention policy
- Export API enforces the same permission model as the interactive summary view

---

# Preconditions

- Admin role has content-governance permissions
- Session and its summarization history exist
- Organizational policy defines which session types require summarization to be disabled or restricted

---

# Postconditions

- Version history entry created for every summary generation or regeneration
- Export/share attempts outside permitted scope are denied and logged
- Disabled sessions never produce a summarization job, even if triggered by an automatic event

---

# Edge Cases

- An admin disables summarization for a session after a summary has already been generated and shared
- A disputed summary claim requires reconstructing exactly which transcript version and model version produced it
- A session's sensitivity classification changes mid-conference, requiring retroactive summarization restriction
- Bulk export of summaries across many sessions needs per-session permission and eligibility checks applied individually
- A regeneration triggered by an automated correction event needs to respect a session-level "do not regenerate" flag

---

# Telemetry

Track:
- `session_summary_disabled`
- `session_summary_export_denied`
- `session_summary_version_created`
- `session_summary_shared_externally`
- `session_summary_eligibility_blocked`

---

# Dependencies

- Session-level sharing/visibility and sensitivity classification policy
- Audit logging infrastructure
- LLM inference/orchestration layer

---

# Priority

Medium

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify summarization is not queued for a session where it has been explicitly disabled
2. Verify export is denied for a user without access to the underlying session
3. Verify each regeneration creates an immutable, retrievable version history entry
4. Verify version comparison correctly shows differences between two summary versions
5. Verify a sensitivity classification change correctly blocks future summarization for that session
6. Verify a "do not regenerate" flag is respected even when an automatic correction event would normally trigger regeneration
7. Verify bulk export applies per-session eligibility and permission checks individually
8. Verify the AI-generated disclaimer is present on every summary view, including exported formats

---

# Story Variation

This is user story variation 3 for Session Summarization, focusing on governance over summarization eligibility, export control, and version auditability.

---

# Notes

- Version history is critical for dispute resolution given that summaries are LLM-generated and could misstate what a speaker actually said
- Coordinate sensitivity classification with whatever mechanism the Contact Intelligence and Knowledge Graph systems use, to keep policy consistent across epics
