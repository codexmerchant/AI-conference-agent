# EPIC14 Feature 5 User Story 1

## Epic
EPIC-14 — Desktop Analysis Workspace

## Feature
FEATURE-05 — Report Editing Studio

---

# User Story

As a user,
I want to edit my AI-generated conference report and verify statements against their source transcripts,
so that the final document matches my voice and I can trust its accuracy before sharing it.

---

# Business Value

- Increases trust in AI-generated output by making it easy to verify and correct
- Produces polished, stakeholder-ready documents without leaving the app
- Reduces time spent recreating reports in external word processors
- Preserves the link between generated content and its evidentiary source

---

# Acceptance Criteria

## Functional Criteria

- User can open any generated report in an editable, block-based view
- User can edit text, reorder sections, and switch templates without losing content
- AI-generated statements show an inline citation linking to their source transcript segment
- Edits autosave and are captured in a version history

## UX Criteria

- Citation markers are unobtrusive but discoverable, expanding on hover or click
- Clicking a citation navigates directly to the exact transcript segment
- Draft status (draft/in-review/final) is clearly visible at all times

## Technical Criteria

- Draft content loads and saves via `GET/PUT /desktop/reports/{id}/draft`
- Every save creates a retrievable version snapshot
- Citation links resolve correctly even after minor formatting edits to surrounding text

---

# Preconditions

- User is authenticated and owns the report being edited
- The report has completed AI generation and is available as an editable draft

---

# Postconditions

- Edited content is persisted as the canonical draft version
- Version history reflects all meaningful edits with attribution
- Report status updates to reflect user progress toward "Final"

---

# Edge Cases

- User edits a section while the AI is mid-regeneration of that same section
- A citation link breaks because the source transcript segment was edited or deleted elsewhere
- Template switch causes loss of formatting not supported by the new template
- User requests export while the draft has unsaved changes
- Autosave conflicts with a manual save triggered at nearly the same moment
- Report contains a very large number of sections, testing outline navigation performance

---

# Telemetry

Track:
- `report_draft_opened`
- `report_section_edited`
- `report_citation_clicked`
- `report_marked_final`

---

# Dependencies

- EPIC-07 Reporting & Output Generation (source report content, templates)
- EPIC-05 Session & Conference Intelligence (transcript sources for citations)
- Desktop authentication and sync service

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a generated report opens correctly as an editable block-based draft
2. Verify text edits, section reordering, and template switching all preserve content
3. Verify citation markers correctly link to and navigate to their source transcript segment
4. Verify autosave persists edits without requiring a manual save action
5. Verify version history captures each meaningful edit with correct attribution
6. Verify marking a report "Final" updates its status consistently across the app
7. Verify a broken citation (deleted source) degrades gracefully rather than erroring
8. Verify large reports with many sections remain navigable via the outline sidebar

---

# Story Variation

This is user story variation 1 for Report Editing Studio, focusing on the happy-path editing and citation-verification experience.

---

# Notes

- Citation linking is the feature's key trust-building mechanism and should be prioritized in both design polish and QA coverage
- Consider a visual marker distinguishing AI-original text from user-edited text, similar to the transcript review workspace
