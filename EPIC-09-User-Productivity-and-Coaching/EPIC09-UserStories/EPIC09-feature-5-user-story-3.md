# EPIC09 Feature 5 User Story 3

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-05 — Missed Opportunity Detection

---

# User Story

As an admin,
I want strict privacy governance over the attendee, contact, and proximity data used for missed-opportunity detection,
so that detection never uses data the user isn't authorized to see and complies with venue/attendee consent policies.

---

# Business Value

- Prevents legal exposure from using attendee data beyond its consented purpose
- Preserves conference venue and third-party data-sharing relationships by respecting opt-out signals
- Reduces the risk of the feature being perceived as covert surveillance of other attendees
- Ensures compliance posture holds up under enterprise security review of a feature that inherently touches third-party data

---

# Acceptance Criteria

## Functional Criteria
- Detection logic only consumes attendee/contact data sources the user has legitimate, documented access to (public attendee list, opted-in badge data, own contact network)
- Venue or conference-level opt-out signals for attendee-matching data are respected and enforced before any detection scan runs
- All data sources used in a detection scan are logged for audit, per conference
- Data deletion requests remove MissedOpportunity records and any cached attendee-matching data tied to the user

## UX Criteria
- Admin console documents exactly which data sources feed detection, per conference/venue integration
- Any use of proximity or check-in data requires a distinct, explicit user opt-in beyond general capture consent
- Compliance dashboard shows which conferences have opted-out or restricted attendee data

## Technical Criteria
- Access control enforced at the data-source level, not just the API response level, so unauthorized data never reaches the detection model
- All detection-scan data source usage logged with correlation IDs for audit
- Encryption at rest enforced for any cached attendee/contact matching data
- Deletion cascades correctly across MissedOpportunity records and any derived matching caches

---

# Preconditions

- Admin credentials and permissions verified
- Data source access agreements documented per conference/venue integration
- Org and venue-level opt-out/consent settings configured before detection is enabled

---

# Postconditions

- Detection scans only ever draw from authorized, consented data sources
- Data source usage per scan is fully auditable
- Admin notified of any attempted use of unauthorized or opted-out data sources
- Deleted data documented in an immutable deletion log

---

# Edge Cases

- A conference venue revokes attendee-list sharing consent mid-event, requiring detection to stop using that data source immediately
- A user's own contact opts out of being used for missed-opportunity matching against other users
- Proximity/check-in data becomes available for a conference after detection has already run without it, requiring a rescan under updated consent
- Cross-border data residency rules restrict where attendee-matching data can be processed
- A detection scan is mistakenly configured to use a data source that wasn't actually authorized for this conference
- Legal holds require preserving MissedOpportunity data past the normal retention period despite a pending deletion request

---

# Telemetry

Track:
- `missed_opportunity_data_source_used`
- `missed_opportunity_unauthorized_source_blocked`
- `missed_opportunity_consent_revoked`
- `missed_opportunity_data_deleted`
- `missed_opportunity_rescan_triggered`
- `admin_missed_opportunity_compliance_viewed`

---

# Dependencies

- Venue/conference attendee-data integration agreements
- Consent and opt-out management system
- Role-based access control (RBAC) system
- Compliance and audit dashboard (EPIC-11)

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify a detection scan cannot access an attendee data source without documented consent
2. Verify venue-level consent revocation immediately stops that data source from being used
3. Verify a user's contact-level opt-out excludes them from being used in other users' matching
4. Verify data source usage per scan is fully logged and auditable
5. Verify deletion requests cascade across MissedOpportunity records and matching caches
6. Verify cross-border data residency restrictions are enforced for attendee-matching processing
7. Verify a rescan correctly picks up updated consent state rather than using stale cached data
8. Verify legal hold correctly overrides a pending deletion request without silently failing

---

# Story Variation

This is user story variation 3 for Missed Opportunity Detection, focusing on data governance, consent enforcement, and compliance for third-party attendee data.

---

# Notes

- This feature is the most third-party-data-sensitive in the epic since it necessarily reasons about people other than the primary user — governance should be reviewed earliest and most conservatively
- Coordinate explicitly with conference/venue partners on what attendee data sharing agreements permit before enabling detection for a given event
- Consider defaulting proximity/check-in-based detection to off until an explicit, separate consent flow is built and validated
