const transcript = `Zain: Thanks for taking a few minutes, Maya. Your talk about human-centered AI evaluation was excellent.

Maya: Thank you. We are helping product teams evaluate whether AI assistants are genuinely useful, not just technically accurate.

Zain: That is exactly the problem we are exploring with an AI conference agent. It captures conversations, creates useful summaries, and helps people follow up while the context is still fresh.

Maya: The conference use case is interesting. Teams will need a clear consent experience and a way for users to correct what the AI inferred.

Zain: Agreed. I will send you our short product brief next Tuesday. Would you be open to a thirty-minute feedback session afterward?

Maya: Absolutely. Include your proposed evaluation criteria and I can share the framework we use at Northstar Labs.`;

export function createDemoAnalysis(input = {}) {
  const now = new Date().toISOString();
  const id = input.id || `interaction_${Date.now().toString(36)}`;

  return {
    id,
    conferenceName: input.conferenceName?.trim() || "Human-Centered AI Summit 2026",
    sessionName: input.sessionName?.trim() || "Expo floor conversation",
    fileName: input.fileName || "maya-chen-conversation.m4a",
    fileSize: Number(input.fileSize) || 2_840_320,
    duration: input.duration || "02:14",
    status: "ready",
    processingMode: "sample",
    createdAt: input.createdAt || now,
    updatedAt: now,
    transcript,
    contact: {
      name: "Maya Chen",
      role: "Director of AI Evaluation",
      company: "Northstar Labs",
      email: "maya@northstarlabs.example",
      confidence: 0.92
    },
    topics: ["AI evaluation", "Conference intelligence", "User consent", "Human review"],
    summary: "Zain met Maya Chen from Northstar Labs after her talk on human-centered AI evaluation. They discussed applying evaluation frameworks to an AI conference agent, with particular attention to consent and correcting AI-generated inferences. Maya agreed to review a short product brief and provide feedback on the proposed evaluation criteria.",
    actionItems: [
      {
        id: `${id}_action_1`,
        text: "Send Maya the AI conference agent product brief",
        owner: "Me",
        dueDate: "Next Tuesday",
        completed: false
      },
      {
        id: `${id}_action_2`,
        text: "Include proposed evaluation criteria in the brief",
        owner: "Me",
        dueDate: "Next Tuesday",
        completed: false
      },
      {
        id: `${id}_action_3`,
        text: "Schedule a 30-minute product feedback session",
        owner: "Mutual",
        dueDate: "After brief review",
        completed: false
      }
    ],
    followUp: `Subject: AI conference agent brief and evaluation criteria

Hi Maya,

It was great meeting you after your human-centered AI evaluation talk. Your point about pairing clear consent with a way for users to correct AI-generated inferences strongly resonated with what we are building.

As promised, I’ll send our short AI conference agent product brief next Tuesday, including the evaluation criteria we are considering. I would value your perspective and would be glad to schedule the thirty-minute feedback session we discussed.

Thanks again,
Zain`,
    provenance: {
      transcript: "Simulated transcription",
      extraction: "Deterministic demo analysis",
      notice: "Demo output — review before use"
    }
  };
}

export function createRealAnalysis({ input, transcript, analysis, media, providers = {} }) {
  const now = new Date().toISOString();
  const id = `interaction_${Date.now().toString(36)}`;
  const contactName = analysis.contact.name.trim() || "Unknown contact";

  return {
    id,
    conferenceName: input.conferenceName?.trim() || "Untitled conference",
    sessionName: input.sessionName?.trim() || "Untitled interaction",
    fileName: media.originalName,
    fileSize: media.size,
    mediaId: media.id,
    duration: input.duration || "—",
    status: "ready",
    processingMode: "real",
    createdAt: now,
    updatedAt: now,
    transcript,
    contact: { ...analysis.contact, name: contactName },
    topics: analysis.topics,
    summary: analysis.summary,
    actionItems: analysis.actionItems.map((item, index) => ({
      id: `${id}_action_${index + 1}`,
      ...item,
      completed: false
    })),
    followUp: analysis.followUp,
    provenance: {
      transcript: providers.transcription || "OpenAI file transcription",
      extraction: providers.analysis || "OpenAI structured transcript analysis",
      notice: "AI-generated output — review before use"
    }
  };
}

export function normalizeInteraction(value) {
  if (!value || typeof value !== "object") throw new Error("Interaction is required");
  if (!value.id || typeof value.id !== "string") throw new Error("Interaction id is required");

  const actionItems = Array.isArray(value.actionItems)
    ? value.actionItems.map((item, index) => ({
        id: String(item.id || `${value.id}_action_${index + 1}`),
        text: String(item.text || "").trim(),
        owner: String(item.owner || "Unassigned"),
        dueDate: String(item.dueDate || "No due date"),
        completed: Boolean(item.completed)
      })).filter((item) => item.text)
    : [];

  return {
    ...value,
    id: value.id,
    conferenceName: String(value.conferenceName || "Untitled conference").trim(),
    sessionName: String(value.sessionName || "Untitled interaction").trim(),
    transcript: String(value.transcript || ""),
    summary: String(value.summary || ""),
    followUp: String(value.followUp || ""),
    contact: {
      name: String(value.contact?.name || "Unknown contact"),
      role: String(value.contact?.role || ""),
      company: String(value.contact?.company || ""),
      email: String(value.contact?.email || ""),
      confidence: Number(value.contact?.confidence) || 0
    },
    topics: Array.isArray(value.topics) ? value.topics.map(String).filter(Boolean) : [],
    actionItems,
    updatedAt: new Date().toISOString()
  };
}
