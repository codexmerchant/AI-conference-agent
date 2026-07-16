# EPIC08 Feature 8 User Story 1

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-08 — Webhook Framework

---

# User Story

As a user,
I want to register a webhook that fires when a new conference contact is captured,
so that I can trigger my own downstream automation (Zapier, internal tools, Slack alerts) in near real time.

---

# Business Value

- Extends the app's value beyond its own UI into whatever automation stack the user already relies on
- Enables near-real-time downstream workflows instead of waiting for a manual export or scheduled sync
- Reduces the need for the app to natively support every possible destination system
- Increases stickiness by making the app a reliable event source other tools depend on

---

# Acceptance Criteria

## Functional Criteria
- User can create a webhook subscription specifying a target URL and one or more event types
- Each delivery includes a verifiable HMAC-SHA256 signature header computed with the subscription's secret
- User can view delivery history for a subscription and manually replay a specific delivery

## UX Criteria
- Signing secret is shown once at creation time with a regenerate action available afterward
- Event type picker groups available events by integration/category for easy selection
- Delivery history clearly shows status code, timestamp, and a payload preview per attempt

## Technical Criteria
- Subscriber URL is validated against SSRF risks (no internal/private IP ranges, no localhost) before activation
- A verification challenge confirms endpoint ownership before the subscription becomes active
- Each event carries a stable, unique event ID so the subscriber can safely deduplicate retried deliveries

---

# Preconditions

- User has a valid target URL capable of receiving HTTP POST requests
- User is authenticated and has permission to create webhook subscriptions
- At least one qualifying event type is available to subscribe to

---

# Postconditions

- WebhookSubscription record is created with status `active` after successful verification
- Qualifying events trigger a signed delivery to the registered endpoint
- WebhookDelivery records are created for every attempt with status and response detail

---

# Edge Cases

- Subscriber endpoint is temporarily unreachable when the verification challenge is sent
- User provides a URL pointing to an internal/private network address, which must be rejected
- User regenerates the signing secret while deliveries are in flight using the old secret
- Subscriber endpoint accepts the request (200 OK) but the receiving system fails to process it asynchronously
- User subscribes to an event type that never fires for their account (e.g., CRM events with no CRM connected), resulting in an empty but valid subscription

---

# Telemetry

Track:
- `webhook_subscription_created`
- `webhook_endpoint_verified`
- `webhook_delivery_succeeded`
- `webhook_delivery_failed`
- `webhook_delivery_replayed`

---

# Dependencies

- Secrets vault for signing secret storage
- Message queue infrastructure for durable outbound delivery
- All integration features in this epic as event producers
- Contact/CRM/Calendar services as event sources

---

# Priority

Medium

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a webhook subscription can be created with a valid target URL and event type selection
2. Verify the verification challenge correctly activates the subscription only after endpoint ownership is confirmed
3. Verify a delivery's HMAC signature is computed correctly and verifiable using the shown secret
4. Verify a URL pointing to an internal/private IP range is rejected at creation time
5. Verify delivery history accurately reflects status code, timestamp, and payload for each attempt
6. Verify manual replay successfully re-delivers a specific event
7. Verify secret regeneration invalidates the old secret for future signature verification
8. Verify duplicate event IDs are stable across retried deliveries of the same event

---

# Story Variation

This is user story variation 1 for Webhook Framework, focusing on the happy-path user experience of creating and using an outbound webhook subscription.

---

# Notes

- SSRF protection on subscriber URLs is a hard security requirement, not an optional hardening step, and must be validated on every URL change, not just at initial creation
- Event type catalog should be designed to grow cleanly as new integration features are added to this epic without breaking existing subscriptions
