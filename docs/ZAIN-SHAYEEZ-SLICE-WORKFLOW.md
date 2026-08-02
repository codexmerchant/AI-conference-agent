# Zain and Shayeez — Slice Implementation Workflow

## Working model

Zain and Shayeez will have stable areas of ownership while implementing each vertical product slice together. Ownership identifies who is accountable for an area; it does not prevent either person from contributing elsewhere when needed.

## Standing responsibilities

| Person | Ongoing responsibility |
|---|---|
| Zain | Product behavior, user journey, interface, AI-output quality, acceptance criteria, controlled fixtures, and end-to-end testing |
| Shayeez | Backend services, Linux compatibility, persistence, server infrastructure, deployment, and production operations |
| Zain and Shayeez | Technical contracts, architecture decisions, integration, mutual code review, debugging, and slice completion |

## Immediate Linux integration milestone

Before starting Slice 2, bring the current Linux work back into the shared repository and establish one accepted foundation.

| Work | Owner |
|---|---|
| Bring the existing Linux modifications into a branch of the shared repository | Shayeez |
| Explain which files, dependencies, and processing behavior changed | Shayeez |
| Compare the Linux version with the accepted Mac workflow | Zain |
| Test real audio, transcription, speaker attribution, actions, save, and reopen | Zain and Shayeez |
| Resolve differences and agree on the supported implementation | Zain and Shayeez |
| Merge the reviewed implementation into `main` | Zain and Shayeez |
| Deploy the accepted version from `main` | Shayeez |

Shayeez leads this milestone because its main risk is Linux and server compatibility.

## Slice 2 — Trusted Mobile Conference Capture

### Zain

- Finalize the mobile user journey.
- Build or lead the iPhone capture experience.
- Implement consent, start/stop, recording state, interruption handling, and the recovery interface.
- Define what users see while media is waiting, uploading, processing, or failing.
- Maintain acceptance criteria and controlled fixtures.
- Test the complete experience on a physical device.

### Shayeez

- Implement the upload and ingestion endpoints.
- Prevent duplicate processing during retries.
- Connect uploaded recordings to the accepted processing pipeline.
- Handle server-side storage, processing status, recovery, and errors.
- Maintain Linux compatibility.
- Deploy the integrated implementation and establish operational logging.

### Joint work

Before implementation, agree on:

- Upload and audio formats.
- Recording, chunk, and upload identifiers.
- Consent evidence.
- Processing states.
- Retry and duplicate behavior.
- Error responses.
- Authentication and access boundaries.

## Working process for every slice

1. Agree on the slice's user outcome and acceptance criteria.
2. Identify the interface, AI, backend, data, infrastructure, and testing tasks.
3. Assign tasks using the primary ownership areas.
4. Agree on shared technical contracts before writing dependent code.
5. Work in separate branches.
6. Open small pull requests and review each other's changes.
7. Integrate regularly during development.
8. Test the complete user journey together.
9. Fix failures until the acceptance criteria pass.
10. Merge accepted changes into `main`.
11. Deploy only from `main`.

Example branch structure:

```text
main
├── zain/slice-2-mobile-capture
├── shayeez/slice-2-ingestion
└── shayeez/linux-processing
```

## Suggested leadership across the roadmap

| Slice | Suggested lead | Division |
|---|---|---|
| Linux integration milestone | Shayeez | Shayeez leads compatibility and deployment; Zain validates product behavior and AI accuracy |
| 2. Trusted Mobile Conference Capture | Zain | Zain leads the mobile experience; Shayeez leads ingestion and server processing |
| 3. Multi-Speaker Session Intelligence | Zain | Zain leads AI behavior and the review experience; Shayeez leads Linux processing services |
| 4. Contacts, Relationships, and Memory | Shayeez | Shayeez leads data and retrieval; Zain leads correction and the relationship experience |
| 5. Connected Follow-Through | Shayeez | Shayeez leads integrations and secure synchronization; Zain leads approval and conflict handling |
| 6. Conference Intelligence and Reporting | Zain | Zain leads report behavior and evidence quality; Shayeez leads retrieval, generation infrastructure, and exports |
| 7. Goals, Coaching, and Team Operations | Decide later | Select the lead using evidence and team strengths demonstrated during the earlier slices |

## Core principle

Zain and Shayeez have stable areas of ownership, implement every vertical slice together, review each other's work, and alternate slice leadership according to the dominant risk.
