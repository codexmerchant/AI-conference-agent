# FEATURE-06 — Action-Item Extraction

## Epic
EPIC-07 — Reporting & Output Generation

---

# 1. Objective

Extract discrete, assignable action items — commitments like "send the deck," "make an intro to X," or "schedule a follow-up call" — from meeting and session transcripts/summaries, and surface them as a trackable checklist.

---

# 2. Problem Statement

Commitments made in passing conversation ("I'll send that over," "let's grab 15 minutes next week") are made dozens of times per conference day and are almost never written down in the moment. Without explicit capture, there is no consolidated task list to track follow-through, and the user quietly breaks promises they intended to keep.

---

# 3. Feature Overview

An extraction pass runs over each finalized meeting summary (and session summary where applicable) to identify actionable commitments, infer an owner (self, contact, or mutual), infer or request a due date, and assign a priority. Extracted items are deduplicated across repeated mentions and exposed as a checklist that feeds Daily Summaries (FEATURE-03) and Conference Reports (FEATURE-04).

---

# 4. Key Functionalities

## Commitment phrase detection
Identifies actionable commitment language within transcript/summary text using pattern and intent-based extraction.

## Owner and due-date inference
Infers whether the commitment belongs to the user, the contact, or both, and infers a due date from explicit or relative time references ("next week," "before Friday").

## Checklist and completion tracking
Presents extracted items as a checklist with manual and auto-completion (e.g., auto-complete when a related follow-up is sent).

## Reminder scheduling
Schedules reminders for open action items approaching their inferred due date.

## Deduplication
Merges multiple extractions of the same commitment mentioned more than once in a conversation or across a summary regeneration.

---

# 5. Primary Use Cases

## Use Case 1
User's summary contains "I'll introduce you to our CTO" and it appears as an open action item owned by the user with no explicit due date.

## Use Case 2
A contact says "I'll send you the case study by Friday," which is captured as an item owned by the contact with a due date inferred from "Friday."

## Use Case 3
User completes an action item by sending the referenced follow-up, and the item auto-marks as done.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want commitments made during conversations automatically captured as action items,
so that I don't rely on memory to follow through on what I said I'd do.

### Acceptance Criteria
- Action items are extracted from the meeting summary without requiring manual entry.
- Each item shows its source interaction/contact and the original commitment language.
- Items support manual completion and clearly show status (open/in progress/done/dismissed).

## User Story 2
As a user with many parallel commitments across a conference,
I want items assigned an owner and due date automatically where inferable,
so that I can prioritize what's actually on me versus waiting on someone else.

### Acceptance Criteria
- Owner is correctly inferred as self, contact, or mutual in the majority of cases.
- Due dates are inferred from explicit relative time references when present.
- Items without an inferable due date are clearly marked as undated rather than defaulted incorrectly.

---

# 7. User Workflow

1. Meeting or session summary finalizes (FEATURE-01 / EPIC-05).
2. Action-item extraction runs over the summary/transcript text.
3. Commitment phrases are identified and classified by owner and inferred due date.
4. Extracted items are deduplicated against existing open items for the same contact/interaction.
5. `ActionItem` records are created and surfaced in the checklist view.
6. User reviews, edits owner/due date if needed, or marks complete/dismissed.
7. Open items roll up into the Daily Summary and, later, the Conference Report.

---

# 8. UI / UX Requirements

- Checklist view with filters by owner (self/contact/mutual), status, and due date.
- Each item links back to the source interaction and shows the original commitment quote.
- Swipe/tap to mark complete, snooze, or dismiss.
- Overdue items visually distinguished from upcoming ones.
- Manual "add action item" option for anything the extraction missed.

---

# 9. Technical Requirements

## Frontend
Checklist component (React/SwiftUI) with filter controls, source-quote expansion, and quick-action gestures for completing/dismissing items.

## Backend
Action-Item Extraction Service runs as a post-processing step after summary generation, writing `ActionItem` records with dedupe logic keyed on interaction + normalized commitment text; completion status updates are also triggered automatically by related events (e.g., a linked Follow-Up Draft being sent).

## AI/ML
A commitment-extraction prompt/model identifies actionable statements and classifies owner/due-date candidates; relative date expressions are resolved against the conference's local timezone and date range.

## Infrastructure
Extraction runs asynchronously immediately after summary generation; reminder scheduling uses a delayed job queue keyed on inferred due dates.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Meeting Summaries Service (FEATURE-01) | Supplies summary/transcript text for extraction |
| Session Intelligence (EPIC-05) | Supplies session-level commitments (e.g., speaker offers to share slides) |
| Follow-Up Drafts (FEATURE-02) | Auto-completes items when a related follow-up is sent |
| Calendar / Reminders (Plugin/Integration Layer) | Optionally syncs due-dated items to the user's calendar or reminders app |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ActionItem | action_item_id, source_type (meeting/session/daily), source_id, contact_id (nullable), description, owner (self/contact/mutual), due_date (nullable), priority (low/medium/high), status (open/in_progress/done/dismissed), detected_at, completed_at, completion_method (manual/auto) |

---

# 12. Security & Privacy

- Action items derived only from consented recordings, same as source summaries.
- Items involving a contact's commitment are not shared back to that contact without explicit user action.
- Calendar/reminder sync requires explicit per-integration opt-in and minimum-scope OAuth permissions.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Extraction latency after summary generation | <15 sec |
| Owner-inference accuracy | >85% |
| Due-date inference accuracy (when a time reference is present) | >80% |

---

# 14. Edge Cases

- Vague commitment with no clear owner ("someone should follow up on this").
- Commitment stated then explicitly retracted later in the same conversation.
- Duplicate extraction from both the raw transcript and the generated summary being processed separately.
- Commitment referencing an external tool ("I'll ping you on Slack") that doesn't need in-app tracking.
- Non-English commitment phrasing not well covered by the extraction model.
- Summary regeneration re-triggers extraction, requiring dedupe against already-completed items.

---

# 15. Dependencies

- FEATURE-01 Meeting Summaries
- EPIC-05 Session & Conversation Intelligence
- FEATURE-02 Follow-Up Drafts (for auto-completion signal)
- Calendar/Reminders integration (Plugin/Integration Layer)

---

# 16. Risks

- Over-extraction creates checklist noise from casual pleasantries misread as commitments.
- Under-extraction misses genuine commitments, undermining trust in the checklist.
- Incorrect owner inference causes the user to think a contact owes them something they actually owe.

---

# 17. Telemetry & Analytics

Track:
- `action_item_extracted`
- `action_item_completed`
- `action_item_dismissed`
- `action_item_auto_completed`
- `action_item_manually_added`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Extraction precision (relevant items / total flagged) | >85% |
| Action item completion rate within due window | >50% |
| Manual addition rate (proxy for extraction misses) | <15% of total items |

---

# 19. Future Enhancements

- Smart nudges suggesting a follow-up draft directly from an open action item.
- Cross-conference recurring-commitment detection (e.g., repeated "let's catch up" with no follow-through).
- Priority auto-tuning based on the linked contact's relationship/opportunity score.

---

# 20. Open Questions

- Should undated items get a default reminder cadence, or remain unscheduled until the user sets one?
- How should mutual-owner items be displayed to avoid ambiguity about who acts first?
- Should dismissed items be permanently deleted or retained for later analysis of missed commitments?
