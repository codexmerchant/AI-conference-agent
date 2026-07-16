# EPIC11 Feature 3 User Story 1

## Epic
EPIC-11 — Security, Privacy & Compliance

## Feature
FEATURE-03 — Data Retention Policies

---

# User Story

As a user,
I want to set how long my raw recordings and images are kept before they're automatically deleted,
so that I control my own data footprint without having to manually clean up old conferences.

---

# Business Value

- Gives users direct control over their personal data footprint, as promised in the product's privacy commitments
- Reduces user anxiety about indefinitely stored sensitive recordings
- Cuts storage costs by naturally expiring stale data
- Reduces breach exposure by minimizing the volume of retained sensitive data

---

# Acceptance Criteria

## Functional Criteria
- User can set a retention period per data type (audio, image, transcript) from account settings
- Data older than the configured period is automatically processed on the next scheduled retention pass
- User can choose delete or archive as the expiry action per data type

## UX Criteria
- Retention settings use plain language, avoiding technical jargon like "TTL" or "expiry job"
- User sees an "expires on" date on individual recordings once a policy is applied
- User receives a notification ahead of a large batch of data being permanently deleted

## Technical Criteria
- Configured retention period is validated against any applicable regional minimum/maximum before saving
- Retention policy changes take effect at the next scheduled enforcement pass, not instantly and destructively
- Deleted data is fully removed from primary storage and confirmed via the fan-out completion check

---

# Preconditions

- User is authenticated and has at least one data type with existing captured data
- Regional Compliance Engine has resolved the user's applicable jurisdiction

---

# Postconditions

- Retention policy is saved and associated with the user's account
- Data exceeding the retention window is processed per the configured action on the next scheduled pass
- User is notified of upcoming and completed retention actions

---

# Edge Cases

- User sets a retention period shorter than a regional compliance minimum and must be guided to a valid range
- User changes their retention policy while a prior policy's enforcement job is already mid-run
- User has recordings actively referenced in an unfinished follow-up draft when they expire
- User's device is offline when a retention notification would normally be delivered
- User sets conflicting retention periods for overlapping scopes (e.g., a conference-specific override vs. account default)
- User deletes their account entirely while a scheduled retention job for their data is in progress

---

# Telemetry

Track:
- `retention_policy_set_by_user`
- `retention_expiry_notification_sent`
- `record_deleted_by_user_policy`
- `record_archived_by_user_policy`
- `retention_policy_validation_rejected`

---

# Dependencies

- Regional Compliance Engine (Feature 6)
- Secure Media Storage (Feature 7)
- Notification service

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify user can set and save a retention period per data type
2. Verify data older than the configured period is deleted or archived on the next scheduled pass
3. Verify retention period validation rejects values outside regional min/max bounds
4. Verify "expires on" date displays correctly on individual recordings
5. Verify expiry notification is sent ahead of a large batch deletion
6. Verify policy changes do not retroactively and instantly delete data outside the scheduled pass
7. Verify conflicting scope-level policies resolve predictably (e.g., most specific scope wins)
8. Verify account deletion mid-retention-job does not leave orphaned scheduled jobs

---

# Story Variation

This is user story variation 1 for Data Retention Policies, focusing on the self-service retention configuration experience for everyday users.

---

# Notes

- Default retention periods should be sensible and privacy-protective out of the box, not indefinite, so users who never touch settings are still protected.
- Consider showing users a running count of how much data would be affected before they confirm a stricter new policy.
