# FEATURE-07 — Notes and Drive Sync

## Epic
EPIC-08 — Integrations & Sync Platform

---

# 1. Objective

Automatically export session transcripts, summaries, and captured slide/media artifacts to the user's cloud storage or notes tool of choice (Google Drive, Notion, Dropbox, OneDrive, Evernote) so conference outputs land in the user's existing knowledge system.

---

# 2. Problem Statement

Conference summaries, transcripts, and slide captures are generated inside the app but have no path into the documents and notes systems teams actually search and reference later, so valuable conference intelligence gets siloed and eventually forgotten instead of becoming part of the user's permanent knowledge base.

---

# 3. Feature Overview

A storage/notes connector that auto-files structured conference outputs (session summaries, transcripts, extracted slides, action items) into a user-configured destination — a Drive folder, a Notion database, a Dropbox/OneDrive directory — following a consistent naming and folder convention, with per-artifact sync status and manual retry.

---

# 4. Key Functionalities

## Storage/notes provider connection
OAuth connection to Google Drive, Notion, Dropbox, or OneDrive, with destination folder/database selection.

## Automatic artifact export
Session summaries, full transcripts, and extracted slide images are exported as files (PDF/Markdown/image) or structured notes-database entries as each session completes.

## Folder/naming convention management
Exports follow a configurable template (e.g., `/Conferences/{conference_name}/{session_title}-{date}`) to keep destinations organized without manual filing.

## Sync status and retry
Per-artifact export status (pending/synced/failed) with manual retry and a bulk "export all" action.

## Conflict-safe file naming
Detect and resolve filename collisions in the destination without silently overwriting existing files.

---

# 5. Primary Use Cases

## Use Case 1
A completed session summary is automatically saved as a Markdown file into the user's designated Google Drive conference folder.

## Use Case 2
A user connects Notion, and each conference session becomes a page in a shared team database, viewable by colleagues without app access.

## Use Case 3
Drive storage quota is exceeded mid-sync, and the failure is surfaced clearly rather than silently dropped.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want my session summaries and transcripts automatically saved to my Google Drive,
so that they're part of my normal file system without manual export.

### Acceptance Criteria
- Completed session outputs are exported to the connected destination within one sync cycle after the session ends.
- Exported files follow the user's configured folder/naming convention.
- User can manually trigger export for a session that failed or was skipped.

## User Story 2
As a team lead using Notion for shared knowledge management,
I want conference session notes to sync into our shared Notion database,
so that my team can review conference intelligence without needing app access.

### Acceptance Criteria
- Each session syncs as a distinct Notion page with structured properties (conference, date, attendees, tags).
- Notion sync respects the configured database schema, mapping fields to existing Notion properties where possible.
- Sync failures due to schema mismatches are reported with the specific field that failed.

---

# 7. User Workflow

1. User connects a storage/notes provider (Drive, Notion, Dropbox, or OneDrive).
2. User selects or creates a destination folder/database and confirms naming convention defaults.
3. Conference session completes and generates a summary, transcript, and any extracted slides.
4. Export job packages these artifacts per the configured format and destination structure.
5. Artifacts are written to the destination; sync status updates per artifact.
6. On failure, the artifact is retried automatically with backoff, then flagged for manual retry if still failing.
7. User can browse synced artifacts directly from the app with a link-out to the live file/page.

---

# 8. UI / UX Requirements

- Storage/notes connect screen with provider choice, destination picker, and naming convention preview.
- Per-session export status shown on the session detail screen (synced / pending / failed) with a link-out to the destination file/page.
- Bulk "export all unsynced sessions" action.
- Clear warning when destination storage quota is low or exceeded.
- Option to choose export format per artifact type (PDF vs. Markdown for summaries, image format for slides).

---

# 9. Technical Requirements

## Frontend
Storage connect flow with folder/database picker, per-session export status indicator, and export format preferences screen.

