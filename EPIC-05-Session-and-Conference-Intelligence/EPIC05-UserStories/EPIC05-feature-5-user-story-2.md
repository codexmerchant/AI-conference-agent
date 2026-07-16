# EPIC05 Feature 5 User Story 2

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-05 — Session Summarization

---

# User Story

As an operator,
I want to monitor summarization latency, groundedness scores, and regeneration volume,
so that I can catch hallucination regressions and control LLM inference cost as conference volume scales.

---

# Business Value

- Protects against hallucinated summary content reaching users at scale
- Provides visibility into LLM inference cost, which scales directly with conference and session volume
- Enables proactive capacity planning for summarization queues during high-traffic conference days
- Surfaces regeneration storms early, before they compound into runaway compute cost

---

# Acceptance Criteria

## Functional Criteria
- Groundedness score distribution is tracked per conference and globally
- Regeneration volume (automatic vs. manual) is tracked separately to detect correction-storm patterns
- Summarization job latency and failure rate are tracked against the defined SLA

## UX Criteria
- Operator dashboard surfaces groundedness trend, latency percentile, and regeneration volume over time
- Alerts fire when groundedness drops below threshold or regeneration volume spikes abnormally
- Low-groundedness summaries are drillable to inspect the specific ungrounded claims

## Technical Criteria
- Every summarization job logs `session_id`, `correlation_id`, model version, and groundedness score
- Regeneration triggers are tagged with their cause (manual request, diarization correction, transcript correction)
- Inference cost per summarization job is tracked to support budget monitoring

---

# Preconditions

- Operator has access to the summarization monitoring dashboard
- Summarization pipeline is instrumented with groundedness and cost telemetry
- Alert thresholds are configured

---

# Postconditions

- Summarization health and cost metrics are recorded and queryable historically
- Alerts are dispatched when groundedness, latency, or regeneration volume breaches thresholds
- Root-cause data is available for any low-groundedness or failed summarization run

---

# Edge Cases

- A model version upgrade causes an unexpected drop in groundedness scores across many sessions
- A cascade of upstream corrections (diarization, transcript) triggers a regeneration storm for a single session
- Conference-day traffic spike causes summarization queue backlog, delaying summary availability
- A specific conference's technical jargon causes systematically lower groundedness scores
- Cost per session unexpectedly rises due to a change in default length-mode generation behavior

---

# Telemetry

Track:
- `session_summary_job_failed`
- `session_summary_groundedness_score`
- `session_summary_regeneration_triggered`
- `session_summary_inference_cost`
- `session_summary_queue_backlog`

---

# Dependencies

- LLM inference/orchestration layer
- Observability stack (metrics, dashboards, alerting, cost tracking)
- EPIC-02 correction event stream

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify groundedness score is correctly computed and logged for each summarization job
2. Verify alert fires when average groundedness drops below the configured threshold
3. Verify regeneration triggers are correctly tagged by cause (manual, diarization correction, transcript correction)
4. Verify a regeneration storm scenario is detectable via the regeneration volume metric
5. Verify queue backlog metric accurately reflects a simulated conference-day traffic spike
6. Verify inference cost is tracked per session and aggregable per conference
7. Verify a low-groundedness summary is drillable to the specific flagged claims
8. Verify a model version change is visible in the telemetry to support correlation with a groundedness shift

---

# Story Variation

This is user story variation 2 for Session Summarization, focusing on operational monitoring of hallucination risk and inference cost management.

---

# Notes

- Groundedness monitoring is this feature's single most important operational signal given the reputational risk of hallucinated content
- Coordinate cost telemetry with finance/ops stakeholders, since summarization is likely the most compute-intensive feature in this epic
