# EPIC-08 — Integrations & Sync Platform

## Objective
Connect external productivity, CRM, calendar, communication, and storage systems so conference intelligence flows in and out of the tools users already run their work through.

## Feature Files

| Feature | File |
|---|---|
| FEATURE-01 | [Gmail Integration](./FEATURE-01-Gmail-Integration.md) |
| FEATURE-02 | [Outlook Integration](./FEATURE-02-Outlook-Integration.md) |
| FEATURE-03 | [Calendar Sync](./FEATURE-03-Calendar-Sync.md) |
| FEATURE-04 | [LinkedIn Enrichment](./FEATURE-04-LinkedIn-Enrichment.md) |
| FEATURE-05 | [CRM Sync](./FEATURE-05-CRM-Sync.md) |
| FEATURE-06 | [Contacts Sync](./FEATURE-06-Contacts-Sync.md) |
| FEATURE-07 | [Notes and Drive Sync](./FEATURE-07-Notes-and-Drive-Sync.md) |
| FEATURE-08 | [Webhook Framework](./FEATURE-08-Webhook-Framework.md) |

## Implementation Notes

- **Credential vault, not plaintext tokens.** Every OAuth access/refresh token is stored in a secrets vault (e.g., AWS Secrets Manager/HashiCorp Vault) and referenced from application tables only via an opaque `oauth_token_ref` — no integration table ever stores a raw client secret, access token, or refresh token in a database column or log line.
- **Proactive token refresh.** A background refresher renews OAuth tokens before expiry (e.g., at 80% of TTL) rather than waiting for a 401, since a mid-sync expiry on a long-running job (large mailbox backfill, bulk CRM export) otherwise fails the entire batch instead of just the next call.
- **Per-provider rate-limit and backoff strategy.** Gmail (quota units), Microsoft Graph (429 + `Retry-After`), Salesforce (governor limits + daily API caps), HubSpot, and third-party LinkedIn enrichment providers each throttle differently; the platform implements a shared circuit-breaker/exponential-backoff layer configured per provider rather than one global retry policy.
- **Prefer push over poll.** Where a provider supports change notifications (Gmail push via Pub/Sub, Microsoft Graph subscriptions, CRM webhooks), the sync engine subscribes to deltas instead of full polling, falling back to scheduled incremental polling (using sync/delta tokens) only when webhooks are unavailable or a subscription lapses.
- **Idempotent, conflict-aware writes.** All inbound and outbound sync operations are idempotent (keyed by an external record ID or content hash) and conflict resolution (last-write-wins vs. field-level merge) is explicit and logged, since the same contact, event, or note can be modified concurrently on both sides of an integration.
