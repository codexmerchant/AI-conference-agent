# EPIC09 Feature 6 User Story 3

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-06 — Time Allocation Analysis

---

# User Story

As an admin,
I want tight control over calendar and location data access scopes and retention for time allocation analysis,
so that granular time-tracking data doesn't become an over-collection or surveillance liability.

---

# Business Value

- Minimizes privacy exposure from granular, minute-level time-use reconstruction
- Prevents the feature from being perceived as employer surveillance of employee time use
- Supports enterprise security review of a feature that inherently touches calendar and potentially location data
- Reduces legal risk from retaining fine-grained behavioral timestamp data longer than necessary

---

# Acceptance Criteria

## Functional Criteria
- Calendar integration requests only least-privilege scopes (free/busy or event-metadata, not full event content) where feasible
- Location/check-in data is used for categorization only with a distinct, explicit opt-in separate from general capture consent
- Retention policy limits how long granular TimeAllocationSource records are kept versus the aggregated TimeAllocationRecord
- Users can exclude specific time blocks (e.g., personal time) from analysis entirely

## UX Criteria
- Admin console documents exactly what calendar/location data feeds allocation analysis, per integration
- Location-based categorization opt-in is presented as a clearly separate toggle, not bundled into general onboarding consent
- Data retention settings are visible and, where policy allows, configurable per org

## Technical Criteria
- Calendar and location data encrypted at rest with enterprise-tier customer-managed keys where required
- Granular TimeAllocationSource records are purged per retention policy while aggregated category totals may be retained longer
- All access to granular source-level allocation data is logged with correlation IDs
- Deletion cascades correctly across TimeAllocationRecord and TimeAllocationSource tables

---

# Preconditions

- Admin credentials and org data-retention policy configured
- Calendar and location integrations configured with minimum viable scopes
- Encryption and retention infrastructure in place

---

# Postconditions

- Calendar/location data usage logged and auditable per conference
- Granular source data purged per retention policy on schedule
- Admin has visibility into which users have location-based categorization enabled
- Deleted or purged data documented in an immutable log

---

# Edge Cases

- User excludes a personal time block after allocation has already been computed, requiring recomputation and exclusion of that data
- Retention policy purges granular source records that a user later disputes, leaving only the aggregated total to explain a score
- Org disables location-based categorization mid-deployment, requiring immediate cessation of location data use
- Calendar provider consent screen grants broader access than requested, requiring a scope-validation check
- Cross-border data residency rules restrict where granular timestamp data can be processed or stored
- A legal hold requires retaining granular source data past the normal purge schedule

---

# Telemetry

Track:
- `time_allocation_location_opt_in_changed`
- `time_allocation_personal_time_excluded`
- `time_allocation_source_data_purged`
- `time_allocation_scope_violation_detected`
- `time_allocation_data_deleted`
- `admin_time_allocation_compliance_viewed`

---

# Dependencies

- Calendar integration layer with scope validation
- Location/check-in data opt-in management system
- Key management service (e.g., AWS KMS, Azure Key Vault)
- Compliance and audit dashboard (EPIC-11)

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify calendar integration requests only the documented least-privilege scopes
2. Verify location-based categorization requires a distinct opt-in separate from general capture consent
3. Verify granular TimeAllocationSource records are purged according to the configured retention policy
4. Verify excluding a personal time block correctly recomputes the allocation breakdown
5. Verify org-level disablement of location categorization immediately stops its use
6. Verify all access to granular source-level data is logged with correlation IDs
7. Verify deletion requests cascade correctly across allocation record and source tables
8. Verify a legal hold correctly overrides scheduled purge without silently failing

---

# Story Variation

This is user story variation 3 for Time Allocation Analysis, focusing on data minimization, retention governance, and compliance for calendar/location data.

---

# Notes

- Granular, minute-level time reconstruction is inherently more sensitive than daily/session-level rollups — default retention should favor aggregated data over raw source records
- Location-based categorization should ship well after calendar/capture-based categorization is proven, given its higher privacy sensitivity
- Coordinate with EPIC-11 (Security, Privacy & Compliance) on org-wide retention policy defaults before enabling this feature broadly
