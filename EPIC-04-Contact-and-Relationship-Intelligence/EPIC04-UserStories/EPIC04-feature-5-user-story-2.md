# EPIC04 Feature 5 User Story 2

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-05 — Contact Confidence Scoring

---

# User Story

As an operator,
I want source-calibration models for confidence scoring to be monitored and recalibrated based on real correction data,
so that confidence scores stay meaningfully accurate as capture conditions and sources evolve.

---

# Business Value

- Keeps confidence scores honest over time rather than drifting into meaningless noise
- Identifies specific sources (e.g., a particular OCR path) that need engineering attention when correction rates spike
- Prevents confidence-flag fatigue by keeping the flagged-field rate calibrated to actual error rates
- Provides the operational data needed to justify investment in better extraction models

---

# Acceptance Criteria

## Functional Criteria
- Correction telemetry (confirm vs. correct actions) is aggregated per source type on a recurring cadence
- Source calibration profiles are automatically recalibrated when observed correction rates diverge materially from the current baseline
- Recalibration changes are versioned and reversible
- A sudden spike in correction rate for a specific source triggers an operator alert

## UX Criteria
- Operator dashboard shows correction rate trends per source type over time
- Recalibration events are visible in a changelog with before/after baseline values
- Alerts include enough detail (source, magnitude of drift) to triage quickly

## Technical Criteria
- Recalibration job runs on a defined schedule (e.g., weekly) without requiring a full redeploy
- Calibration profile versioning supports rollback to a prior baseline
- Aggregation excludes low-sample-size sources from triggering recalibration on noise

---

# Preconditions

- Correction telemetry (confirm/correct actions) is being captured consistently
- Recalibration job scheduler is provisioned
- Monitoring and alerting have access to per-source correction metrics

---

# Postconditions

- Source calibration baselines reflect recent, real correction behavior
- Recalibration history is available for trend analysis and rollback
- Alerts have fired for any source with anomalous drift

---

# Edge Cases

- A new capture source (e.g., a new OCR model version) has too little correction data to calibrate confidently yet
- Correction rate spikes temporarily due to a one-off bad batch (e.g., a poorly lit venue) rather than a real model regression
- Two sources' correction data get conflated due to a tagging bug, corrupting both calibration profiles
- Recalibration job needs to run mid-conference without disrupting live confidence scoring
- Rollback to a prior calibration baseline is needed after a bad recalibration
- Correction telemetry volume is very low for a rarely-used source (e.g., calendar-sourced contacts)

---

# Telemetry

Track:
- `source_calibration_recomputed`
- `source_correction_rate_tracked`
- `source_calibration_drift_alert_triggered`
- `source_calibration_rollback_performed`

---

# Dependencies

- Correction telemetry pipeline (confirm/correct actions)
- Recalibration job scheduler
- Monitoring and alerting system
- Calibration profile versioning storage

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify correction telemetry is aggregated correctly per source type
2. Verify recalibration adjusts the source baseline when correction rate diverges materially
3. Verify a low-sample-size source does not trigger recalibration on insufficient data
4. Verify alert fires when correction rate for a source spikes beyond threshold
5. Verify recalibration changelog records before/after baseline values
6. Verify rollback to a prior calibration baseline restores previous scoring behavior
7. Verify recalibration job runs on schedule without impacting live scoring latency
8. Verify a tagging bug that conflates two sources' data is detectable via anomalous calibration output

---

# Story Variation

This is user story variation 2 for Contact Confidence Scoring, focusing on the operational feedback loop that keeps calibration accurate over time.

---

# Notes

- Calibration quality directly determines whether users trust the flagging system at all — stale baselines are worse than no confidence scoring
- Consider a minimum sample-size threshold before any source's baseline is allowed to shift automatically
