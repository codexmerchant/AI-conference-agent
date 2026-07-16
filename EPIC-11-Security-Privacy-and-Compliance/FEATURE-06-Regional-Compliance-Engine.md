# FEATURE-06 — Regional Compliance Engine

## Epic
EPIC-11 — Security, Privacy & Compliance

---

# 1. Objective

Provide a single, authoritative source of jurisdiction-specific privacy and recording rules (GDPR, CCPA/CPRA, PIPEDA, LGPD, US state two-party consent laws) that every other EPIC-11 feature reads from to determine required consent type, retention limits, and data subject rights, based on where a session or subject is located.

---

# 2. Problem Statement

Conference attendees and events span the US, EU, and other regions with materially different recording-consent and data-protection laws — a conversation recorded in a one-party consent state may be illegal if the counterpart is physically in a two-party consent state, and EU attendees carry GDPR rights regardless of where the app's servers live. Hard-coding these rules into individual features would make them inconsistent and impossible to update safely as laws change.

---

# 3. Feature Overview

A rules engine that maintains structured compliance profiles per jurisdiction, detects the applicable jurisdiction(s) for a given session using device location, IP, or manual selection, and exposes a query API that other features (Consent, Retention, Access Control, Privacy Controls) call to get the specific rules that apply. Profiles are versioned so rule changes can be rolled out and audited like code.

---

# 4. Key Functionalities

## Jurisdiction detection
Determines the applicable jurisdiction(s) for a session using GPS, IP geolocation, or manual override, with a confidence score.

## Compliance profile registry
Maintains structured, versioned rule sets per jurisdiction covering consent type, retention limits, and data subject rights.

## Multi-jurisdiction conflict resolution
Applies the most protective applicable rule when a session spans multiple jurisdictions (e.g., recorder and subject in different states).

## Rule query API
Exposes jurisdiction rules to Consent, Retention, Access Control, and Privacy Controls features on demand.

## Regulation update management
Supports adding or updating a jurisdiction's profile without a full application release, with an audit trail of rule changes.

---

# 5. Primary Use Cases

## Use Case 1
User opens Conference Mode in California and the engine flags the session as requiring all-party consent.

## Use Case 2
A user based in the EU triggers GDPR-specific data subject rights (export, erasure) automatically surfaced in Privacy Controls.

## Use Case 3
A cross-border virtual session between a UK attendee and a US attendee applies the more protective rule set.

---

# 6. User Stories

## User Story 1
As a user,
I want the app to automatically apply the correct recording consent rules for wherever I am,
so that I don't have to know the law myself to stay compliant.

### Acceptance Criteria
- Jurisdiction is detected automatically at session start with a visible fallback for manual selection.
- Consent Management feature receives the correct required consent type (one-party vs. all-party) before recording begins.
- User is shown a plain-language explanation of why a given consent flow was required.

## User Story 2
As an operator,
I want jurisdiction detection and rule application to be observable and monitored for drift,
so that I can catch misclassified sessions before they create legal exposure.

### Acceptance Criteria
- Every jurisdiction determination is logged with the detection method and confidence score.
- A dashboard shows detection confidence distribution and manual-override rate over time.
- Low-confidence detections trigger a fallback prompt for manual confirmation rather than silently guessing.

---

# 7. User Workflow

1. User starts a conference session; the app requests location permission or uses IP-based geolocation as fallback.
2. The engine determines the applicable jurisdiction(s) and confidence score.
3. If confidence is low or multiple jurisdictions plausibly apply, the app prompts the user to confirm or select manually.
4. The engine returns the applicable compliance profile to the Consent Management feature before recording is allowed to persist.
5. Retention and Access Control features query the same profile for retention caps and applicable subject rights.
6. If a session spans multiple detected jurisdictions, the engine applies the most protective rule across all of them.
7. Compliance/legal staff can update a jurisdiction's profile through an internal tool; the change is versioned and audit-logged.

---

# 8. UI / UX Requirements

- Unobtrusive jurisdiction indicator during active recording (e.g., "Two-party consent required here").
- Manual jurisdiction override option when detection confidence is low or the user is traveling.
- Plain-language explanation of applicable rules surfaced at the point they affect the user's workflow.
- Internal compliance admin tool for managing jurisdiction profiles, separate from the consumer app.

