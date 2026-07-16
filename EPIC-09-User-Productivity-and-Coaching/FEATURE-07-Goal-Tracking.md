# FEATURE-07 — Goal Tracking

## Epic
EPIC-09 — User Productivity & Coaching

---

# 1. Objective

Let users set specific, measurable goals for a conference (e.g., number of qualified meetings, sessions to attend, follow-ups to complete) and track progress against those goals in real time and after the event.

---

# 2. Problem Statement

Without explicit goals, scoring, coaching, and missed-opportunity detection have nothing concrete to measure against — "good performance" is undefined. Users also tend to attend conferences without a clear plan, reducing focus and ROI.

---

# 3. Feature Overview

Goal Tracking lets users define one or more goals per conference across supported types (meetings, sessions, leads, follow-ups, custom), tracks progress automatically from captured activity where possible, and surfaces real-time progress plus a final goal-completion summary that feeds Conference Scoring, Missed Opportunity Detection, and Behavioral Coaching.

---

# 4. Key Functionalities

## Goal creation
Lets users define goals with a type, target value, and optional deadline before or during a conference.

## Automatic progress tracking
Increments goal progress automatically from captured interactions, follow-ups, and sessions where the activity type matches the goal.

## Manual progress adjustment
Lets users manually adjust progress for goals that can't be auto-tracked (e.g., "close 1 deal").

## Progress notifications
Notifies users of milestone progress (50%, 100%) and at-risk goals nearing deadline with low progress.

## Goal outcome summary
Produces a post-conference summary of goals achieved, missed, or abandoned.

---

# 5. Primary Use Cases

## Use Case 1
User sets a goal of "meet 5 potential design-partner customers" before attending and tracks live progress via the app.

## Use Case 2
User sets a goal of "attend 3 sessions on AI agents" and the system auto-checks off sessions as they're captured.

## Use Case 3
User reviews a post-conference summary showing 4 of 5 networking-goal meetings achieved, with the 5th flagged as a missed opportunity.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to set specific goals before or during a conference and track my progress,
so that I stay focused on what matters most to me at the event.

### Acceptance Criteria
- User can create a goal with type, target value, and optional deadline
- Progress updates automatically for auto-trackable goal types within 5 minutes of a matching captured activity
- User can view all active goals and progress on a single dashboard

## User Story 2
As a goal-driven attendee,
I want to be notified when I'm at risk of missing a goal,
so that I can adjust my remaining conference time accordingly.

### Acceptance Criteria
- System sends an at-risk notification when a goal's remaining time-to-deadline makes on-pace completion unlikely
- Notification includes the current progress and suggested action
- User can dismiss, adjust the goal target, or extend the deadline from the notification

---

# 7. User Workflow

1. User creates a goal (type, target value, deadline) before or during a conference
2. System matches incoming captured activity (interactions, sessions, follow-ups) against active goal types
3. Progress is incremented automatically where a match is detected, or left for manual update
4. User views live progress on a goals dashboard throughout the conference
5. System sends milestone and at-risk notifications as appropriate
6. At conference end, goals are finalized as achieved, partially achieved, or missed
7. Goal outcomes feed into Conference Scoring, Missed Opportunity Detection, and Behavioral Coaching

---

# 8. UI / UX Requirements

- Goal creation form with type picker, target value, and optional deadline
- Goals dashboard with progress bars and status (on-track, at-risk, achieved, missed)
- Milestone and at-risk push notifications
- Manual progress adjustment control for non-auto-trackable goals
- Post-conference goal outcome summary card

---

# 9. Technical Requirements

## Frontend
Goal creation, dashboard, and outcome summary views with progress bars, status indicators, and manual adjustment controls, updating in near-real-time as captured activity is processed.

## Backend
A goals service persists Goal records, subscribes to interaction/session/follow-up completion events to auto-increment progress for matching goal types, evaluates at-risk status on a scheduled basis, and finalizes goal outcomes at conference end.

## AI/ML
A lightweight classification step matches captured activity against goal type/criteria (e.g., does this interaction count toward a "meet potential customers" goal) using contact attributes and interaction context; no heavy inference required beyond this matching step.

## Infrastructure
Event-driven progress updates from the interaction/session/follow-up pipelines; scheduled job for at-risk evaluation and deadline finalization.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Contact & Relationship Intelligence (EPIC-04) | Match interactions against goal criteria (e.g., contact role/company) |
| Follow-up Completion Tracking (Feature 3) | Auto-track follow-up-related goals |
| Interaction Quality Analysis (Feature 2) | Provide interaction context for goal-matching |
| Notification Service | Deliver milestone and at-risk notifications |
| POST /goals | Create a new goal |
| GET /users/{id}/goals | List a user's goals, optionally filtered by conference/status |
| PATCH /goals/{goal_id} | Update goal target, deadline, or manual progress |
| GET /goals/{goal_id}/progress | Retrieve detailed progress and contributing activity |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| Goal | goal_id, user_id, conference_id, goal_type (meetings, sessions, leads, follow_ups, custom), title, target_value, current_value, deadline, status (active, at_risk, achieved, partially_achieved, missed, abandoned), created_at, finalized_at |
| GoalProgressEvent | event_id, goal_id, source_type (interaction, session, follow_up, manual), source_reference_id, increment_value, recorded_at |

---

# 12. Security & Privacy

- Goals and progress data are private to the user by default; sharing with a manager/team requires explicit opt-in
- Goal-matching logic does not expose the other party's private data beyond what's already accessible to the user
- Custom goal text is stored encrypted and not used for cross-user analytics without anonymization
- Users can delete a goal and its progress history at any time

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Goal creation latency | <1 sec |
| Auto progress update latency | <5 min after matching activity |
| At-risk evaluation frequency | Every 30 min during active conference |
| Goal dashboard load time | <1 sec |

---

# 14. Edge Cases

- Goal type doesn't map cleanly to any auto-trackable activity (fully manual goal)
- Multiple captured interactions ambiguously match the same goal, risking double-counting
- User changes a goal's target or deadline mid-conference after progress has accrued
- Goal deadline falls after conference end date (multi-week goal spanning post-conference follow-up)
- User abandons a goal, requiring it to be excluded from coaching evidence
- Conflicting goals (e.g., "maximize session attendance" and "maximize networking time") within the same conference

---

# 15. Dependencies

- Contact & Relationship Intelligence (EPIC-04)
- Follow-up Completion Tracking (Feature 3, this epic)
- Interaction Quality Analysis (Feature 2, this epic)
- Notification platform

---

# 16. Risks

- Auto-tracking miscounts progress, eroding trust in goal accuracy
- Goal-setting friction discourages adoption if the creation flow is too heavy
- Rigid goal structures don't accommodate qualitative or exploratory conference objectives
- At-risk notifications perceived as nagging if poorly tuned

---

# 17. Telemetry & Analytics

Track:
- `goal_created`
- `goal_progress_updated`
- `goal_milestone_reached`
- `goal_at_risk_notified`
- `goal_finalized`
- `goal_abandoned`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Users setting at least one goal per conference | >40% |
| Auto-tracking accuracy (vs. manual correction) | >85% |
| Goal achievement rate | >50% |
| At-risk notification action rate | >30% |

---

# 19. Future Enhancements

- AI-suggested goals based on conference agenda and user history
- Team/shared goals for coordinated account-based conference strategy
- Goal templates by role (sales, product, recruiting)

---

# 20. Open Questions

- Should goals be required to enable scoring/coaching, or fully optional?
- How should conflicting or overly ambitious goals be flagged to the user at creation time?
- Should goal data ever roll up to team/manager dashboards by default?
