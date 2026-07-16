# EPIC09 Feature 4 User Story 2

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-04 — Behavioral Coaching

---

# User Story

As an operator,
I want monitoring of the coaching recommendation generation pipeline and its guardrail rejection rate,
so that low-quality or ungrounded recommendations are caught before they reach users at scale.

---

# Business Value

- Protects users from receiving hallucinated or poorly grounded coaching advice
- Provides early warning when LLM prompt or model changes degrade recommendation quality
- Reduces the operational risk of a widely-delivered but factually wrong recommendation
- Gives the team data to iterate on prompt/guardrail design based on real rejection patterns

---

# Acceptance Criteria

## Functional Criteria
- Every recommendation generation attempt is logged with outcome (delivered, guardrail-rejected, generation-failed)
- Guardrail rejection reasons are categorized (ungrounded claim, off-tone, goal-conflict, repetition) for trend analysis
- Failed generations trigger retry with backoff before falling back to a reduced/no-recommendation state
- Batch generation jobs are monitored for completion rate across the full eligible user population

## UX Criteria
- Operator dashboard shows generation success rate, guardrail rejection rate by category, and delivery latency
- Alert thresholds configurable for rejection-rate spikes or generation-failure spikes
- Sample rejected recommendations are viewable (with evidence) for prompt-tuning review

## Technical Criteria
- Guardrail rejection events are logged with the full candidate text and the specific rule that triggered rejection
- Correlation IDs link a recommendation attempt to its source evidence and to the user session
- Retry logic includes backoff and a circuit breaker if the LLM provider is degraded

---

# Preconditions

- Operator has monitoring and pipeline-configuration permissions
- Guardrail rule set is deployed and instrumented for categorized logging
- Alerting system connected to coaching pipeline health metrics

---

# Postconditions

- Pipeline health metrics (success rate, rejection rate, latency) available on the operator dashboard
- Guardrail rejection patterns available for prompt/model tuning review
- Operator alerted when rejection or failure rate crosses threshold
- Incident and rejection history retained for post-mortem and model iteration

---

# Edge Cases

- LLM provider outage causes a spike in generation failures across the entire eligible user population
- Guardrail rule change causes an unexpected spike in rejections for a previously stable recommendation type
- Batch generation job for a large multi-track conference times out partway through
- Rejected recommendation text contains sensitive evidence that must be handled carefully even in the rejection log
- A prompt update silently increases repetition rate, evading rejection but reducing recommendation value
- Circuit breaker trips during peak post-conference generation window, delaying delivery for many users simultaneously

---

# Telemetry

Track:
- `coaching_generation_attempted`
- `coaching_generation_failed`
- `coaching_guardrail_rejected`
- `coaching_guardrail_rejection_category`
- `coaching_batch_job_completed`
- `operator_coaching_dashboard_viewed`

---

# Dependencies

- LLM inference platform with guardrail/grounding tooling
- Monitoring and alerting infrastructure
- Batch job orchestration framework
- Conference Scoring, Interaction Quality Analysis, Follow-up Completion Tracking, Missed Opportunity Detection, Goal Tracking (upstream evidence sources)

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify every generation attempt is logged with a categorized outcome
2. Verify guardrail rejections are correctly categorized by rejection reason
3. Verify retry with backoff activates on transient LLM provider failures
4. Verify circuit breaker trips and recovers correctly during simulated provider degradation
5. Verify batch generation job reports accurate completion rate across the eligible population
6. Verify operator dashboard reflects rejection-rate trends accurately and in near real time
7. Verify alert fires when rejection rate crosses the configured threshold
8. Verify rejected recommendation samples are retrievable (with evidence) for prompt-tuning review without exposing them to end users

---

# Story Variation

This is user story variation 2 for Behavioral Coaching, focusing on operational monitoring of the recommendation generation pipeline and guardrail effectiveness.

---

# Notes

- Guardrail rejection rate is a leading quality indicator — a low rejection rate could mean the guardrails are too permissive, not that generation quality is high
- Peak post-conference generation load (many conferences ending around the same time) should be load-tested explicitly
- Rejected recommendation logs are sensitive (contain draft coaching text tied to real user evidence) — restrict access accordingly
