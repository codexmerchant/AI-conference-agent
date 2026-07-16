# EPIC10 Feature 4 User Story 3

## Epic
EPIC-10 — Cloud Infrastructure & DevOps

## Feature
FEATURE-04 — Event Streaming Platform

---

# User Story

As an admin,
I want topic-level ACLs and schema governance enforced so only authorized services can produce or consume sensitive event types,
so that raw transcript and contact-identity events are never exposed to a service that doesn't need them.

---

# Business Value

- Limits exposure of sensitive attendee data (transcripts, identity resolution results) to only the services that require it
- Reduces the risk of a compromised or misconfigured service reading unrelated sensitive event streams
- Supports compliance requirements for data minimization and least-privilege access
- Prevents accidental breaking changes to shared event schemas from reaching production consumers

---

# Acceptance Criteria

## Functional Criteria
- Every topic has an explicit ACL defining which services may produce and which may consume.
- Schema changes to an existing topic are reviewed and validated for backward compatibility before being registered.
- Sensitive event types (e.g., containing raw transcript text) are flagged and require justification for new consumer access.

## UX Criteria
- Admin can view a complete matrix of topic-to-service ACLs from a single dashboard.
- Requesting access to a sensitive topic surfaces a clear approval workflow, not a silent grant.

## Technical Criteria
- ACL enforcement happens at the broker level, not only at the client-library level, so it cannot be bypassed by a misconfigured client.
- Breaking schema changes are rejected automatically by the schema registry's compatibility check.
- All ACL and schema registry changes are logged in an immutable audit trail.

---

# Preconditions

- Schema registry is configured with compatibility enforcement enabled.
- Topic ACLs are defined and enforced at the broker/cluster level.
- Admin has access to the ACL and schema governance dashboard.

---

# Postconditions

- Every topic's producer/consumer access is explicitly authorized and auditable.
- No unreviewed breaking schema change reaches a shared topic.
- Sensitive topic access requests are recorded with approver and justification.

---

# Edge Cases

- A new agent service needs read access to a sensitive topic for a legitimate new feature, requiring a timely but reviewed approval.
- A schema change is backward-compatible for most fields but removes one field a downstream consumer still relies on.
- An ACL misconfiguration accidentally grants a low-trust service access to a sensitive topic.
- A service's ACL access is revoked while it still has an active, in-progress consumer group, requiring graceful handling.
- Audit trail must reconcile ACL changes made during an emergency incident bypass.

---

# Telemetry

Track:
- `topic_acl_granted`
- `topic_acl_revoked`
- `schema_compatibility_check_failed`
- `sensitive_topic_access_requested`

---

# Dependencies

- Schema registry service
- Identity/auth platform for service-to-service authorization
- Monitoring and observability stack (Feature 8) for audit log storage

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify a service without a granted ACL cannot produce to a restricted topic.
2. Verify a service without a granted ACL cannot consume from a restricted topic.
3. Verify a breaking schema change is rejected by the compatibility check.
4. Verify sensitive topic access requires an approval workflow, not a silent grant.
5. Verify ACL and schema changes are recorded in an immutable audit log.
6. Verify revoking a service's ACL while it has an active consumer group is handled gracefully.
7. Verify the ACL dashboard accurately reflects the current topic-to-service access matrix.
8. Verify emergency ACL bypass, if used, is logged and flagged for post-hoc review.
9. Verify a schema change removing a field still in use by a downstream consumer is caught before registration.

---

# Story Variation

This is user story variation 3 for Event Streaming Platform, focusing on the security and governance perspective of controlling access to sensitive event topics and safe schema evolution.

---

# Notes

- Sensitive topic classification should be explicit metadata on the topic, not inferred from naming convention alone.
- Consider periodic automated review of granted ACLs to catch unused or stale access grants.
