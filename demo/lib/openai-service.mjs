const API_BASE = "https://api.openai.com/v1";

export const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    contact: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        role: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      },
      required: ["name", "role", "company", "email", "confidence"]
    },
    topics: { type: "array", items: { type: "string" }, maxItems: 8 },
    summary: { type: "string" },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          owner: { type: "string", enum: ["Me", "Contact", "Mutual", "Unclear"] },
          participant: { type: "string" },
          dueDate: { type: ["string", "null"] },
          dateEvidence: { type: ["string", "null"] },
          evidence: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["text", "owner", "participant", "dueDate", "dateEvidence", "evidence", "confidence"]
      }
    },
    followUp: { type: "string" }
  },
  required: ["contact", "topics", "summary", "actionItems", "followUp"]
};

export class ProviderError extends Error {
  constructor(message, { status = 502, code = "provider_error", retryable = true } = {}) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export const analysisInstruction = `Extract evidence-grounded conference-interaction intelligence from the supplied transcript and context.

Identity and ownership rules:
- The app user is explicitly named in the context. "Me" means only that person.
- The primary contact must be a participant other than the app user.
- Assign owner "Me" only when the evidence supports the app user making the commitment.
- Assign owner "Contact" only when the evidence supports the primary contact making the commitment.
- Use "Mutual" for a genuinely shared next step and "Unclear" when ownership cannot be grounded.
- If the app user cannot be identified in the transcript, do not guess first-person ownership.

Date rules:
- Return due dates as YYYY-MM-DD or null.
- Resolve relative dates only from the supplied interaction date and timezone.
- Preserve the exact supporting date phrase in dateEvidence.
- Never invent a date for phrases such as "later", "afterward", or "later that week"; use null unless an exact date is supported.

Grounding rules:
- Do not invent contact details, commitments, actions, dates, or completion state.
- Use empty strings for unknown contact fields.
- Normalize clearly spoken email components such as "dot" and "at", but do not guess missing components.
- Every action must include concise transcript evidence and a confidence score.
- The summary must remain factual, concise, and attribute commitments correctly.
- The follow-up must be written from the app user to the primary contact, describe promises as future work unless the context says they were completed, and never claim that a message, attachment, introduction, or meeting has already occurred without evidence.`;

export function analysisContext({ transcript, conferenceName, sessionName, userName, interactionDate, timezone }) {
  return `Conference: ${conferenceName || "Unknown"}
Interaction: ${sessionName || "Unknown"}
App user: ${userName || "Unknown"}
Interaction date: ${interactionDate || "Unknown"}
Timezone: ${timezone || "Unknown"}

Transcript:
${transcript}`;
}

async function providerRequest(fetchImpl, url, options) {
  let response;
  try {
    response = await fetchImpl(url, options);
  } catch (error) {
    throw new ProviderError(`Could not reach the AI provider: ${error.message}`, { code: "provider_unreachable" });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = payload.error?.message || `Provider request failed with status ${response.status}`;
    throw new ProviderError(providerMessage, {
      status: response.status === 429 ? 429 : 502,
      code: payload.error?.code || "provider_request_failed",
      retryable: response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500
    });
  }
  return payload;
}

export async function transcribeAudio({ bytes, fileName, mimeType, apiKey, fetchImpl = fetch, model = "gpt-transcribe" }) {
  if (!apiKey) throw new ProviderError("OPENAI_API_KEY is not configured", { status: 503, code: "missing_api_key", retryable: false });

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType || "application/octet-stream" }), fileName);
  form.append("model", model);

  const result = await providerRequest(fetchImpl, `${API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  if (!result.text?.trim()) throw new ProviderError("The transcription provider returned no text", { code: "empty_transcript" });
  return result.text.trim();
}

function outputText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "refusal") throw new ProviderError(`Analysis was refused: ${content.refusal}`, { code: "analysis_refused", retryable: false });
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new ProviderError("The analysis provider returned no structured output", { code: "empty_analysis" });
}

export async function analyzeTranscript({ transcript, conferenceName, sessionName, userName, interactionDate, timezone, apiKey, fetchImpl = fetch, model = "gpt-5.6-terra" }) {
  if (!apiKey) throw new ProviderError("OPENAI_API_KEY is not configured", { status: 503, code: "missing_api_key", retryable: false });

  const result = await providerRequest(fetchImpl, `${API_BASE}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: analysisInstruction
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: analysisContext({ transcript, conferenceName, sessionName, userName, interactionDate, timezone })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "conference_interaction",
          strict: true,
          schema: analysisSchema
        }
      }
    })
  });

  let parsed;
  try {
    parsed = JSON.parse(outputText(result));
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(`Structured analysis could not be parsed: ${error.message}`, { code: "invalid_analysis" });
  }
  return parsed;
}


export async function processAudio({ transcriptionModel = "gpt-transcribe", analysisModel = "gpt-5.6-terra", ...input }) {
  const transcript = await transcribeAudio({ ...input, model: transcriptionModel });
  const analysis = await analyzeTranscript({ ...input, transcript, model: analysisModel });
  return { transcript, analysis };
}
