# FEATURE-08 — Webhook Framework

## Epic
EPIC-08 — Integrations & Sync Platform

---

# 1. Objective

Provide a shared, reliable outbound and inbound webhook infrastructure so integrations (Gmail, Outlook, Calendar, CRM, Contacts, Drive) can receive real-time push notifications from providers, and so external systems (CRMs, internal tools, Zapier-style automation) can subscribe to events happening inside the app.

---

# 2. Problem Statement

Every integration in this epic independently needs to receive provider push notifications and/or notify external systems of events (new contact captured, follow-up sent, sync completed); without a shared, hardened webhook framework, each integration would reinvent signature verification, retry logic, and delivery tracking inconsistently, producing security gaps and unreliable delivery.

---

# 3. Feature Overview

A two-directional webhook platform: (1) an inbound receiver that validates and routes provider push notifications (Gmail Pub/Sub, Microsoft Graph subscriptions, CRM webhooks) to the correct integration handler, and (2) an outbound subscription system letting users/admins register endpoint URLs to receive signed, retried event notifications for in-app events (contact captured, follow-up sent, sync failed, enrichment completed).

---

# 4. Key Functionalities

## Outbound webhook subscription management
Users/admins register a target URL, select event types, and receive a signing secret for verifying deliveries.

## Signed, retried outbound delivery
Each event is delivered with an HMAC-SHA256 signature header, retried with exponential backoff on failure, and moved to a dead-letter state after max attempts.

## Inbound provider notification receiver
A unified endpoint validates and routes incoming push notifications (Gmail, Graph, CRM) to the correct integration's sync handler based on subscription/channel identifiers.

## Delivery log and replay
Every outbound delivery attempt is logged with status/response code, viewable by the user, with a manual replay action.

## Idempotency and duplicate suppression
Both inbound and outbound events carry a unique event ID so at-least-once delivery semantics don't cause duplicate processing on either side.

---

# 5. Primary Use Cases

## Use Case 1
A user registers a webhook URL in their internal automation tool to get notified the instant a new conference contact is captured.

## Use Case 2
Gmail sends a push notification via Pub/Sub when a tracked thread receives a reply, and the framework routes it to the Gmail integration's reply-matching logic.

## Use Case 3
A subscriber's endpoint is down for 20 minutes; deliveries are retried with backoff and successfully resume once the endpoint recovers, without duplicate or lost events.

---

# 6. User Stories

## User Story 1
As a user integrating the app with my own automation stack,
I want to register a webhook that fires when a new contact is captured,
so that I can trigger my own downstream workflows in near real time.

### Acceptance Criteria
- User can create a webhook subscription specifying a URL and one or more event types.
- Each delivery includes a verifiable HMAC signature header computed with the subscription's secret.
- User can view delivery history and manually replay a failed delivery.

## User Story 2
As a power user relying on webhook delivery for a downstream automation,
I want failed deliveries to be retried automatically and clearly reported if they ultimately fail,
so that I don't silently lose events during a brief endpoint outage.

### Acceptance Criteria
- Failed deliveries are retried with exponential backoff up to a defined maximum attempt count.
- After exhausting retries, the event is marked dead-lettered and the user is notified.
- Duplicate deliveries of the same event are distinguishable via a stable event ID so consumers can dedupe safely.

---

# 7. User Workflow

1. User navigates to Webhook settings and creates a new subscription with a target URL and event types.
2. System generates and displays a signing secret (shown once, then stored only hashed/vaulted).
3. User's endpoint receives a verification challenge to confirm ownership before activation.
4. Qualifying in-app events are queued and delivered to the endpoint with a signed payload.
5. Delivery attempt result (status code, latency) is logged and visible in the subscription's delivery history.
6. On failure, the framework retries with exponential backoff per the configured policy.
7. User can pause, edit, delete, or manually replay deliveries for a subscription at any time.

---

# 8. UI / UX Requirements

- Webhook subscription list with status (active/paused/failing), event types, and last delivery time.
- Signing secret shown once at creation with a regenerate action (invalidating the old secret).
- Delivery history table with status code, timestamp, and payload preview, plus a "replay" button per entry.
- Clear failure/dead-letter indicator with guidance on what to check (endpoint availability, signature verification).
- Event type picker showing available event categories grouped by integration (contacts, follow-ups, sync).

---

# 9. Technical Requirements

## Frontend
Webhook management screen (create/edit/pause/delete subscriptions), delivery history viewer, and secret reveal/regenerate flow with copy-to-clipboard.

## Backend
Outbound delivery service with a durable queue, exponential backoff retry policy, HMAC-SHA256 signing, and delivery logging; inbound receiver endpoint(s) per provider that validate provider-specific tokens/signatures (Google Pub/Sub JWT, Graph `clientState`) before routing to integration handlers.

