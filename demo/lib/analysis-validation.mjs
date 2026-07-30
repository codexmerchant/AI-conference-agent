const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function clean(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9@]+/g, " ").trim();
}

const ACTION_STOPWORDS = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "the", "to", "with"]);

function contentWords(value) {
  return normalized(value).split(" ").filter((word) => word.length > 2 && !ACTION_STOPWORDS.has(word));
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function validAnchor(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(value))) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || isoDate(date) !== value ? null : date;
}

export function normalizeSpokenEmail(value) {
  let email = clean(value).toLowerCase();
  if (!email) return "";
  email = email
    .replace(/\s+(?:at|at sign)\s+/g, "@")
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s*([@.])\s*/g, "$1")
    .replace(/\s+/g, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function resolveSupportedDate(dateEvidence, interactionDate) {
  const evidence = clean(dateEvidence);
  const anchor = validAnchor(interactionDate);
  if (!evidence || !anchor) return null;
  const lower = evidence.toLowerCase();

  const iso = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso && validAnchor(iso[1])) return iso[1];

  const named = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/);
  if (named) {
    const year = Number(named[3] || anchor.getUTCFullYear());
    const date = new Date(Date.UTC(year, MONTHS[named[1]], Number(named[2])));
    if (date.getUTCMonth() === MONTHS[named[1]] && date.getUTCDate() === Number(named[2])) return isoDate(date);
  }

  if (/\btomorrow\b/.test(lower)) {
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() + 1);
    return isoDate(date);
  }
  if (/\btoday\b/.test(lower)) return isoDate(anchor);

  const weekday = lower.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[1]);
    const days = ((target - anchor.getUTCDay() + 7) % 7) || 7;
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() + days);
    return isoDate(date);
  }

  return null;
}

function evidenceAppearsInTranscript(evidence, transcript) {
  const needle = normalized(evidence);
  if (needle.length < 4) return false;
  if (normalized(transcript).includes(needle)) return true;
  const labeled = clean(evidence).match(/^(APP USER|OTHER PARTICIPANT|UNCLEAR SPEAKER)(?:\s*\([^)]*\))?:\s*(.+)$/i);
  if (!labeled) return false;
  const label = normalized(labeled[1]);
  const body = normalized(labeled[2]);
  return String(transcript || "").split("\n").some((line) => normalized(line).startsWith(label) && normalized(line).includes(body));
}

function evidenceSupportsAction(text, evidence) {
  const actionWords = contentWords(text);
  if (!actionWords.length) return false;
  const evidenceWords = new Set(contentWords(evidence));
  return actionWords.filter((word) => evidenceWords.has(word)).length / actionWords.length >= 0.4;
}

export function inferOtherParticipantName(transcript, userName) {
  const names = [...String(transcript || "").matchAll(/\b(?:i am|i'm|my name is|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/gi)].map((match) => match[1].trim());
  return names.find((name) => normalized(name) !== normalized(userName)) || "";
}

function participantOwner(participant, userName, contactName) {
  const person = normalized(participant);
  if (!person) return "Unclear";
  if (person === normalized(userName)) return "Me";
  if (person === normalized(contactName)) return "Contact";
  return "Unclear";
}

function evidenceIdentity(evidence, userName, contactName) {
  if (/^APP USER(?:\s*\([^)]*\))?:/i.test(clean(evidence))) return { participant: clean(userName), owner: "Me" };
  if (/^OTHER PARTICIPANT(?:\s*\([^)]*\))?:/i.test(clean(evidence))) return { participant: clean(contactName), owner: "Contact" };
  if (/^UNCLEAR SPEAKER(?:\s*\([^)]*\))?:/i.test(clean(evidence))) return { participant: "", owner: "Unclear" };
  return null;
}

function sharedAction(text, evidence) {
  return /\b(schedule|call|meet|meeting)\b/i.test(`${text} ${evidence}`) && /\b(let us|we|three of us|all three|together)\b/i.test(evidence);
}

function contactConfidence(contact, transcript) {
  const fields = [contact.name, contact.role, contact.company].filter(Boolean);
  if (!fields.length) return 0;
  const supported = fields.filter((value) => normalized(transcript).includes(normalized(value))).length;
  const emailSupported = contact.email
    ? normalized(transcript).includes(normalized(contact.email).replace("@", " at ")) || normalized(transcript).includes(normalized(contact.email))
    : true;
  return clamp((supported + (emailSupported ? 1 : 0)) / (fields.length + 1));
}

