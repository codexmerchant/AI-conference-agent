# EPIC05 Feature 3 User Story 2

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-03 — Quote Extraction

---

# User Story

As an operator,
I want to monitor quote extraction throughput, acceptance rate, and flagged-incorrect reports,
so that I can catch scoring model regressions or misattribution issues before they spread across many sessions.

---

# Business Value

- Protects the reputational risk of surfacing an incorrect or misattributed quote at scale
- Ensures extraction throughput keeps pace with conference-day capture volume
- Provides the feedback loop needed to retrain or retune the quotability scoring model
- Reduces the operational cost of manually auditing every extracted quote

---

# Acceptance Criteria

## Functional Criteria
- Extraction job success/failure rate is tracked per conference and globally
- Flagged-incorrect reports are aggregated and routed for review within a defined SLA
- Acceptance rate (quotes kept/shared vs. discarded) is tracked as a proxy for scoring quality

## UX Criteria
- Operator dashboard surfaces extraction latency, acceptance rate, and flag volume trends
- Alerts fire when flag volume spikes for a given conference or time window
- Flagged quotes are drillable to the underlying transcript for root-cause review

## Technical Criteria
- Every extraction job logs `session_id`, `correlation_id`, candidate count, and final selected count
- Flag reports capture the flag reason (misattribution, out-of-context, offensive, other)
- Deduplication effectiveness is measurable via a tracked duplicate-quote rate metric

---

# Preconditions

- Operator has access to the quote extraction monitoring dashboard
- Extraction pipeline is instrumented with job- and quote-level telemetry
- Flag-reporting mechanism is available to end users

---

# Postconditions

- Extraction health metrics are recorded and queryable historically
- Alerts are dispatched when flag volume or failure rate breaches thresholds
- Flagged quotes are routed to a review queue with sufficient context for triage

---

# Edge Cases

- A conference-day traffic spike causes extraction queue backlog and delayed quote availability
- A scoring model update causes a sudden shift in quote style, spiking flag reports temporarily
- A misattributed quote is flagged after being shared externally, requiring a takedown/correction workflow
- Duplicate quote rate rises after a transcript re-segmentation changes sentence boundaries
- Flag reports cluster around a single non-English session, suggesting a language-specific scoring issue

---

# Telemetry

Track:
- `quote_extraction_job_failed`
- `quote_extraction_latency`
- `quote_flag_reported`
- `quote_flag_reviewed`
- `quote_duplicate_rate`

---

# Dependencies

- Observability stack (metrics, dashboards, alerting)
- Content moderation/review queue infrastructure
- EPIC-02 Transcript Segmentation

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify extraction job failure is correctly logged with session and correlation identifiers
2. Verify flag reports capture the correct flag reason from the user-facing report action
3. Verify alert fires when flag volume exceeds the configured threshold within a time window
4. Verify duplicate-quote rate metric accurately reflects deduplication effectiveness
5. Verify dashboard correctly surfaces extraction latency trends during a simulated traffic spike
6. Verify a flagged quote is drillable to its full transcript context for reviewer triage
7. Verify a takedown/correction workflow removes a shared, misattributed quote from external export
8. Verify flag clustering by language or session type is visible in the operator dashboard

---

# Story Variation

This is user story variation 2 for Quote Extraction, focusing on operational monitoring, quality assurance, and misattribution risk management.

---

# Notes

- Treat flag-reported quotes as a priority review queue, since a shared misattributed quote carries outsized reputational risk
- Track acceptance rate over time as the primary signal for whether the scoring model needs retuning