---

# 9. Technical Requirements

## Frontend
Lightweight jurisdiction indicator and manual-override picker in the capture UI; no complex legal UI exposed to end users directly.

## Backend
A compliance profile registry service with a versioned rules store and a query API consumed by Consent, Retention, Access Control, and Privacy Controls; a jurisdiction detection service combining GPS, IP, and manual input signals.

## AI/ML
No inference required for core rule application; a lightweight heuristic/confidence model may combine multiple location signals to produce the jurisdiction confidence score.

## Infrastructure
Rule definitions stored as versioned, reviewable configuration (not hard-coded in application logic) so updates can be deployed independently of app releases and rolled back if incorrect.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| POST /compliance/detect-jurisdiction | Determine applicable jurisdiction(s) for a session |
| GET /compliance/profile?region= | Fetch the compliance profile for a jurisdiction |
| GET /compliance/rules/{regulation} | Fetch specific rule details for a named regulation (GDPR, CCPA, etc.) |
| POST /compliance/profile/update (internal) | Create or update a jurisdiction profile version |
| Device Location Services / IP Geolocation Provider | Source signals for jurisdiction detection |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ComplianceProfile | profile_id, jurisdiction_code, regulation (GDPR\|CCPA\|PIPEDA\|LGPD\|state_law), data_residency_region, consent_requirement (one_party\|all_party), retention_max_days, retention_min_days, subject_rights[], version, effective_at |
| JurisdictionDetection | detection_id, session_id, method (gps\|ip\|manual), detected_region, confidence, resolved_at |

---

# 12. Security & Privacy

- Location signals used for jurisdiction detection are processed transiently and not retained beyond what is needed to log the detection outcome.
- Manual jurisdiction overrides are logged with the user's justification for audit purposes.
- Compliance profile updates require reviewed, permissioned access — not ad hoc edits by any engineer.
- The engine defaults to the most protective applicable rule whenever detection is ambiguous.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Jurisdiction detection latency | <1 sec |
| Rule query response time | <100ms p95 |
| Profile update propagation to all services | <5 minutes |

---

# 14. Edge Cases

- Attendee travels between sessions across state lines mid-conference, changing the applicable jurisdiction mid-recording.
- Recording party and subject are in different jurisdictions with conflicting consent requirements.
- GPS is unavailable, disabled, or spoofed by a VPN, degrading detection confidence.
- A new regulation takes effect requiring retroactive reclassification of already-recorded sessions.
- Conference is fully virtual with attendees in many jurisdictions simultaneously (e.g., a multi-region webinar).
- Jurisdiction profile update introduces a rule conflict with an in-flight session's already-established consent basis.

---

# 15. Dependencies

- Recording Consent Management (Feature 1)
- Data Retention Policies (Feature 3)
- Privacy Controls (Feature 8)
- Device location services / IP geolocation provider

---

# 16. Risks

- Misdetected jurisdiction could invalidate the legal basis for a recording or misapply retention limits.
- Legal landscape changes faster than profile updates can be reviewed and shipped.
- Multi-jurisdiction virtual sessions may have no single clearly "most protective" rule, requiring judgment calls.

---

# 17. Telemetry & Analytics

Track:
- `jurisdiction_detected`
- `jurisdiction_manual_override`
- `low_confidence_detection_flagged`
- `compliance_profile_queried`
- `compliance_profile_updated`
- `multi_jurisdiction_conflict_resolved`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Jurisdiction detection accuracy | >98% |
| Manual override rate | <10% |
| Rule query availability | >99.9% |

---

# 19. Future Enhancements

- Automatic re-evaluation and reclassification of historical sessions when new regulations take effect.
- Predictive jurisdiction pre-loading based on the user's registered conference itinerary.

---

# 20. Open Questions

- How should the engine resolve genuinely conflicting rules between two jurisdictions with no clear "more protective" answer?
- Should jurisdiction detection default to the device's home region or the conference venue's registered location when signals disagree?
- Who owns the legal review process for adding a new jurisdiction profile, and what is the SLA for responding to a new law?
