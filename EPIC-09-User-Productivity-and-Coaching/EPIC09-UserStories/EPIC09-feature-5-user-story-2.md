# EPIC09 Feature 5 User Story 2

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-05 — Missed Opportunity Detection

---

# User Story

As an operator,
I want detection precision and false-positive rate monitored continuously,
so that missed-opportunity flags stay trustworthy instead of creating review-queue fatigue.

---

# Business Value

- Protects user trust by keeping false-positive rates within an acceptable range
- Gives the team a data-driven basis for tuning confidence thresholds per detection type
- Prevents review-queue fatigue that would otherwise cause users to ignore the feature entirely
- Provides an early signal when an upstream data source (attendee lists, agenda data) degrades detection quality

---

# Acceptance Criteria

## Functional Criteria
- Every detection scan logs total instances flagged, broken down by type and confidence tier
- User confirm/dismiss actions are tracked and rolled into a precision metric per detection type
- Detection scans triggered by degraded upstream data (e.g., missing attendee list) are flagged distinctly from normal scans
- Confidence thresholds are configurable per detection type without requiring a full deployment

## UX Criteria
- Operator dashboard shows precision (confirmed / flagged), dismissal rate, and false-positive complaint rate by detection type
- Threshold tuning changes are logged with before/after precision comparison
- Alerts configurable for precision dropping below a defined floor for any detection type

## Technical Criteria
- Detection scan jobs are idempotent and safely re-runnable without duplicating MissedOpportunity records
- Scan performance is monitored against the 24-hour post-conference SLA and the 2-minute on-demand SLA
- Detection logic changes are versioned so precision trends can be attributed to specific model/rule changes

---

# Preconditions

- Operator has monitoring and threshold-configuration permissions
- Sufficient volume of confirm/dismiss feedback exists to compute meaningful precision metrics
- Detection pipeline instrumented with per-type, per-confidence-tier logging

---

# Postconditions

- Detection precision and false-positive metrics available on the operator dashboard, broken down by type
- Threshold tuning changes are auditable with before/after precision impact
- Operator alerted when any detection type's precision drops below the configured floor
- Scan performance history retained for SLA compliance reporting

---

# Edge Cases

- A conference with an unusually complete attendee list produces an artificially high detection volume, skewing precision metrics
- A conference with no attendee list at all produces zero contact-based detections, appearing as a false "success" rather than a data gap
- Threshold tuning for one detection type inadvertently affects volume for another type sharing underlying signals
- Detection scan job re-run after a partial failure creates near-duplicate MissedOpportunity records
- Sudden spike in dismissals correlates with a recent upstream schema change rather than genuine false positives
- Confidence tier boundaries are miscalibrated, causing borderline-confidence instances to cluster near a threshold edge

---

# Telemetry

Track:
- `missed_opportunity_scan_completed`
- `missed_opportunity_precision_computed`
- `missed_opportunity_threshold_changed`
- `missed_opportunity_data_gap_detected`
- `missed_opportunity_dismissal_rate`
- `operator_missed_opportunity_dashboard_viewed`

---

# Dependencies

- Detection scan job infrastructure
- Monitoring and alerting platform
- Goal Tracking, Contact & Relationship Intelligence, and Context & Intelligence Engine as upstream data sources
- Model/rule versioning framework

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify detection scans log flagged instance counts broken down by type and confidence tier
2. Verify precision metric correctly computes from confirm/dismiss feedback per detection type
3. Verify a data-gap scenario (missing attendee list) is distinctly flagged rather than reported as a clean scan
4. Verify threshold tuning changes are logged with a before/after precision comparison
5. Verify re-running a failed scan does not create duplicate MissedOpportunity records
6. Verify alert fires when a detection type's precision drops below the configured floor
7. Verify scan performance is tracked against both the 24-hour and 2-minute SLAs
8. Verify detection logic version changes are correctly attributed in precision trend analysis

---

# Story Variation

This is user story variation 2 for Missed Opportunity Detection, focusing on operational precision monitoring and threshold tuning.

---

# Notes

- Distinguish clearly between "no missed opportunities detected" and "insufficient data to detect anything" in both metrics and user-facing copy
- Precision tuning should be done per detection type, not globally, since contact-based and session-based detection have very different signal quality
- A sudden dismissal spike is a leading indicator worth investigating before it becomes a trust problem
