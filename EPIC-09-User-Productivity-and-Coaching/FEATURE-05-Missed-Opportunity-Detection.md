# FEATURE-05 — Missed Opportunity Detection

## Epic
EPIC-09 — User Productivity & Coaching

---

# 1. Objective

Detect specific moments where a user likely missed a valuable networking, content, or follow-up opportunity at a conference, so they can learn from and reduce these gaps going forward.

---

# 2. Problem Statement

Attendees rarely realize in the moment that they skipped a session relevant to their goals, failed to approach a high-value contact who was nearby, or let a promising conversation end without securing a follow-up commitment. These missed opportunities compound silently across every conference.

---

# 3. Feature Overview

Missed Opportunity Detection cross-references the user's goals, agenda, captured interactions, and contact/session data against what the user actually did, flagging specific missed-opportunity instances (unengaged high-value contact, skipped relevant session, conversation ended without a follow-up ask) for review and coaching input.

---

# 4. Key Functionalities

## Unengaged high-value contact detection
Flags contacts who matched the user's target profile/goals and were present at the conference but never interacted with.

## Skipped-session detection
Flags sessions highly relevant to the user's interests/goals that were on the agenda but not attended or captured.

## Incomplete-conversation detection
Flags interactions that ended without a captured next step despite signals of mutual interest.

## Declined/unactioned introduction detection
Flags introduction opportunities (via mutual contacts or system suggestions) that were offered but not pursued.

## Missed opportunity review queue
Surfaces detected instances for user review, confirmation, or dismissal.

---

# 5. Primary Use Cases

## Use Case 1
System flags that a target-account VP was at the same happy hour but the user never connected with them.

## Use Case 2
System flags that a session directly matching the user's stated learning goal was skipped in favor of a lower-relevance session.

## Use Case 3
System flags a promising sales conversation that ended without exchanging contact info or scheduling a next step.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to be shown specific opportunities I likely missed during the conference,
so that I can course-correct next time and possibly still act on some of them.

### Acceptance Criteria
- Missed opportunities are detected and surfaced within 24 hours of conference end
- Each flagged instance includes the type, related entity, and confidence score
- User can dismiss a flagged instance with a reason (not relevant, already handled, etc.)

## User Story 2
As a sales professional,
I want to know if a target-account contact was present but I never engaged them,
so that I can still reach out or plan differently for next time.

### Acceptance Criteria
- System cross-references attendee/contact lists against the user's target account or goal list where available
- Detected unengaged high-value contacts are ranked by estimated relevance/value
- User can initiate a follow-up directly from a flagged missed-opportunity instance

---

# 7. User Workflow

1. Conference agenda, attendee data (where available), user goals, and captured interactions are aggregated
2. Detection engine compares planned/available opportunities against actual captured engagement
3. Instances exceeding a confidence threshold are created as MissedOpportunity records
4. Flagged instances appear in a review queue, ranked by estimated value
5. User reviews each instance, confirms relevance, or dismisses with a reason
6. Confirmed instances feed into Behavioral Coaching (Feature 4) as evidence
7. User can trigger a follow-up action directly from a confirmed missed opportunity where still actionable

---

# 8. UI / UX Requirements

- Missed opportunity review queue with type icon, confidence indicator, and one-line explanation
- Quick actions: dismiss with reason, mark as still actionable, initiate follow-up
- Clear framing as opportunity for learning, not failure ("you might have missed...")
- Filter by type (contact, session, conversation, introduction)

---

# 9. Technical Requirements

## Frontend
Review queue and detail views present flagged instances with confidence indicators, dismiss/action controls, and links into the relevant contact or session record.

## Backend
A detection service consumes goal, agenda, attendee/contact, and interaction data, runs rule-based and ML-scored detection passes, persists MissedOpportunity records above a confidence threshold, and exposes review/resolution endpoints.

## AI/ML
A relevance-matching model scores contact/session fit against user goals (embedding similarity over profile and goal text); an interaction-completeness classifier detects conversations that show interest signals but lack a captured next step.

## Infrastructure
Batch detection job runs post-conference and optionally at intervals during multi-day conferences; confidence thresholds tunable per detection type to control false-positive rate.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Goal Tracking (Feature 7) | Source user goals/target profiles for relevance matching |
| Contact & Relationship Intelligence (EPIC-04) | Source attendee/contact and interaction history data |
| Context & Intelligence Engine agenda/session data (EPIC-03) | Source session relevance and attendance data |
| Follow-up Completion Tracking (Feature 3) | Trigger follow-up task creation from actionable missed opportunities |
| GET /users/{id}/missed-opportunities | List flagged missed-opportunity instances |
| POST /missed-opportunities/scan | Trigger on-demand detection scan |
| PATCH /missed-opportunities/{id}/resolve | Confirm, dismiss, or act on a flagged instance |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| MissedOpportunity | opportunity_id, user_id, conference_id, opportunity_type (unengaged_high_value_contact, skipped_session, incomplete_conversation, unactioned_introduction), related_entity_id, related_entity_type, confidence_score, detected_at, status (flagged, confirmed, dismissed, actioned), dismissal_reason |

---

# 12. Security & Privacy

- Attendee/contact proximity data used for detection only where the user has legitimate access (e.g., public attendee list, opted-in badge data)
- No detection performed using data the user isn't authorized to see (e.g., other attendees' private schedules)
- Dismissal reasons stored to improve detection precision, not shared externally
- Feature respects conference/venue opt-out signals for attendee-matching data

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Detection scan latency post-conference | <24 hours |
| On-demand scan latency | <2 min |
| False positive rate | <20% |
| Detection scan success rate | >97% |

---

# 14. Edge Cases

- Attendee list unavailable or incomplete for the conference, limiting contact-based detection
- User intentionally skipped a session for a valid reason (conflict, health) that shouldn't be flagged as a "miss"
- High-value contact definition is stale relative to the user's current goals
- Duplicate flags for the same underlying missed opportunity across detection types
- Detected opportunity is already stale/unactionable by the time it's surfaced
- User has no defined goals, reducing detection precision to generic relevance heuristics

---

# 15. Dependencies

- Goal Tracking (Feature 7, this epic)
- Contact & Relationship Intelligence (EPIC-04)
- Context & Intelligence Engine session/agenda data (EPIC-03)
- Follow-up Completion Tracking (Feature 3, this epic)

---

# 16. Risks

- False positives erode trust and feel intrusive ("how does it know who I didn't talk to")
- Detection framed poorly could feel guilt-inducing rather than constructive
- Reliance on incomplete attendee data produces inconsistent detection quality across conferences
- Over-detection creates review-queue fatigue

---

# 17. Telemetry & Analytics

Track:
- `missed_opportunity_detected`
- `missed_opportunity_confirmed`
- `missed_opportunity_dismissed`
- `missed_opportunity_actioned`
- `missed_opportunity_scan_completed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Detection precision (confirmed / flagged) | >70% |
| User action rate on confirmed instances | >25% |
| Review queue completion rate | >50% within 7 days |
| False positive complaint rate | <5% |

---

# 19. Future Enhancements

- Real-time in-conference alerts (e.g., "target contact is nearby, checked in 10 min ago")
- Predictive pre-conference opportunity briefing based on attendee list
- Team-level missed-opportunity rollups for account-based conference strategy

---

# 20. Open Questions

- Should real-time detection be pursued given the privacy sensitivity of live-location/proximity data?
- How should the system source "high-value contact" criteria without an explicit target-account list?
- What confidence threshold balances usefulness against false-positive fatigue?
