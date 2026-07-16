# EPIC09 Feature 3 User Story 3

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-03 — Follow-up Completion Tracking

---

# User Story

As an admin,
I want tight control over the OAuth scopes and data access used for follow-up auto-detection,
so that email/calendar/CRM integrations don't over-collect sensitive data beyond what completion tracking requires.

---

# Business Value

- Minimizes privacy and legal exposure from broad mailbox/calendar access requests
- Builds user trust that connecting email/calendar doesn't grant the app arbitrary inbox visibility
- Reduces the blast radius of a compromised integration credential
- Supports enterprise security review requirements for third-party integration approval

---

# Acceptance Criteria

## Functional Criteria
- Auto-completion detection requests only least-privilege scopes (send-status/metadata, not full mailbox content read)
- All integration connections and scope grants are logged with user, provider, scope, and timestamp
- Users can disconnect an integration at any time, immediately revoking associated access without losing existing task history
- CRM sync respects the org's configured data-sharing policy (e.g., some orgs may disable CRM write-back entirely)

## UX Criteria
- Integration connection screen clearly discloses exactly what data will and won't be accessed
- Admin console shows all active integration connections per user/org with scope details
- Disconnection is a one-click, immediately effective action

## Technical Criteria
- OAuth tokens stored encrypted with automatic rotation/refresh handling
- Scope grants are validated server-side on every use, not just at connection time
- Data deletion on disconnect removes cached integration data beyond what's needed for historical task records

---

# Preconditions

- Admin credentials and org integration policy configured
- OAuth provider apps configured with minimum viable scope sets
- Encryption and token storage infrastructure in place

---

# Postconditions

- Integration scope grants and usage logged for audit
- Admin has visibility into all active integrations across the org
- Disconnected integrations immediately stop being used for detection, with tokens revoked
- Compliance reporting reflects current integration scope posture

---

# Edge Cases

- User connects an integration with broader scopes than requested due to a provider-side consent screen change
- Org-wide policy change (e.g., disabling CRM sync) must retroactively stop in-flight auto-detection using that integration
- Integration token is revoked externally (e.g., IT admin revokes app access at the Google Workspace level) without the app being notified promptly
- User disconnects an integration mid-task, leaving a task in an ambiguous auto-detection state
- Third-party provider deprecates an API version, requiring scope/permission migration
- Compromised token requires emergency org-wide revocation and reconnection flow

---

# Telemetry

Track:
- `integration_connected`
- `integration_disconnected`
- `integration_scope_granted`
- `integration_token_revoked_externally`
- `integration_policy_violation_detected`
- `admin_integration_audit_viewed`

---

# Dependencies

- OAuth provider integrations (Gmail, Outlook, Salesforce, HubSpot)
- Encrypted token storage and rotation service
- Org-level integration policy engine
- Compliance and audit dashboard (EPIC-11)

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify integration connection requests only the documented least-privilege scopes
2. Verify disconnection immediately revokes token access and stops further auto-detection
3. Verify org-level policy disabling CRM sync stops write-back for all users in that org
4. Verify externally revoked tokens are detected and surfaced to the user for reconnection
5. Verify scope grants are validated server-side on each API call, not just cached from connection time
6. Verify admin console accurately lists all active integrations and their scopes per user
7. Verify disconnect removes cached integration data beyond retained task history
8. Verify emergency token revocation can be triggered org-wide and takes effect immediately

---

# Story Variation

This is user story variation 3 for Follow-up Completion Tracking, focusing on integration security, scope minimization, and admin governance.

---

# Notes

- Default to the narrowest viable OAuth scope for every provider; expand only with explicit product justification
- Provider consent-screen changes are outside our control — build scope-validation checks that don't assume the granted scope matches the requested scope
- Coordinate with EPIC-08 (Integrations & Sync Platform) on shared OAuth/token infrastructure rather than building a parallel system
