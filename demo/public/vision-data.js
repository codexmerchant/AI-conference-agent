export const visionPreview = {
  mode: "simulated_vision_preview",
  conference: "HealthTech Futures 2026",
  notice: "Fictional data for product exploration. Nothing is sent, synchronized, or saved.",
  slices: [
    {
      id: "slice-3",
      number: 3,
      label: "Session intelligence",
      title: "Panel insights stay tied to the source",
      summary: "A simulated three-speaker panel becomes a reviewable session with speaker turns, quotes, topics, and evidence links.",
      metric: "12 / 12",
      metricLabel: "claims source-linked",
      tone: "violet",
      status: "Simulated preview",
      details: [
        { label: "Dr. Lena Ortiz · Harborview Health", value: "Community adoption depends on workflow fit, not model novelty.", evidence: "Panel 09:42" },
        { label: "Marcus Lee · ClearPath Labs", value: "Pilot teams need visible correction paths before automation expands.", evidence: "Panel 18:16" },
        { label: "Priya Shah · Northstar Systems", value: "Procurement is asking for evidence lineage and retention controls.", evidence: "Panel 27:03" }
      ]
    },
    {
      id: "slice-4",
      number: 4,
      label: "Relationships and memory",
      title: "Every person has context, history, and provenance",
      summary: "Fictional contacts are connected to prior conversations without silently merging uncertain identities.",
      metric: "3",
      metricLabel: "relationships surfaced",
      tone: "mint",
      status: "Simulated preview",
      details: [
        { label: "Daniel Ruiz", value: "ClearPath Labs · 2 interactions", evidence: "Strong match · email + organization" },
        { label: "Priya Shah", value: "Northstar Systems · introduction pending", evidence: "Source: Daniel conversation" },
        { label: "Lena Ortiz", value: "Harborview Health · panel speaker", evidence: "Possible match · review required" }
      ]
    },
    {
      id: "slice-5",
      number: 5,
      label: "Connected follow-through",
      title: "External actions wait for explicit approval",
      summary: "Follow-ups, tasks, and meetings appear in a review queue. This preview never sends or synchronizes them.",
      metric: "3",
      metricLabel: "items awaiting review",
      tone: "coral",
      status: "Preview only · no external effects",
      details: [
        { label: "Email draft", value: "Send ClearPath pilot overview to Daniel", evidence: "Ready for review" },
        { label: "Calendar hold", value: "Pilot scoping call · Aug 12 · 30 minutes", evidence: "Date needs confirmation" },
        { label: "Task", value: "Prepare Harborview workflow-fit questions", evidence: "Owner: Me · no due date" }
      ]
    },
    {
      id: "slice-6",
      number: 6,
      label: "Conference reporting",
      title: "A daily brief rolls evidence up without losing it",
      summary: "The simulated report combines reviewed interactions and sessions into themes, opportunities, and next actions.",
      metric: "18",
      metricLabel: "evidence references",
      tone: "lime",
      status: "Simulated preview",
      details: [
        { label: "Theme", value: "Trust is shifting from model accuracy to correction and governance.", evidence: "6 source moments" },
        { label: "Opportunity", value: "Explore a workflow-fit pilot with Harborview and ClearPath.", evidence: "4 source moments" },
        { label: "Next action", value: "Review three drafts before any follow-through leaves the workspace.", evidence: "8 source moments" }
      ]
    }
  ]
};

export function validateVisionPreview(preview = visionPreview) {
  if (preview.mode !== "simulated_vision_preview") throw new Error("Vision preview must be explicitly simulated");
  if (!/nothing is sent/i.test(preview.notice)) throw new Error("Vision preview must disclose that it has no external effects");
  const numbers = preview.slices.map((slice) => slice.number);
  if (numbers.join(",") !== "3,4,5,6") throw new Error("Vision preview must contain Slices 3 through 6 in order");
  for (const slice of preview.slices) {
    if (!slice.status || !/preview|simulated/i.test(slice.status)) throw new Error(`Slice ${slice.number} is missing preview status`);
    if (!slice.details?.length || slice.details.some((detail) => !detail.evidence)) throw new Error(`Slice ${slice.number} has an unsupported claim`);
  }
  return true;
}
