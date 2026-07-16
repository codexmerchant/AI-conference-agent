# FEATURE-07 — Secure Media Storage

## Epic
EPIC-11 — Security, Privacy & Compliance

---

# 1. Objective

Provide durable, encrypted, integrity-verified storage for all captured media (audio recordings, images, slides) with tightly scoped, time-limited access so that raw conversation and image data is never exposed beyond what a specific request legitimately needs.

---

# 2. Problem Statement

Raw audio recordings and images are the most sensitive artifacts in the product — they can contain full conversations, faces, badges, and slide content from confidential sessions. Generic object storage with broad or long-lived access URLs would let a single leaked link expose an entire recording indefinitely, and there is no current mechanism to verify that stored media hasn't been corrupted or tampered with.

---

# 3. Feature Overview

A dedicated secure media storage layer built on top of the Encryption Platform (Feature 2), providing short-lived, scoped signed URLs for upload and playback, checksum-based integrity verification, tiered storage (hot for active conferences, cold for archived), and malware/content scanning on ingest. All media access is mediated through this layer rather than direct object-store access.

---

# 4. Key Functionalities

## Scoped, time-limited signed URLs
Issues upload and download URLs that expire quickly and are scoped to a single object and requester.

## Integrity verification
Computes and verifies checksums on upload and periodically thereafter to detect corruption or tampering.

## Tiered storage lifecycle
Moves media between hot and cold storage tiers based on access recency and retention policy, coordinating with Feature 3.

## Ingest content scanning
Scans uploaded media for malware and validates file integrity before it is marked available for processing.

## Resilient large-file upload
Supports resumable, chunked uploads for long conference recordings interrupted by connectivity loss.

---

# 5. Primary Use Cases

## Use Case 1
The mobile app uploads a multi-hour conference recording in chunks over an unreliable venue network.

## Use Case 2
A user requests playback of a past session and receives a short-lived signed download URL.

## Use Case 3
An uploaded image fails a malware scan and is quarantined before entering the processing pipeline.

---

# 6. User Stories

## User Story 1
As a user,
I want my recordings and images to upload reliably even on poor conference Wi-Fi,
so that I don't lose captured conversations due to a dropped connection.

### Acceptance Criteria
- Uploads resume from the last successfully received chunk after a connectivity interruption.
- User sees clear upload progress and a retry indicator if the connection drops.
- No partial or corrupted file is ever marked as successfully stored.

## User Story 2
As an operator,
I want storage tier transitions and integrity checks to run automatically and report failures,
so that I can catch corrupted or misplaced media before a user notices it's missing.

### Acceptance Criteria
- Scheduled integrity checks run against a sample of stored objects and alert on checksum mismatches.
- Tier transition jobs (hot to cold) report success/failure counts and retry automatically on transient errors.
- An operator dashboard shows storage health, tier distribution, and failed integrity check trends.

---

# 7. User Workflow

1. Mobile app requests an upload URL for a new media object from the storage service.
2. Storage service issues a short-lived, scoped signed URL and reserves a `MediaObject` record.
3. App uploads the file in chunks; interrupted uploads resume from the last confirmed chunk.
4. On completion, the storage service verifies the checksum and runs a content/malware scan.
5. If verification passes, the object is marked available and the Encryption Platform's DEK is finalized for it.
6. When a user requests playback, the app requests a download URL, which is issued scoped to that object and expires shortly after issuance.
7. Media ages into cold storage per the applicable retention policy, requiring a brief retrieval delay on next access.

---

# 8. UI / UX Requirements

- Upload progress indicator with automatic resume, no user action required after a dropped connection.
- Clear, generic error if a requested media object fails to load (no leakage of internal storage detail).
- Brief "retrieving archived recording" state for objects in cold storage rather than a silent long wait.
- No persistent or shareable raw storage links ever exposed in the UI.

---

# 9. Technical Requirements

## Frontend
Chunked, resumable upload client with local checkpointing; playback client requesting fresh signed URLs rather than caching long-lived links.

## Backend
A media storage service issuing scoped signed URLs, managing `MediaObject` lifecycle, coordinating tier transitions, and invoking scan/verification pipelines before marking objects available.

## AI/ML
Content/malware scanning pipeline on ingest; downstream AI/ML processing (transcription, OCR per EPIC-02) consumes media only through the same scoped access mechanism.

## Infrastructure
Tiered object storage (hot/cold) with lifecycle policies, checksum verification jobs, and integration with the Encryption Platform for per-object encryption.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| POST /media/upload-url | Request a scoped, time-limited upload URL |
| GET /media/{id}/download-url | Request a scoped, time-limited download URL |
| DELETE /media/{id} | Delete or mark a media object for deletion |
| POST /media/{id}/verify-integrity | Trigger an on-demand checksum verification |
| Encryption Platform | Encrypt/decrypt media objects and manage per-object keys |
| Content/Malware Scanning Service | Scan uploaded media before it is marked available |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| MediaObject | media_id, session_id, owner_id, media_type (audio\|image\|video), storage_uri, checksum, encryption_key_id, access_tier (hot\|cold), upload_status, scan_status, created_at |
| SignedURLGrant | grant_id, media_id, requester_id, url_type (upload\|download), issued_at, expires_at |

---

# 12. Security & Privacy

- All signed URLs are scoped to a single object, a single requester, and expire within minutes.
- Media is encrypted at rest via the Encryption Platform before being marked available.
- Malware/content scan failures quarantine the object and block it from entering downstream AI processing.
- No direct, unscoped access to the underlying object store is exposed to clients or most internal services.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Signed URL issuance latency | <200ms p95 |
| Upload resume success rate after interruption | >99% |
| Cold storage retrieval latency | <30 sec |

---

# 14. Edge Cases

- A signed download URL is shared or leaked beyond its intended recipient before it expires.
- A large, multi-hour audio upload is interrupted repeatedly across a full venue day.
- Checksum verification detects corruption in a stored object with no valid backup copy.
- A user needs immediate access to a recording that has already aged into cold storage for an urgent deletion request.
- Malware scan flags a legitimate image (false positive) blocking it from processing.
- Two devices attempt to upload the same session's audio simultaneously after an offline/online sync conflict.

---

# 15. Dependencies

- Encryption Platform (Feature 2)
- Data Retention Policies (Feature 3)
- Access Control Framework (Feature 4)
- Audio Ingestion Service (EPIC-02)

---

# 16. Risks

- Leaked signed URLs, even short-lived, could expose sensitive audio if shared quickly.
- Cold storage retrieval delays could conflict with time-sensitive deletion or export SLAs.
- Malware scanning false positives could block legitimate captures from processing.

---

# 17. Telemetry & Analytics

Track:
- `media_upload_started`
- `media_upload_completed`
- `media_upload_resumed`
- `signed_url_issued`
- `integrity_check_failed`
- `content_scan_flagged`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Upload success rate (including resumes) | >99% |
| Integrity check pass rate | >99.99% |
| Signed URL scope violations | 0 |

---

# 19. Future Enhancements

- Client-side pre-upload encryption for zero-trust storage.
- Configurable per-org retrieval SLA guarantees for cold-stored media.

---

# 20. Open Questions

- What is the acceptable retrieval delay for cold-stored media before it materially harms user experience?
- Should signed URLs be single-use (invalidated after first successful fetch) rather than just time-limited?
- How do we handle storage for media tied to a pending right-to-be-forgotten request that is still mid-scan?
