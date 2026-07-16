# EPIC-11 User Stories — Security, Privacy & Compliance

This folder contains three user story perspectives for each of EPIC-11's eight features: a user-facing functional story, an operator-facing reliability/observability story, and an admin-facing security/compliance story. Together they cover the full lifecycle of protecting sensitive relationship, media, and conference data — from the moment consent is captured through encryption, retention, access control, audit, jurisdictional rules, secure storage, and self-service privacy rights.

### Feature 1: Recording Consent Management
- `EPIC11-feature-1-user-story-1.md` — User captures third-party recording consent quickly during a live conversation without breaking the networking flow.
- `EPIC11-feature-1-user-story-2.md` — Operator ensures consent state changes propagate reliably to every downstream service that touches audio.
- `EPIC11-feature-1-user-story-3.md` — Admin enforces jurisdiction-aware consent policy with a full audit trail and dispute resolution controls.

### Feature 2: Encryption Platform
- `EPIC11-feature-2-user-story-1.md` — User's recordings and contact data are encrypted automatically with no setup required.
- `EPIC11-feature-2-user-story-2.md` — Operator ensures key rotation and re-encryption jobs run reliably without breaking data availability.
- `EPIC11-feature-2-user-story-3.md` — Admin manages customer-managed keys (CMK), including irreversible revocation for crypto-shredding.

### Feature 3: Data Retention Policies
- `EPIC11-feature-3-user-story-1.md` — User configures how long their raw recordings and images are kept before automatic deletion.
- `EPIC11-feature-3-user-story-2.md` — Operator ensures scheduled retention enforcement jobs run reliably and report accurate outcomes.
- `EPIC11-feature-3-user-story-3.md` — Admin sets org-wide retention policy, enforces legal holds, and resolves cross-border retention conflicts.

### Feature 4: Access Control Framework
- `EPIC11-feature-4-user-story-1.md` — User shares specific conference data with a teammate without exposing their whole account.
- `EPIC11-feature-4-user-story-2.md` — Operator monitors access checks and grant changes for misconfigurations and anomalies.
- `EPIC11-feature-4-user-story-3.md` — Admin enforces least-privilege roles, delegated access, and scoped service-to-service credentials org-wide.

### Feature 5: Audit Logging
- `EPIC11-feature-5-user-story-1.md` — User views a plain-language activity history of who accessed or changed their shared data.
- `EPIC11-feature-5-user-story-2.md` — Operator guarantees audit writes are never silently dropped, even under heavy load.
- `EPIC11-feature-5-user-story-3.md` — Admin maintains a tamper-evident, regulator-ready audit trail with strictly controlled access to raw logs.

### Feature 6: Regional Compliance Engine
- `EPIC11-feature-6-user-story-1.md` — User's recording rules automatically adapt to the correct jurisdiction while traveling to conferences.
- `EPIC11-feature-6-user-story-2.md` — Operator monitors jurisdiction detection accuracy and rule-query service availability.
- `EPIC11-feature-6-user-story-3.md` — Admin governs the controlled, auditable lifecycle of jurisdiction compliance profile publication.

### Feature 7: Secure Media Storage
- `EPIC11-feature-7-user-story-1.md` — User's recordings upload reliably over unreliable Wi-Fi without ever exposing a shareable link.
- `EPIC11-feature-7-user-story-2.md` — Operator ensures integrity checks, tier transitions, and content scanning run reliably with clear failure reporting.
- `EPIC11-feature-7-user-story-3.md` — Admin enforces signed URL scoping and quarantine governance, with incident-response revocation controls.

### Feature 8: Privacy Controls
- `EPIC11-feature-8-user-story-1.md` — User exercises self-service data export, deletion, and do-not-record requests.
- `EPIC11-feature-8-user-story-2.md` — Operator ensures privacy request fulfillment fans out completely across every dependent service.
- `EPIC11-feature-8-user-story-3.md` — Admin enforces regulatory SLA compliance and resolves legal hold conflicts for data subject rights requests.

## Key Themes

- **Consent as a gate, not a checkbox** — recording, storage, and processing are all blocked by default until an active, auditable consent record exists.
- **Fail closed, never fail open** — encryption, access control, and privacy fulfillment all default to blocking action when a dependency (KMS, policy check, fan-out service) is unavailable.
- **Compliance is engineered, not promised** — every regulatory claim (GDPR export/delete, jurisdiction-specific consent, SOC 2 audit trails) maps to a concrete, testable mechanism rather than a policy statement.
- **Admin stories carry the regulatory weight** — the "as an admin" story in each feature is deliberately the most rigorous, since this epic is the authoritative source other epics' compliance-flavored stories reference.
- **Everything is auditable** — consent changes, key rotations, access grants, retention actions, and privacy requests all write synchronously to the shared audit trail, so compliance posture can always be reconstructed after the fact.
