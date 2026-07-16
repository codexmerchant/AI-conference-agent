# EPIC07 Feature 6 User Story 2

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-06 — Action-Item Extraction

---

# User Story

As an operator,
I want extraction accuracy and deduplication behavior to be monitored and tunable,
so that the checklist stays trustworthy instead of accumulating noisy, duplicate, or misattributed items at scale.

---

# Business Value

- Protects the core trust proposition of a checklist feature, which fails fast if it becomes noisy or unreliable
- Enables data-driven tuning of extraction precision/recall instead of anecdotal complaints
- Reduces duplicate-item clutter that would otherwise erode user confidence in the feature
- Provides the operational visibility needed to catch a regression after a prompt/model change

---

# Acceptance Criteria

## Functional Criteria
- Extraction precision (relevant items / total flagged) and owner-inference accuracy are tracked as measurable, reportable metrics
- Deduplication logic is monitored for both under-merging (duplicate items) and over-merging (distinct commitments incorrectly collapsed)
- Manual-addition rate is tracked as a proxy signal for extraction misses
- Extraction job failures are retried and logged with correlation IDs back to the source summary

## UX Criteria
- Operator dashboard shows extraction precision, dedupe effectiveness, and manual-addition rate trends over time
- Dashboard supports drill-down to sample flagged items for manual quality review

## Technical Criteria
- Extraction runs asynchronously and is idempotent per summary to avoid duplicate items on retry
- Dedupe logic is versioned and testable independent of the extraction model itself
- Due-date resolution logic is unit-testable against a range of relative time expressions and timezones

---

# Preconditions

- Completion, dismissal, and manual-addition events are captured for aggregation
- Monitoring dashboard has access to extraction quality metrics
- Correlation IDs propagate from source summary through to extracted items

---

# Postconditions

- Extraction precision and dedupe effectiveness are visible and queryable over time
- Alerts fire when manual-addition rate spikes, signaling a likely extraction regression
- Extraction failures are retried or clearly surfaced as failed

---

# Edge Cases

- A prompt/model change causes a sudden spike in over-extraction (noisy items) across many users
- Dedupe logic incorrectly merges two genuinely distinct commitments from the same conversation
- Timezone-resolution bug causes due dates to be off by one day for users near a date-line boundary
- Extraction backlog builds up during a high-volume conference day
- Correlation ID is lost between the source summary and the extracted action item, breaking traceability

---

# Telemetry

Track:
- Extraction job success/failure rate
- Extraction precision and owner-inference accuracy
- Dedupe merge/split event rate
- Manual-addition rate (extraction-miss proxy)
- Extraction job latency and backlog depth

---

# Dependencies

- FEATURE-01 Meeting Summaries
- Monitoring and alerting platform
- Model/prompt version registry

---

# Priority

Medium

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify extraction precision metric is computed correctly from flagged vs. relevant item feedback
2. Verify dedupe logic correctly merges true duplicates without collapsing distinct commitments
3. Verify due-date resolution is correct across a range of timezones and relative time expressions
4. Verify manual-addition rate spike triggers an alert for investigation
5. Verify extraction job retries on transient failure without producing duplicate items
6. Verify correlation IDs propagate correctly from source summary to extracted action item
7. Verify extraction backlog is visible and alertable during high-volume periods
8. Verify a prompt-version rollback stops further extraction from the regressed version

---

# Story Variation

This is user story variation 2 for Action-Item Extraction, focusing on extraction quality monitoring, deduplication correctness, and pipeline reliability.

---

# Notes

- Manual-addition rate is a uniquely useful signal here: a rising rate of user-added items is a leading indicator of an extraction quality regression before precision metrics fully reflect it.
- Timezone correctness for due-date inference deserves dedicated unit-test coverage given how error-prone relative date resolution typically is.
