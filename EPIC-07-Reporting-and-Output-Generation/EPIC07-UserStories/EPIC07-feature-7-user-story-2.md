# EPIC07 Feature 7 User Story 2

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-07 — Executive Summaries

---

# User Story

As an operator,
I want visibility into executive-summary generation and sharing activity, including share-link health,
so that I can ensure the feature's outward-facing sharing mechanism is functioning correctly and not silently failing.

---

# Business Value

- Ensures the feature's core sharing mechanism (tokenized links) works reliably since a broken share link directly undermines the point of the feature
- Provides visibility into which audience tiers are actually being used, informing future template investment
- Catches redaction-rule regressions before they result in an inappropriate share
- Reduces support burden from "my colleague says the link doesn't work" complaints

---

# Acceptance Criteria

## Functional Criteria
- Share-link creation, access, and expiration events are logged and monitorable
- A spike in share-link access failures (expired/invalid) triggers an alert for investigation
- Redaction-rule application is logged per generated summary so a regression is traceable to a specific tier/version
- Generation failures are retried and logged with correlation IDs back to the source Conference Report

## UX Criteria
- Operator dashboard shows generation volume and success rate broken down by audience tier
- Dashboard shows share-link access patterns (opened, expired, revoked) in aggregate

## Technical Criteria
- Share-link tokens are generated with correct expiry and are validated server-side on every access, not just at creation
- Redaction-rule engine version is recorded on every generated summary for audit and regression tracing
- Generation is idempotent per (report, tier, length) combination to avoid duplicate summary proliferation on retry

---

# Preconditions

- Monitoring dashboard has access to generation and share-link telemetry
- Redaction-rule engine versioning is implemented
- Alerting thresholds for share-link failure rate are configured

---

# Postconditions

- Generation and sharing activity are fully observable by tier and time window
- Alerts fire on abnormal share-link failure rates or redaction-rule regressions
- Failed generations are retried or clearly surfaced as failed

---

# Edge Cases

- A redaction-rule engine update inadvertently under-redacts the leadership tier
- Share-link access spikes suspiciously from a single IP range, suggesting link forwarding beyond the intended recipient
- Generation request storm occurs right after a major conference's report generation completes
- A share link is accessed after expiration and must fail closed, not silently degrade
- Redaction-rule version used for an already-shared summary is later found to be defective, requiring a retroactive audit of what was shared

---

# Telemetry

Track:
- Executive summary generation volume and success rate by tier
- Share-link creation, access, expiration, and revocation events
- Redaction-rule engine version per generated summary
- Share-link access failure rate
- Generation job retry and failure count

---

# Dependencies

- FEATURE-04 Conference Reports
- Sharing/permissions service
- Monitoring and alerting platform
- Redaction-rule engine

---

# Priority

Medium

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify share-link creation, access, and expiration events are all logged correctly
2. Verify alert fires on an abnormal spike in share-link access failures
3. Verify redaction-rule engine version is recorded on every generated summary
4. Verify a redaction-rule regression is traceable to the specific summaries affected
5. Verify generation is idempotent per (report, tier, length) combination under retry
6. Verify expired share links fail closed rather than serving stale content
7. Verify dashboard accurately reflects generation volume and success rate by tier
8. Verify a retroactive audit can identify all summaries shared under a defective redaction-rule version

---

# Story Variation

This is user story variation 2 for Executive Summaries, focusing on share-link reliability, redaction-rule observability, and generation pipeline monitoring.

---

# Notes

- Redaction-rule versioning is the most operationally important control here — it's what makes a retroactive audit of "what did we accidentally over-share" possible after a rule regression.
- Share-link failure monitoring doubles as a security signal (unexpected access patterns), not just a reliability one.
