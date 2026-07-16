# EPIC04 Feature 7 User Story 2

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-07 — Company Association

---

# User Story

As an operator,
I want company matching accuracy and entity-duplication rates monitored,
so that company data doesn't silently fragment or over-consolidate as contact volume grows.

---

# Business Value

- Prevents company entity sprawl, which would defeat the purpose of company-level rollups
- Catches over-aggressive normalization before it merges two genuinely distinct companies
- Gives operators visibility into which normalization rules need tuning
- Protects the accuracy of company-level reporting and network insights

---

# Acceptance Criteria

## Functional Criteria
- Company match accuracy (correct entity linked) is tracked as a rolling metric against a labeled sample
- Company entity duplication rate is monitored and alertable if it exceeds threshold
- Normalization rule changes are versioned and can be evaluated in shadow mode before rollout
- New-company-creation rate is tracked to detect abnormal spikes (indicating matching failures)

## UX Criteria
- Operator dashboard shows company match accuracy and duplication rate trends
- Alerts include specific example pairs when duplication rate spikes
- Normalization rule changelog is reviewable before and after deployment

## Technical Criteria
- Shadow-mode evaluation compares new normalization rules against current production matches without affecting live data
- Duplication detection runs periodically to identify pairs that should have matched but didn't
- Company match/create latency remains within the 500ms budget even as the company index grows

---

# Preconditions

- A labeled sample of correct company matches exists for accuracy benchmarking
- Monitoring and alerting have access to company-matching metrics
- Shadow-mode evaluation infrastructure is available for normalization rule changes

---

# Postconditions

- Company match accuracy and duplication trends are visible on an ongoing basis
- Alerts fire when duplication rate or new-company-creation rate is anomalous
- Normalization rule changes are validated in shadow mode before production rollout

---

# Edge Cases

- A normalization rule change intended to fix one duplication pattern accidentally over-merges a different set of companies
- Company index grows to tens of thousands of entities, stressing match latency
- A batch import (e.g., LinkedIn export) creates a spike in new-company-creation that needs review
- Duplication-detection job itself times out on a very large company index
- Two companies with legitimately identical names in different industries are incorrectly flagged as a duplication candidate
- Company matching accuracy regresses after an upstream change to Identity Resolution's shared matching primitives

---

# Telemetry

Track:
- `company_match_accuracy_rolling`
- `company_duplication_rate`
- `company_new_creation_rate`
- `company_normalization_rule_deployed`
- `company_match_latency_ms`

---

# Dependencies

- Identity Resolution (FEATURE-02), shared matching infrastructure
- Monitoring and alerting system
- Shadow-mode evaluation infrastructure

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify company match accuracy is computed correctly against the labeled benchmark sample
2. Verify duplication-rate alert fires when threshold is exceeded
3. Verify shadow-mode evaluation of a normalization rule change does not affect live company data
4. Verify new-company-creation rate spike is detectable and traceable to its source (e.g., a specific import)
5. Verify company match/create latency stays within budget as the index scales
6. Verify duplication-detection job correctly identifies pairs that should have matched
7. Verify two same-named companies in different industries are not incorrectly auto-merged
8. Verify normalization rule changelog accurately reflects deployed versions

---

# Story Variation

This is user story variation 2 for Company Association, focusing on monitoring match accuracy and preventing entity sprawl or over-consolidation at scale.

---

# Notes

- Company data quality has an outsized impact on the product's "network intelligence" value proposition — it's worth dedicated monitoring separate from contact-level matching
- Shadow-mode evaluation is particularly important here since normalization rule changes can silently ripple across the entire company graph
