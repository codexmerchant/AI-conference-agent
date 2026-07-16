# EPIC-05 — Session & Conference Intelligence

## Objective
Analyze panels, talks, presentations, and conference sessions.

## Feature Files

| Feature ID | Feature |
|---|---|
| FEATURE-01 | Panel Mode Analysis |
| FEATURE-02 | Speaker Recognition |
| FEATURE-03 | Quote Extraction |
| FEATURE-04 | Slide-to-Topic Linking |
| FEATURE-05 | Session Summarization |
| FEATURE-06 | Key Insight Extraction |
| FEATURE-07 | Session Search |
| FEATURE-08 | Topic Clustering |

## Implementation Notes
- This epic is a consumer, not a producer, of raw media: every feature reads from EPIC-02 outputs (transcripts, speaker diarization, slide OCR, timestamp sync) rather than touching audio/image capture directly, so pipeline ordering and event contracts (`DiarizationCompleted`, `TranscriptSegmented`, `SlideExtractionCompleted`) must stay stable across both epics.
- Speaker Recognition (FEATURE-02) sits between EPIC-02's anonymous diarization (`Speaker 1`, `Speaker 2`) and every downstream feature that attributes content to a person (quotes, insights, summaries); a regression here silently degrades attribution quality everywhere else in the epic.
- Session Search (FEATURE-07) and Topic Clustering (FEATURE-08) share the same embedding/vector-index infrastructure — indexing and clustering jobs should be designed together to avoid duplicate embedding generation and index drift between the two features.
- All AI-derived outputs (quotes, insights, slide links, summaries, clusters) must retain a traceable link back to source transcript timestamps/segments so users can verify claims, and corrections upstream (diarization fixes, re-transcription) can trigger targeted re-analysis instead of full reprocessing.
- Because this epic re-runs on correction events from EPIC-02 (e.g., a speaker label is manually fixed), every feature needs an idempotent, event-driven reprocessing path rather than a one-shot batch job, to keep summaries/quotes/insights consistent with the latest corrected transcript.
- Biometric-adjacent data (voiceprints used for Speaker Recognition) requires stricter consent and retention handling than the rest of the epic's text-based outputs.