## AI/ML
Not applicable — this is transport/delivery infrastructure; no inference is performed within the webhook framework itself.

## Infrastructure
Message queue (e.g., SQS/Pub/Sub-backed) decoupling event production from delivery attempts, dead-letter queue for exhausted retries, and per-subscription rate limiting to prevent a single misbehaving subscriber from starving delivery workers for others.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Outbound subscriber endpoints (user-registered URLs) | Deliver signed event payloads to external systems |
| Google Cloud Pub/Sub | Inbound push notifications for Gmail integration |
| Microsoft Graph change notifications | Inbound push notifications for Outlook/Calendar integrations |
| CRM provider webhooks (Salesforce/HubSpot) | Inbound push notifications for CRM sync events |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| WebhookSubscription | id, user_id, target_url, event_types, signing_secret_ref, status (active/paused/failing/unverified), created_at, last_delivered_at |
| WebhookDelivery | id, subscription_id, event_id, event_type, payload, http_status, attempt_count, delivered_at, next_retry_at, delivery_status (pending/delivered/failed/dead_lettered) |
| InboundWebhookChannel | id, integration_type (gmail/outlook/calendar/crm), external_channel_id, verification_token_ref, expires_at, status |
| WebhookEvent | id, event_type, source_entity_type, source_entity_id, payload, created_at |

---

# 12. Security & Privacy

- Every outbound delivery is signed with HMAC-SHA256 using a per-subscription secret; consumers are instructed to always verify the signature before trusting a payload.
- Signing secrets are stored hashed/vaulted, never returned in plaintext after initial creation.
- Inbound provider notifications are validated against provider-specific authenticity checks (Pub/Sub JWT audience/issuer, Graph `clientState`) before being trusted or routed.
- Subscriber URLs are validated to prevent SSRF (no internal/private IP ranges, no localhost, DNS-rebinding protection) before a subscription is activated.
- Event payloads exclude sensitive raw content (e.g., full transcripts) by default, sending references/IDs that require an authenticated API call to resolve, unless the user explicitly opts into richer payloads.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Outbound delivery latency (p50) | <2 sec from event creation |
| Inbound notification processing latency | <5 sec |
| Delivery success rate (healthy endpoints) | >99.5% |
| Max retry window before dead-letter | 24 hours |

---

# 14. Edge Cases

- Subscriber endpoint returns HTTP 200 but fails asynchronously, giving a false impression of successful delivery.
- Retry storm: many events queued during a subscriber outage all retry simultaneously once the endpoint recovers, overwhelming it.
- Subscriber URL is changed to point at an internal/private network address after initial validation (SSRF via redirect).
- Duplicate inbound provider notifications for the same underlying change (at-least-once delivery) processed twice without idempotency keys.
- Webhook secret compromised, requiring rotation without breaking in-flight deliveries.
- Inbound channel (Graph subscription, Pub/Sub watch) expires without renewal, silently halting a dependent integration's sync.

---

# 15. Dependencies

- Secrets vault for signing secret and provider credential storage
- Message queue infrastructure for durable outbound delivery
- All integration features in this epic (Gmail, Outlook, Calendar, CRM, Contacts, Notes/Drive) as both event producers and inbound notification consumers
- Observability stack for delivery monitoring and alerting

---

# 16. Risks

- A misconfigured or malicious subscriber URL becoming an SSRF vector if URL validation is incomplete.
- Retry storms degrading platform-wide delivery performance if not isolated per subscription.
- Provider-side webhook/subscription API changes (renewal cadence, payload format) breaking inbound routing without advance notice.

---

# 17. Telemetry & Analytics

Track:
- `webhook_subscription_created`
- `webhook_subscription_deleted`
- `webhook_delivery_succeeded`
- `webhook_delivery_failed`
- `webhook_delivery_dead_lettered`
- `webhook_delivery_replayed`
- `inbound_notification_received`
- `inbound_channel_renewal_failed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Outbound delivery success rate | >99.5% |
| Median outbound delivery latency | <2 sec |
| Inbound notification processing success rate | >99% |
| Dead-lettered events requiring manual intervention | <1% |

---

# 19. Future Enhancements

- Webhook event filtering (JSONPath/condition-based) so subscribers only receive a relevant subset of an event type.
- Native integration marketplace (Zapier/Make) built atop the outbound webhook framework.
- Configurable payload richness levels per subscription (IDs-only vs. full object).

---

# 20. Open Questions

- Should outbound webhook subscriptions be available to individual users, or restricted to team/admin-level configuration given the security surface?
- What is the maximum acceptable retry window before an event is permanently dead-lettered, and should it be configurable per subscription?
- Should inbound provider notification channels be shared platform-wide per provider, or provisioned per-user/per-integration for isolation?
