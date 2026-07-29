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
          owner: { type: "string", enum: ["Me", "Contact", "Mutual", "Unassigned"] },
          dueDate: { type: "string" }
        },
        required: ["text", "owner", "dueDate"]
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

export const analysisInstruction = "Extract accurate conference-interaction intelligence from the supplied transcript. Do not invent contact details, commitments, or dates. Use an empty string when a contact field is unknown. The summary must remain factual and concise. Follow-up drafts must reference concrete discussion points, avoid claiming attachments or actions not supported by the transcript, and never imply that a message has been sent. Interpret first-person commitments by the app user as owner 'Me'.";

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

export async function analyzeTranscript({ transcript, conferenceName, sessionName, apiKey, fetchImpl = fetch, model = "gpt-5.6-terra" }) {
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
              text: `Conference: ${conferenceName || "Unknown"}\nInteraction: ${sessionName || "Unknown"}\n\nTranscript:\n${transcript}`
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
