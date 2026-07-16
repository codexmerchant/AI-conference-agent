# EPIC-10 — Cloud Infrastructure & DevOps Feature Files

| Feature | File |
|---|---|
| FEATURE-01 — API Gateway Layer | `FEATURE-01-API-Gateway-Layer.md` |
| FEATURE-02 — Container Platform | `FEATURE-02-Container-Platform.md` |
| FEATURE-03 — CI/CD Pipeline | `FEATURE-03-CI-CD-Pipeline.md` |
| FEATURE-04 — Event Streaming Platform | `FEATURE-04-Event-Streaming-Platform.md` |
| FEATURE-05 — GPU Inference Infrastructure | `FEATURE-05-GPU-Inference-Infrastructure.md` |
| FEATURE-06 — Object Storage Platform | `FEATURE-06-Object-Storage-Platform.md` |
| FEATURE-07 — Database Infrastructure | `FEATURE-07-Database-Infrastructure.md` |
| FEATURE-08 — Monitoring and Observability | `FEATURE-08-Monitoring-and-Observability.md` |

## Implementation Notes

- Every service deployed behind the API gateway (Feature 1) must expose health/readiness probes that the container platform's autoscaler (Feature 2) and the monitoring stack's synthetic checks (Feature 8) both consume — a single probe contract avoids drift between routing, scaling, and alerting decisions.
- GPU inference capacity (Feature 5) is provisioned as a mixed spot/on-demand pool sized against the largest recent conference's peak transcription load; the cost-vs-latency tradeoff (cheaper spot capacity vs. reclaim-induced retries) is reviewed before each major event rather than fixed globally.
- Multi-region failover differs by data class: relational and graph databases (Feature 7) run active-passive with a warm standby in a secondary region, while object storage (Feature 6) replicates active-active across regions — reflecting that media durability tolerates eventual consistency but structured/graph reads do not.
- All infrastructure changes — gateway routes, container deployments, database migrations, event topic schemas — flow exclusively through the CI/CD pipeline (Feature 3); no direct production changes are permitted, so every change is versioned, reviewed, and reversible.
- Event streaming retention (Feature 4) is set to 7 days specifically so a failed or buggy downstream agent (transcription, context, graph) can be redeployed and the conference capture pipeline replayed without re-ingesting from the client.
- Observability (Feature 8) treats conference days as elevated-severity windows: alert thresholds tighten and on-call staffing increases during known high-traffic event dates pulled from the conference calendar, since a silent pipeline failure during a live event means unrecoverable lost captures.
