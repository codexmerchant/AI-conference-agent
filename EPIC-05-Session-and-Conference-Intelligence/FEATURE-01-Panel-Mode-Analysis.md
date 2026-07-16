# FEATURE-01 — Panel Mode Analysis

## Epic
EPIC-05 — Session & Conference Intelligence

---

# 1. Objective

Analyze multi-speaker panel sessions to produce structured turn-taking, moderator/panelist roles, and Q&A segmentation beyond raw speaker diarization.

---

# 2. Problem Statement

Diarization only labels who spoke when; it does not tell a user which speaker was the moderator, when prepared discussion ended and audience Q&A began, or how much each panelist actually spoke. Without this structure, panel transcripts read as an undifferentiated wall of text.

---

# 3. Feature Overview

Panel Mode Analysis consumes diarized, timestamp-synced transcript segments from EPIC-02 and layers panel-specific structure on top: role classification (moderator/panelist/audience), Q&A boundary detection, cross-talk/interruption flags, and per-panelist talk-time analytics, persisted as a `panel_analysis` record per session.

---

# 4. Key Functionalities

## Panel Role Classification
Identify moderator vs. panelist vs. audience questioner from turn patterns, phrasing cues, and turn frequency.

## Q&A Segment Detection
Detect the transition from prepared panel discussion to open audience Q&A.

## Cross-talk & Interruption Flagging
Detect and flag overlapping speech and interruptions between panelists.

## Panel Structure Timeline
Produce a navigable timeline of turns and topics grouped by panelist.

## Panelist Talk-Time Analytics
Compute total and relative speaking time per panelist and moderator.

---

# 5. Primary Use Cases

## Use Case 1
Attendee wants to jump directly to a specific panelist's remarks instead of scrubbing the full recording.

## Use Case 2
User reviewing notes wants to see how much time each panelist spoke relative to the moderator.

## Use Case 3
User wants to locate when audience Q&A opened to find the answer to a question they asked.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want the panel transcript organized by panelist and by Q&A segment,
so that I can quickly review a specific speaker's contributions.

### Acceptance Criteria
- Each transcript segment carries a role label (moderator/panelist/audience)
- The Q&A boundary is detected and visually separated from prepared discussion
- The transcript view can be grouped or filtered by panelist

## User Story 2
As a returning user reviewing my notes,
I want to see a panelist talk-time breakdown,
so that I can gauge which perspectives dominated the discussion.

### Acceptance Criteria
- Talk time is computed per `speaker_id` and displayed as a percentage/chart
- Talk-time analytics recompute automatically when diarization is corrected
- Moderator talk time is reported separately from panelist talk time

---

# 7. User Workflow

1. `DiarizationCompleted` event received for the session transcript
2. Panel analysis worker fetches transcript segments and speaker turns
3. Role classification model labels each speaker as moderator, panelist, or audience
4. Q&A boundary detector scans for discourse cues (e.g., "let's open it up to questions")
5. Cross-talk detector flags overlapping `speaker_turn` timestamps
6. Talk time is aggregated per `speaker_id`
7. `PanelAnalysisCompleted` event is emitted and the `panel_analysis` record is persisted

---

# 8. UI / UX Requirements

- Panel view grouped by panelist with name/avatar
- Q&A section visually separated from prepared discussion
- Talk-time bar chart per panelist
- Inline cross-talk/interruption indicator within the transcript
- Jump-to-panelist navigation control

---

# 9. Technical Requirements

## Frontend
A panel view component that groups transcript segments by resolved role, a talk-time chart component, and a Q&A toggle that collapses/expands the audience question section.

## Backend
A panel analysis worker triggered on `DiarizationCompleted`, a role classification pipeline, and an aggregation service that computes talk-time metrics and persists the `panel_analysis` record.

## AI/ML
A turn-taking pattern classifier for moderator/panelist/audience roles, a discourse-cue NLP model for Q&A boundary detection, and an overlapping-speech detector for cross-talk flagging.

## Infrastructure
Event-driven worker invocation tied to the `DiarizationCompleted` event, plus a reprocessing queue that reruns analysis when upstream diarization is corrected.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /sessions/{id}/panel-analysis | Retrieve structured panel breakdown |
| POST /sessions/{id}/panel-analysis/reanalyze | Re-run analysis after a diarization correction |
| GET /sessions/{id}/panel-analysis/talk-time | Retrieve talk-time breakdown per panelist |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| panel_analysis | id, session_id, transcript_id, panelist_count, qa_start_ts, status, created_at |
| panelist_role | id, panel_analysis_id, speaker_id, role, talk_time_ms |
| crosstalk_event | id, panel_analysis_id, start_ts, end_ts, speaker_ids |

---

# 12. Security & Privacy

- Access to panel analysis is limited to the session owner and authorized collaborators
- Role classification does not expose raw audio beyond existing transcript permissions
- Reanalysis triggered by manual corrections is audit logged with the initiating user

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Panel analysis completion | <60 sec after diarization completes (60-min session) |
| Talk-time accuracy | Within 5% of ground truth |
| Reanalysis latency after correction | <30 sec |

---

# 14. Edge Cases

- Single-speaker "fireside chat" misclassified as a multi-panelist panel
- Moderator also actively participates as a panelist
- Audience questions are inaudible or not transcribed
- More than 6 panelists causes speaker-label churn
- No clear verbal transition phrase marks the start of Q&A
- Diarization speaker count changes after a manual correction

---

# 15. Dependencies

- EPIC-02 Speaker Diarization
- EPIC-02 Transcript Segmentation
- Session metadata / panelist roster (if published by the conference)

---

# 16. Risks

- Misclassification of moderator vs. panelist reduces user trust in the feature
- Diarization errors cascade into inaccurate talk-time analytics

---

# 17. Telemetry & Analytics

Track:
- `panel_analysis_started`
- `panel_analysis_completed`
- `panel_analysis_failed`
- `qa_boundary_detected`
- `crosstalk_flagged`
- `talk_time_computed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Role classification accuracy | >90% |
| Q&A boundary detection accuracy | >85% |
| User-reported mislabel rate | <5% |

---

# 19. Future Enhancements

- Auto-detect panelist names from introduction remarks and link directly to Speaker Recognition
- Sentiment/tone analysis per panelist across the discussion

---

# 20. Open Questions

- Should the panelist roster be pre-loaded from the conference agenda to improve accuracy?
- How should panels with no identifiable moderator be handled?
