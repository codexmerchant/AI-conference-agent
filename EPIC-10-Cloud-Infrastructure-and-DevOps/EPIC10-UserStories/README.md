# EPIC-10 — Cloud Infrastructure & DevOps User Stories

This folder contains three user stories per feature in EPIC-10, each told from a different perspective on the same underlying capability: a platform engineer or developer building against the feature (functional, happy-path), an on-call operator running it in production (reliability, monitoring, incident response), and an admin responsible for its security and compliance posture (access control, auditability, data protection). Together, the three stories cover a feature end-to-end — build it, run it, and govern it.

### Feature 1: API Gateway Layer
- `EPIC10-feature-1-user-story-1.md` — Platform engineer adding and versioning routes without service redeploys.
- `EPIC10-feature-1-user-story-2.md` — Operator monitoring live traffic, rate-limit consumption, and upstream error rates.
- `EPIC10-feature-1-user-story-3.md` — Admin enforcing reviewed, audited changes to routing and auth policy.

### Feature 2: Container Platform
- `EPIC10-feature-2-user-story-1.md` — Platform engineer deploying a new service version with configured autoscaling.
- `EPIC10-feature-2-user-story-2.md` — Operator monitoring node pool saturation, pod evictions, and autoscaler behavior.
- `EPIC10-feature-2-user-story-3.md` — Admin enforcing namespace RBAC, image signing, and vulnerability scanning at admission control.

### Feature 3: CI/CD Pipeline
- `EPIC10-feature-3-user-story-1.md` — Developer getting automatic build, test, and staging deployment on merge.
- `EPIC10-feature-3-user-story-2.md` — Operator executing a fast, reliable production rollback during an incident.
- `EPIC10-feature-3-user-story-3.md` — Admin enforcing approval gates and credential rotation for production deployments.

### Feature 4: Event Streaming Platform
- `EPIC10-feature-4-user-story-1.md` — Developer publishing and consuming schema-validated events via the shared client library.
- `EPIC10-feature-4-user-story-2.md` — Operator monitoring consumer lag and dead-letter queue volume during traffic bursts.
- `EPIC10-feature-4-user-story-3.md` — Admin enforcing topic ACLs and schema governance for sensitive event types.

### Feature 5: GPU Inference Infrastructure
- `EPIC10-feature-5-user-story-1.md` — Developer canary-deploying a new model version and comparing metrics.
- `EPIC10-feature-5-user-story-2.md` — Operator monitoring GPU queue depth, latency, and spot instance reclaim events.
- `EPIC10-feature-5-user-story-3.md` — Admin controlling model registry access and cross-tenant batch isolation.

### Feature 6: Object Storage Platform
- `EPIC10-feature-6-user-story-1.md` — Mobile client developer uploading media via resumable signed-URL uploads.
- `EPIC10-feature-6-user-story-2.md` — Operator monitoring storage quotas, replication lag, and restore drills.
- `EPIC10-feature-6-user-story-3.md` — Admin enforcing per-tenant encryption, scoped signed URLs, and deletion/export workflows.

### Feature 7: Database Infrastructure
- `EPIC10-feature-7-user-story-1.md` — Developer applying a safe, versioned schema migration through the pipeline.
- `EPIC10-feature-7-user-story-2.md` — Operator monitoring replica lag, slow queries, and backup/restore health.
- `EPIC10-feature-7-user-story-3.md` — Admin enforcing least-privilege credentials and tenant isolation across database types.

### Feature 8: Monitoring and Observability
- `EPIC10-feature-8-user-story-1.md` — Developer instrumenting a new service with the shared logging/metrics/tracing SDK.
- `EPIC10-feature-8-user-story-2.md` — Operator getting paged with correlated context to triage an SLO breach.
- `EPIC10-feature-8-user-story-3.md` — Admin enforcing PII redaction and controlled access to raw telemetry.

## Key Themes

- Every feature's operator story centers on detecting a problem before it causes irrecoverable data loss — a missed conference capture cannot be re-recorded, which makes fast detection more critical here than in typical SaaS infrastructure.
- Every feature's admin story centers on least-privilege access and an immutable audit trail, since the underlying data (voice, images, contacts, relationship graphs) is highly personal.
- Change safety is a recurring thread across engineer stories: canary rollout, online migrations, and reviewed route/schema changes all aim to make infrastructure changes reversible by default.
- Cost-vs-reliability tradeoffs (spot GPU capacity, storage tiering, warm pools) appear across multiple features because conference-driven demand is inherently bursty and expensive to over-provision for statically.
- Cross-feature dependencies are dense — the observability stack (Feature 8) and CI/CD pipeline (Feature 3) are dependencies of nearly every other feature's operator and admin stories.
