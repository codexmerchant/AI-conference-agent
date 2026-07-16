# EPIC-09 User Stories — User Productivity & Coaching

This folder contains user stories for EPIC-09 (User Productivity & Coaching), covering all 7 features with 3 story variations each (21 total). Each feature is told from three perspectives — user, operator, and admin — so functional behavior, operational reliability, and security/compliance concerns are each captured explicitly rather than bundled into one generic story.

### Feature 1: Conference Scoring
Composite score (content, network, insight quality) computed per conference.
- **EPIC09-feature-1-user-story-1.md** — User: viewing and understanding the composite Conference Score
- **EPIC09-feature-1-user-story-2.md** — Operator: reliable, auditable score computation and retry/failure handling
- **EPIC09-feature-1-user-story-3.md** — Admin: access control and encryption over score data

### Feature 2: Interaction Quality Analysis
Per-interaction scoring on depth, reciprocity, sentiment, and relevance.
- **EPIC09-feature-2-user-story-1.md** — User: reviewing interaction quality scores to prioritize follow-up
- **EPIC09-feature-2-user-story-2.md** — Operator: accuracy monitoring and drift detection on the scoring pipeline
- **EPIC09-feature-2-user-story-3.md** — Admin: privacy governance over sentiment/transcript-derived data

### Feature 3: Follow-up Completion Tracking
Tracking whether follow-up actions from interactions are actually completed.
- **EPIC09-feature-3-user-story-1.md** — User: managing and completing follow-up tasks
- **EPIC09-feature-3-user-story-2.md** — Operator: reliable reminder delivery and auto-completion detection
- **EPIC09-feature-3-user-story-3.md** — Admin: OAuth scope minimization and integration governance

### Feature 4: Behavioral Coaching
Evidence-backed, LLM-generated coaching recommendations.
- **EPIC09-feature-4-user-story-1.md** — User: receiving and acting on coaching recommendations
- **EPIC09-feature-4-user-story-2.md** — Operator: monitoring generation pipeline health and guardrail rejection rate
- **EPIC09-feature-4-user-story-3.md** — Admin: prompt-data governance and access control over coaching content

### Feature 5: Missed Opportunity Detection
Flagging unengaged contacts, skipped sessions, and incomplete conversations.
- **EPIC09-feature-5-user-story-1.md** — User: reviewing and acting on flagged missed opportunities
- **EPIC09-feature-5-user-story-2.md** — Operator: detection precision monitoring and threshold tuning
- **EPIC09-feature-5-user-story-3.md** — Admin: consent and privacy governance over third-party attendee data

### Feature 6: Time Allocation Analysis
Reconstructing and categorizing how conference time was actually spent.
- **EPIC09-feature-6-user-story-1.md** — User: reviewing a post-conference time-allocation breakdown
- **EPIC09-feature-6-user-story-2.md** — Operator: categorization accuracy and calendar-integration monitoring
- **EPIC09-feature-6-user-story-3.md** — Admin: data minimization and retention governance over calendar/location data

### Feature 7: Goal Tracking
Setting and auto-tracking progress toward conference-specific goals.
- **EPIC09-feature-7-user-story-1.md** — User: setting goals and tracking live progress
- **EPIC09-feature-7-user-story-2.md** — Operator: auto-tracking reliability and miscount detection
- **EPIC09-feature-7-user-story-3.md** — Admin: access control and compliant storage of goal/custom-text data

## Key Themes

- **Post-V1 fast-follow framing**: Per PRD §9, the coaching system is explicitly deferred past V1 — every story assumes Conference Score, interaction, contact, and follow-up data already exist from earlier epics, and several admin stories treat coaching/detection features as opt-in rather than default-on.
- **Evidence-grounded AI output**: Behavioral Coaching and Missed Opportunity Detection both depend on guardrails that tie every generated claim back to a citable, structured evidence record — this shows up repeatedly across operator and admin stories.
- **Default-private, opt-in sharing**: Scores, interaction quality, coaching, and goals are private to the individual user by default across every feature; manager/team visibility is consistently modeled as an explicit, revocable opt-in, never default-on.
- **Third-party data sensitivity**: Interaction Quality Analysis and Missed Opportunity Detection both process data connected to people other than the primary user (conversation partners, other attendees), driving the strictest admin-story requirements in the epic.
- **Idempotency and reprocessing**: Scoring, quality analysis, and goal-progress tracking all require idempotent, replay-safe event processing since capture and analysis pipelines run asynchronously and can retry.