## Backend
Provider adapters for Google Drive API, Notion API, Dropbox API, and Microsoft Graph OneDrive/Files API behind a common export interface handling file/page creation, updates, and collision-safe naming.

## AI/ML
Reuses summary/transcript generation output from the media pipeline (EPIC-02) and context engine (EPIC-03); no new inference required beyond formatting outputs per destination (Markdown for Drive/Dropbox, structured blocks for Notion).

## Infrastructure
Export job queue with per-provider rate-limit handling, retry with exponential backoff, and a dead-letter state for artifacts requiring manual intervention after repeated failures.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Google Drive API | Create/update files and folders for exported artifacts |
| Notion API | Create/update pages and database entries for session notes |
| Dropbox API | Create/update files for exported artifacts |
| Microsoft Graph Files/OneDrive API | Create/update files and folders for exported artifacts |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| StorageConnection | id, user_id, provider (drive/notion/dropbox/onedrive), oauth_token_ref, destination_ref (folder_id/database_id), naming_template, sync_status, last_synced_at |
| SyncedArtifact | id, connection_id, session_id, artifact_type (summary/transcript/slide/action_items), external_file_id, external_url, export_format, sync_status (pending/synced/failed), last_attempted_at, retry_count |
| ExportCollision | id, artifact_id, conflicting_external_name, resolution (renamed/overwritten/skipped), resolved_at |

---

# 12. Security & Privacy

- OAuth tokens stored only as vault references; never logged or exposed via API responses.
- Exported artifacts respect the same access-control scope as the source session (private sessions never exported to a shared/team destination without explicit user action).
- Users can exclude specific artifact types (e.g., raw transcripts) from auto-export while still allowing summaries.
- Disconnecting a provider stops future exports but does not retroactively delete files already written to the destination.
- Exported files inherit no broader sharing permissions than the destination folder/database already has; the app never changes sharing settings.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Export latency after session completion | <5 min |
| Bulk export (50 sessions) | <20 min |
| Export success rate | >97% |
| Filename collision resolution | 100% without silent overwrite |

---

# 14. Edge Cases

- Destination storage quota exceeded mid-export.
- Destination folder or Notion database deleted/moved externally after being configured.
- Filename collision between two sessions with identical auto-generated names.
- Large slide-deck exports (many high-resolution images) exceeding provider per-request size limits.
- Notion database schema changed by a teammate, breaking the configured field mapping.
- Network interruption during export requiring resumable upload rather than restart-from-scratch.

---

# 15. Dependencies

- Media pipeline for transcript/summary/slide generation (EPIC-02)
- Context and intelligence engine for structured session summaries (EPIC-03)
- Secrets vault for token storage
- Reporting/output layer for source artifact formatting

---

# 16. Risks

- Provider API changes (e.g., Notion API versioning) breaking export formatting without warning.
- Users unintentionally exporting sensitive session content to a shared team destination.
- Storage quota issues on free-tier provider accounts causing frequent export failures for some users.

---

# 17. Telemetry & Analytics

Track:
- `storage_connected`
- `storage_disconnected`
- `artifact_exported`
- `artifact_export_failed`
- `export_collision_detected`
- `bulk_export_triggered`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Storage connect completion rate | >55% of users who start the flow |
| Export success rate | >97% |
| Median export latency | <5 min |
| Artifacts requiring manual retry | <5% |

---

# 19. Future Enhancements

- Two-way sync allowing edits made in Notion/Drive to flow back into the app's session record.
- Templated export formats customizable per organization (branded PDF summaries).
- Additional provider support (Confluence, Slack canvas, SharePoint).

---

# 20. Open Questions

- Should raw audio/video be exportable to Drive/Dropbox, or should exports be limited to derived text/image artifacts given file size and privacy concerns?
- How should the app handle a destination that a teammate has since made read-only for the connected account?
- Should naming convention templates be organization-wide (admin-configured) or always per-user?
