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
    userName: input.userName?.trim() || "Zain",
    interactionDate: input.interactionDate || new Date().toISOString().slice(0, 10),
    timezone: input.timezone || "UTC",
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
        participant: "Zain",
        dueDate: null,
        dateEvidence: "next Tuesday",
        evidence: "I will send you our short product brief next Tuesday",
        confidence: 0.98,
        completed: false
      },
      {
        id: `${id}_action_2`,
        text: "Include proposed evaluation criteria in the brief",
        owner: "Me",
        participant: "Zain",
        dueDate: null,
        dateEvidence: "next Tuesday",
        evidence: "Include your proposed evaluation criteria",
        confidence: 0.95,
        completed: false
      },
      {
        id: `${id}_action_3`,
        text: "Schedule a 30-minute product feedback session",
        owner: "Mutual",
        participant: "",
        dueDate: null,
        dateEvidence: "afterward",
        evidence: "Would you be open to a thirty-minute feedback session afterward? Absolutely.",
        confidence: 0.92,
        completed: false
      }
    ],
    followUp: `Subject: AI conference agent brief and evaluation criteria

Hi Maya,

It was great meeting you after your human-centered AI evaluation talk. Your point about pairing clear consent with a way for users to correct AI-generated inferences strongly resonated with what we are building.

As promised, I’ll send our short AI conference agent product brief next Tuesday, including the evaluation criteria we are considering. I would value your perspective and would be glad to schedule the thirty-minute feedback session we discussed.

Thanks again,
Zain`,
    reviewFlags: [],
    quality: {
      contactConfidence: 0.92,
      actionConfidence: 0.95,
      overallConfidence: 0.94,
      requiresReview: false
    },
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
    userName: input.userName,
    interactionDate: input.interactionDate,
    timezone: input.timezone,
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
    reviewFlags: analysis.reviewFlags || [],
    quality: analysis.quality || {
      contactConfidence: analysis.contact.confidence || 0,
      actionConfidence: 0,
      overallConfidence: 0,
      requiresReview: true
    },
    provenance: {
      transcript: providers.transcription || "OpenAI file transcription",
      extraction: providers.analysis || "OpenAI structured transcript analysis",
      speakerAttribution: providers.speakerAttribution || "Two-person turn reconstruction",
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
        owner: String(item.owner || "Unclear"),
        participant: String(item.participant || ""),
        dueDate: item.dueDate ? String(item.dueDate) : null,
        dateEvidence: item.dateEvidence ? String(item.dateEvidence) : null,
        evidence: String(item.evidence || ""),
        confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 0,
        completed: Boolean(item.completed)
      })).filter((item) => item.text)
    : [];

  return {
    ...value,
    id: value.id,
    conferenceName: String(value.conferenceName || "Untitled conference").trim(),
    sessionName: String(value.sessionName || "Untitled interaction").trim(),
    userName: String(value.userName || "").trim(),
    interactionDate: String(value.interactionDate || ""),
    timezone: String(value.timezone || "UTC"),
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
    reviewFlags: Array.isArray(value.reviewFlags) ? value.reviewFlags.map((flag) => ({
      code: String(flag.code || "review_required"),
      message: String(flag.message || "Review required")
    })) : [],
    quality: {
      contactConfidence: Number(value.quality?.contactConfidence) || 0,
      actionConfidence: Number(value.quality?.actionConfidence) || 0,
      overallConfidence: Number(value.quality?.overallConfidence) || 0,
      requiresReview: Boolean(value.quality?.requiresReview)
    },
    updatedAt: new Date().toISOString()
  };
}
