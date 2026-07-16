# EPIC09 Feature 3 User Story 1

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-03 — Follow-up Completion Tracking

---

# User Story

As a user,
I want to track which follow-up actions from my conference interactions I've completed versus still owe,
so that I don't let valuable connections go cold.

---

# Business Value

- Converts good intentions ("I should follow up") into tracked, completable tasks
- Reduces lost relationship value from forgotten follow-ups after a busy conference
- Gives users a single queue to manage post-conference execution instead of scattered notes
- Feeds a concrete completion-rate signal into the User Score and coaching engine

---

# Acceptance Criteria

## Functional Criteria
- A FollowUpTask is automatically created for every actionable next step surfaced from a captured interaction
- Tasks support status transitions: pending, in-progress, completed, overdue, dismissed
- User can mark a task complete manually, or the system auto-detects completion via integration signals
- Duplicate follow-up tasks for the same contact/interaction are prevented or merged

## UX Criteria
- Follow-up queue supports filtering by status (pending, overdue, completed, dismissed)
- One-tap "mark complete" and "snooze" actions are available on each task
- Draft content (email/message) is previewable inline where applicable
- Overdue tasks are visually distinguished with a clear urgency indicator

## Technical Criteria
- `POST /follow-ups/{task_id}/complete` returns deterministic status codes and updates `completed_at`
- Task creation latency after interaction capture is under 2 minutes
- Auto-completion detection integrates with connected email/calendar accounts using least-privilege scopes

---

# Preconditions

- Interaction has been captured and analyzed for actionable next steps
- User is authenticated and owns the contact/interaction the task is tied to
- Relevant integrations (email/calendar) are connected if auto-detection is desired

---

# Postconditions

- FollowUpTask record persisted with correct status and timestamps
- Task visible in the user's follow-up queue immediately after creation
- `follow_up_task_created` and `follow_up_task_completed` telemetry events recorded as applicable
- Completion data available as input to Conference Scoring (Feature 1) and Behavioral Coaching (Feature 4)

---

# Edge Cases

- Follow-up completed outside any integrated channel (in-person, phone call) and never marked complete in-app
- Duplicate tasks created for the same contact from two separate interactions at the same conference
- Contact explicitly asks for no further contact, requiring the task to be dismissed rather than completed
- Integration auth token expires mid-tracking, breaking auto-completion detection silently
- User deletes the underlying contact after a follow-up task was already created for them
- Conference spans a holiday period, distorting what counts as "overdue"

---

# Telemetry

Track:
- `follow_up_task_created`
- `follow_up_task_completed`
- `follow_up_task_overdue`
- `follow_up_auto_detected`
- `follow_up_dismissed`
- `follow_up_queue_viewed`

---

# Dependencies

- Interaction Quality Analysis (Feature 2, this epic) for actionable-item extraction
- Contact & Relationship Intelligence (EPIC-04)
- Email/Calendar integration layer
- Notification platform

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a FollowUpTask is created automatically from an interaction with a clear actionable next step
2. Verify manual "mark complete" correctly updates task status and completed_at timestamp
3. Verify auto-completion detection correctly closes a task when a follow-up email is sent via a connected account
4. Verify duplicate task creation is prevented for the same interaction
5. Verify dismissal with a reason correctly removes the task from the active pending queue
6. Verify overdue status is applied correctly once the due date passes
7. Verify follow-up queue filtering by status returns the correct task sets
8. Verify task creation completes within the 2-minute latency target

---

# Story Variation

This is user story variation 1 for Follow-up Completion Tracking, focusing on the happy-path user experience of managing and completing follow-up tasks.

---

# Notes

- Auto-detection should be treated as a convenience, not a guarantee — always leave a manual override available
- Draft previews inline reduce friction significantly versus requiring users to leave the app to act
- Consider batching follow-up task creation into a single post-day digest rather than one notification per interaction