export function validateAnalysis({ analysis, transcript, userName, interactionDate }) {
  const reviewFlags = [];
  const userGrounded = normalized(transcript).includes(normalized(userName));
  if (!userGrounded) reviewFlags.push({ code: "user_not_grounded", message: `Could not identify ${clean(userName) || "the app user"} in the transcript.` });

  const contact = {
    name: clean(analysis?.contact?.name),
    role: clean(analysis?.contact?.role),
    company: clean(analysis?.contact?.company),
    email: normalizeSpokenEmail(analysis?.contact?.email),
    confidence: 0
  };

  if (normalized(contact.name) && normalized(contact.name) === normalized(userName)) {
    reviewFlags.push({ code: "contact_matches_user", message: "The extracted contact matches the app user and requires correction." });
    contact.name = "";
  }
  for (const field of ["name", "role", "company"]) {
    if (contact[field] && !normalized(transcript).includes(normalized(contact[field]))) {
      reviewFlags.push({ code: `unsupported_contact_${field}`, message: `Removed an unsupported contact ${field}.` });
      contact[field] = "";
    }
  }
  if (analysis?.contact?.email && !contact.email) reviewFlags.push({ code: "invalid_contact_email", message: "The spoken email could not be normalized safely." });
  if (contact.email) {
    const transcriptText = normalized(transcript);
    const spokenEmail = normalized(contact.email.replace("@", " at ").replaceAll(".", " dot "));
    const supportedEmail = transcriptText.includes(normalized(contact.email)) || transcriptText.includes(spokenEmail);
    if (!supportedEmail) {
      reviewFlags.push({ code: "unsupported_contact_email", message: "Removed an unsupported contact email." });
      contact.email = "";
    }
  }
  contact.confidence = contactConfidence(contact, transcript);

  const actionItems = Array.isArray(analysis?.actionItems) ? analysis.actionItems.map((item) => {
    const evidence = clean(item.evidence);
    const evidenceGrounded = evidenceAppearsInTranscript(evidence, transcript);
    const actionGrounded = evidenceGrounded && evidenceSupportsAction(item.text, evidence);
    const groundedIdentity = evidenceIdentity(evidence, userName, contact.name);
    let participant = groundedIdentity?.participant || clean(item.participant);
    let owner = groundedIdentity?.owner || participantOwner(participant, userName, contact.name);
    if ((clean(item.owner) === "Mutual" || sharedAction(item.text, evidence)) && evidenceGrounded) {
      owner = "Mutual";
      participant = [clean(userName), clean(contact.name)].filter(Boolean).join(" + ");
    }
    if (!userGrounded && owner === "Me") owner = "Unclear";
    if (!actionGrounded) {
      if (!groundedIdentity) owner = "Unclear";
      reviewFlags.push({ code: "unsupported_action_evidence", message: `Action requires review: ${clean(item.text) || "Untitled action"}` });
    }

    let dateEvidence = item.dateEvidence == null ? null : clean(item.dateEvidence) || null;
    if (dateEvidence && !evidenceAppearsInTranscript(dateEvidence, transcript)) {
      reviewFlags.push({ code: "unsupported_date_evidence", message: `Removed an unsupported date from: ${clean(item.text) || "Untitled action"}` });
      dateEvidence = null;
    }
    const dueDate = resolveSupportedDate(dateEvidence, interactionDate);
    if (item.dueDate && !dueDate) reviewFlags.push({ code: "unsupported_due_date", message: `Removed an ungrounded deadline from: ${clean(item.text) || "Untitled action"}` });

    return {
      text: clean(item.text),
      owner,
      participant,
      dueDate,
      dateEvidence,
      evidence,
      confidence: actionGrounded ? clamp(item.confidence) : Math.min(clamp(item.confidence), 0.25)
    };
  }).filter((item) => item.text) : [];

  const actionConfidence = actionItems.length
    ? actionItems.reduce((sum, item) => sum + item.confidence, 0) / actionItems.length
    : 0;
  const overallConfidence = clamp((contact.confidence * 0.4) + (actionConfidence * 0.6));

  return {
    contact,
    topics: Array.isArray(analysis?.topics) ? analysis.topics.map(clean).filter(Boolean).slice(0, 8) : [],
    summary: clean(analysis?.summary),
    actionItems,
    followUp: clean(analysis?.followUp),
    reviewFlags,
    quality: {
      contactConfidence: contact.confidence,
      actionConfidence,
      overallConfidence,
      requiresReview: reviewFlags.length > 0 || actionItems.some((item) => item.owner === "Unclear")
    }
  };
}
