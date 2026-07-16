# EPIC05 Feature 4 User Story 2

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-04 — Slide-to-Topic Linking

---

# User Story

As an operator,
I want to monitor slide-linking match accuracy, orphan rates, and pipeline dependency timing,
so that I can detect when upstream slide extraction or transcript segmentation delays are degrading link quality.

---

# Business Value

- Ensures linking jobs are not silently starved by delayed upstream events from two independent pipelines
- Provides an early warning system for orphan-rate spikes that signal a matching heuristic regression
- Reduces the operational cost of manually investigating why a session's slides never got linked
- Supports capacity planning for linking jobs during high-volume conference days

---

# Acceptance Criteria

## Functional Criteria
- Linking job status is tracked separately from its two upstream dependencies (slide extraction, transcript segmentation)
- Orphan rate per session and per conference is measurable and trending
- Timeout/failure handling is in place for cases where one upstream dependency never completes

## UX Criteria
- Operator dashboard shows linking latency, orphan rate, and dependency-wait time
- Alerts fire when orphan rate exceeds a defined threshold for a conference
- Sessions stuck waiting on a missing upstream event are visible and drillable

## Technical Criteria
- Linking worker logs which upstream event (or both) triggered the job run
- A configurable timeout forces a partial/best-effort linking pass if one upstream dependency stalls indefinitely
- Reprocessing triggered by an upstream correction is idempotent and does not duplicate `slide_topic_link` records

---

# Preconditions

- Operator has access to the slide-linking monitoring dashboard
- Linking worker is instrumented with dependency-wait and outcome telemetry
- Alert thresholds are configured

---

# Postconditions

- Linking health metrics are recorded and queryable historically
- Alerts are dispatched when orphan rate or dependency-wait time breaches thresholds
- Stuck sessions are identifiable and actionable by the operator

---

# Edge Cases

- Slide extraction fails entirely for a session, leaving transcript segmentation with nothing to link against
- Transcript segmentation is delayed significantly behind slide extraction due to a long transcription queue
- A conference with an unusually high slide-change rate (many slides per minute) increases false-orphan flags
- A timeout-triggered partial linking pass later needs to be redone once the missing dependency arrives
- Reprocessing storms occur if both upstream pipelines emit correction events close together

---

# Telemetry

Track:
- `slide_linking_job_started`
- `slide_linking_job_failed`
- `slide_linking_dependency_timeout`
- `slide_orphan_rate`
- `slide_linking_reprocessing_triggered`

---

# Dependencies

- Event bus / message queue infrastructure
- Observability stack (metrics, dashboards, alerting)
- EPIC-02 Slide Extraction and Transcript Segmentation pipelines

---

# Priority

Medium

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify linking job correctly waits for both upstream events before running the primary matching pass
2. Verify a configurable timeout triggers a best-effort partial linking pass when one dependency stalls
3. Verify orphan rate metric is accurately computed and trended per conference
4. Verify alert fires when orphan rate exceeds the configured threshold
5. Verify a stuck session (missing one dependency) is visible and drillable in the operator dashboard
6. Verify reprocessing after an upstream correction does not duplicate existing link records
7. Verify a high slide-change-rate session does not produce a disproportionate false-orphan spike
8. Verify a delayed dependency arriving after a timeout-triggered partial pass correctly triggers a full relink

---

# Story Variation

This is user story variation 2 for Slide-to-Topic Linking, focusing on operational monitoring of a dual-dependency pipeline and orphan-rate management.

---

# Notes

- This feature's dual-dependency design (two independent upstream pipelines) makes it uniquely prone to timing-related operational issues compared to single-dependency features in this epic
- Orphan rate should be evaluated alongside slide density, since dense-slide sessions naturally produce more low-confidence matches
