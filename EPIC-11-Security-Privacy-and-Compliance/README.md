# EPIC-11 — Security, Privacy & Compliance Feature Files

| Feature | File |
|---|---|
| FEATURE-01 — Recording Consent Management | `FEATURE-01-Recording-Consent-Management.md` |
| FEATURE-02 — Encryption Platform | `FEATURE-02-Encryption-Platform.md` |
| FEATURE-03 — Data Retention Policies | `FEATURE-03-Data-Retention-Policies.md` |
| FEATURE-04 — Access Control Framework | `FEATURE-04-Access-Control-Framework.md` |
| FEATURE-05 — Audit Logging | `FEATURE-05-Audit-Logging.md` |
| FEATURE-06 — Regional Compliance Engine | `FEATURE-06-Regional-Compliance-Engine.md` |
| FEATURE-07 — Secure Media Storage | `FEATURE-07-Secure-Media-Storage.md` |
| FEATURE-08 — Privacy Controls | `FEATURE-08-Privacy-Controls.md` |

## Implementation Notes
- Consent state is the gate for the entire capture pipeline: no raw audio/image may cross from the local rolling buffer into durable storage (EPIC-02) without an active `ConsentRecord`, and revocation must propagate to transcription, storage, and graph services within a bounded SLA, not just block future writes.
- Encryption keys are scoped per user/org (envelope encryption with per-object DEKs wrapped by a KEK in the KMS); DEKs rotate on a 90-day cadence and KEKs on a 12-month cadence, with dual-key overlap windows so in-flight objects never fail to decrypt mid-rotation.
- Data retention, regional compliance, and privacy-controls deletion all write to the same underlying job queue so that a single deletion or expiry event cannot race a legal hold or an active AI-processing job — the pipeline checks a hold/consent flag before every destructive operation, not just at request time.
- Every feature in this epic depends on Audit Logging (Feature 5) as a shared, non-optional side effect — access checks, consent changes, key rotations, and privacy requests all emit immutable audit entries synchronously, not best-effort, so compliance reporting is never reconstructed after the fact.
- Regional Compliance Engine (Feature 6) is the single source of truth for jurisdiction-specific rules; Access Control, Retention, and Consent features read from it rather than hard-coding regulation logic, so a new jurisdiction (e.g., a new US state consent law) is added in one place and takes effect everywhere.
