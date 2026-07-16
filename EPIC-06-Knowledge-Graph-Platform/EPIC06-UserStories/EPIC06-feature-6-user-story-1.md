# EPIC06 Feature 6 User Story 1

## Epic
EPIC-06 — Knowledge Graph Platform

## Feature
FEATURE-06 — Interaction Graph Updates

---

# User Story

As a user,
I want my graph to reflect a conversation I just finished within moments, not hours,
so that follow-up suggestions and contact summaries I check right after the conversation are accurate.

---

# Business Value

- Makes the product feel responsive and "alive" during a live conference rather than a batch-processed afterthought.
- Improves the accuracy and timeliness of in-the-moment follow-up suggestions.
- Encourages more frequent app engagement during the conference itself, not just after.
- Builds user trust that the app is actually tracking what's happening in real time.

---

# Acceptance Criteria

## Functional Criteria
- Graph updates for a completed interaction appear within the defined latency target after the interaction ends.
- The user's contact/relationship view reflects the update without requiring a manual refresh or app restart.
- Delayed updates (e.g., due to transcription lag) are queued and eventually applied, never silently dropped.

## UX Criteria
- The user sees an updated relationship state or a clear "processing" indicator, never a stale view presented as current.
- No jarring UI flicker or duplicate entries appear as the update propagates.

## Technical Criteria
- The Graph Agent consumes interaction events from the event bus and applies updates without manual intervention.
- Update latency is measured end-to-end from interaction completion to graph write.
- Retries for failed updates do not produce duplicate or conflicting graph state.

---

# Preconditions

- The user has an active conference session with capture enabled.
- A conversation or session interaction has just completed and been reported by an upstream pipeline.
- The Graph Agent and its dependencies (entity linking, relationship storage) are operational.

---

# Postconditions

- The relevant relationship edge(s) reflect the new interaction shortly after it concludes.
- The user's app view is consistent with the updated graph state.
- The interaction event is marked processed and not reprocessed unnecessarily.

---

# Edge Cases

- Transcription for a conversation takes longer than expected, delaying the graph update beyond the target latency.
- The user checks their contact view in the brief window before the update has propagated.
- A network interruption delays the interaction event from reaching the Graph Agent.
- Two conversations with the same contact conclude in quick succession and must both be reflected correctly.

---

# Telemetry

Track:
- `interaction_event_received`
- `graph_update_applied`
- `processing_lag_seconds`
- `graph_update_failed`

---

# Dependencies

- Event bus for interaction events
- Entity linking and relationship storage services
- Mobile capture and transcription pipelines as event producers

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a completed conversation is reflected in the user's graph within the target latency.
2. Verify the app UI updates without requiring manual refresh.
3. Verify a delayed transcription still results in an eventual, correct graph update.
4. Verify no duplicate or conflicting edges result from rapid consecutive interactions with the same contact.
5. Verify a "processing" state is shown appropriately rather than a stale view presented as current.
6. Verify network interruption during event delivery does not permanently drop the update.
7. Verify end-to-end latency is measured and logged accurately.

---

# Story Variation

This is user story variation 1 for Interaction Graph Updates, focusing on the happy-path experience of near-real-time graph freshness during a live conference.

---

# Notes

- End-to-end latency should be measured from interaction completion, not from event-bus receipt, to reflect true user-perceived freshness.
- A lightweight "syncing" indicator may be worth considering for the rare cases where updates take longer than the target latency.
