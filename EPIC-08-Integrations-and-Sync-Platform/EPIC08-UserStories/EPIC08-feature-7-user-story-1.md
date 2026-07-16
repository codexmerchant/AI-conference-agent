# EPIC08 Feature 7 User Story 1

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-07 — Notes and Drive Sync

---

# User Story

As a user,
I want my session summaries and transcripts automatically saved to my Google Drive (or Notion/Dropbox/OneDrive),
so that they become part of my normal file system without a manual export step.

---

# Business Value

- Removes manual export effort, ensuring conference outputs don't stay siloed inside the app
- Makes conference intelligence searchable and shareable through tools the user already relies on
- Creates a durable, user-owned record independent of the app itself
- Increases the perceived completeness of the capture-to-knowledge-base pipeline

---

# Acceptance Criteria

## Functional Criteria
- User can connect Google Drive, Notion, Dropbox, or OneDrive as an export destination
- Completed session summaries, transcripts, and extracted slides are exported within one sync cycle after session completion
- Exported files follow the user's configured folder/naming convention

## UX Criteria
- Per-session export status (synced/pending/failed) is visible with a link-out to the destination file/page
- User can manually trigger export for a session that failed or was skipped
- Export format preferences (PDF vs. Markdown, image format) are configurable

## Technical Criteria
- Filename collisions in the destination are detected and resolved without silently overwriting existing files
- Export respects the user's per-artifact-type export preferences (e.g., exclude raw transcripts)
- Export jobs are retried with backoff on transient provider failures

---

# Preconditions

- User has connected a storage/notes provider and selected a destination folder/database
- A conference session has completed and generated at least a summary
- Naming convention and export format preferences have been confirmed or left at defaults

---

# Postconditions

- SyncedArtifact records are created for each exported artifact with destination file/page ID and URL
- Destination folder/database contains the exported files following the configured naming convention
- `artifact_exported` telemetry event is recorded per artifact

---

# Edge Cases

- Destination storage quota is exceeded mid-export
- Two sessions produce artifacts with an identical auto-generated filename, requiring collision-safe renaming
- Notion database schema doesn't have a property matching a required field, causing a mapping failure
- Large slide-deck export exceeds a provider's per-request payload size limit
- Network interruption during export requires resumable upload rather than restart-from-scratch

---

# Telemetry

Track:
- `storage_connected`
- `artifact_exported`
- `artifact_export_failed`
- `export_collision_detected`
- `export_manual_retry_triggered`

---

# Dependencies

- Google Drive API, Notion API, Dropbox API, Microsoft Graph Files/OneDrive API
- Media pipeline for transcript/summary/slide generation (EPIC-02)
- Context and intelligence engine for structured summaries (EPIC-03)
- Secrets vault for token storage

---

# Priority

Medium

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify successful connection to each supported provider (Drive, Notion, Dropbox, OneDrive)
2. Verify a completed session's summary and transcript export within one sync cycle
3. Verify exported files follow the configured folder/naming convention
4. Verify a filename collision is resolved without silently overwriting an existing file
5. Verify export failure due to quota exhaustion shows a clear, actionable error
6. Verify manual retry successfully re-triggers a previously failed export
7. Verify a large slide-deck export handles provider payload size limits gracefully (chunking or clear failure)
8. Verify export format preferences (PDF vs. Markdown) are respected per artifact type

---

# Story Variation

This is user story variation 1 for Notes and Drive Sync, focusing on the happy-path user experience of automatic post-session artifact export.

---

# Notes

- Notion's structured-block export format differs meaningfully from the flat-file model of Drive/Dropbox/OneDrive and should be tested as its own path, not assumed equivalent
- Collision-safe naming logic here should be shared infrastructure reusable by any future export destination added to this feature
