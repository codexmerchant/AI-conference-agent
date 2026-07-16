# EPIC09 Feature 7 User Story 1

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-07 — Goal Tracking

---

# User Story

As a user,
I want to set specific goals before or during a conference and track my progress toward them,
so that I stay focused on what matters most to me at the event.

---

# Business Value

- Gives users a concrete plan to execute against instead of attending conferences reactively
- Anchors the rest of the epic (scoring, missed-opportunity detection, coaching) to the user's actual intent
- Increases the odds a conference delivers measurable value against a stated objective
- Provides a satisfying, motivating progress-tracking experience during the event itself

---

# Acceptance Criteria

## Functional Criteria
- User can create a goal with a type (meetings, sessions, leads, follow-ups, custom), target value, and optional deadline
- Progress updates automatically for auto-trackable goal types within 5 minutes of a matching captured activity
- User can manually adjust progress for goal types that can't be auto-tracked
- Goals are finalized as achieved, partially achieved, or missed at conference end

## UX Criteria
- Goals dashboard shows all active goals with progress bars and status (on-track, at-risk, achieved, missed)
- Goal creation form is fast to complete (under 30 seconds for a standard goal)
- Post-conference summary clearly shows goal outcomes

## Technical Criteria
- `POST /goals` and `GET /users/{id}/goals` return deterministic status codes
- Auto-tracking matches captured activity against goal criteria without double-counting the same activity for multiple goals of the same type
- Goal state transitions (active → at_risk → achieved/missed) are persisted with timestamps

---

# Preconditions

- User is authenticated and has an active or upcoming conference
- User has access to the goal creation flow
- Relevant activity-generating features (interactions, sessions, follow-ups) are operational for auto-tracking

---

# Postconditions

- Goal record persisted with current progress and status
- GoalProgressEvent entries recorded for each contributing activity
- `goal_created` and `goal_progress_updated` telemetry events recorded
- Goal outcome data available as input to Conference Scoring, Missed Opportunity Detection, and Behavioral Coaching

---

# Edge Cases

- Goal type doesn't map cleanly to any auto-trackable activity, requiring a fully manual goal
- Multiple captured interactions ambiguously match the same goal, risking double-counting
- User changes a goal's target or deadline mid-conference after progress has already accrued
- Goal deadline falls after the conference end date (e.g., a follow-up-completion goal spanning post-conference weeks)
- User abandons a goal partway through, requiring it to be excluded from downstream coaching evidence
- Two goals conflict in intent (e.g., maximize session attendance vs. maximize networking time)

---

# Telemetry

Track:
- `goal_created`
- `goal_progress_updated`
- `goal_milestone_reached`
- `goal_finalized`
- `goal_abandoned`
- `goals_dashboard_viewed`

---

# Dependencies

- Contact & Relationship Intelligence (EPIC-04)
- Follow-up Completion Tracking (Feature 3, this epic)
- Interaction Quality Analysis (Feature 2, this epic)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a goal can be created with type, target value, and optional deadline
2. Verify auto-tracking correctly increments progress for a matching captured interaction
3. Verify manual progress adjustment works for a non-auto-trackable custom goal
4. Verify a goal correctly transitions to "achieved" once its target value is reached
5. Verify a goal correctly transitions to "missed" if the deadline passes below target
6. Verify changing a goal's target mid-conference correctly recalculates progress percentage
7. Verify two similar interactions are not double-counted toward the same goal
8. Verify post-conference summary accurately reflects all goal outcomes

---

# Story Variation

This is user story variation 1 for Goal Tracking, focusing on the happy-path user experience of setting and tracking conference goals.

---

# Notes

- Keep goal creation lightweight — a heavy form will suppress adoption of what's meant to be a quick, motivating action
- Auto-tracking accuracy directly determines whether users trust the rest of this epic's derived metrics, since goals anchor them all
- Consider goal templates by common role (sales, product, recruiting) to reduce time-to-first-goal for new users
