import { analysisContext, analysisInstruction, analysisSchema, ProviderError } from "./openai-service.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";

async function ollamaRequest(fetchImpl, url, options = {}) {
  let response;
  try {
    response = await fetchImpl(url, options);
  } catch (error) {
    throw new ProviderError("Could not reach local Ollama. Start Ollama and try again.", {
      status: 503,
      code: "ollama_unreachable",
      retryable: false
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProviderError(payload.error || `Ollama returned status ${response.status}`, {
      status: 502,
      code: "ollama_request_failed",
      retryable: response.status >= 500
    });
  }
  return payload;
}

export async function getOllamaStatus({
  fetchImpl = fetch,
  baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL,
  model = process.env.OLLAMA_MODEL || "qwen3",
  timeoutMs = 800
} = {}) {
  try {
    const response = await fetchImpl(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { available: false, model, modelReady: false };
    const payload = await response.json();
    const names = (payload.models || []).map((item) => item.name);
    const modelReady = names.some((name) => name === model || name === `${model}:latest` || name.startsWith(`${model}:`));
    return { available: true, model, modelReady };
  } catch {
    return { available: false, model, modelReady: false };
  }
}

export async function analyzeTranscriptLocally({
  transcript,
  conferenceName,
  sessionName,
  userName,
  interactionDate,
  timezone,
  fetchImpl = fetch,
  baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL,
  model = process.env.OLLAMA_MODEL || "qwen3"
}) {
  const result = await ollamaRequest(fetchImpl, `${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      format: analysisSchema,
      options: { temperature: 0 },
      messages: [
        { role: "system", content: analysisInstruction },
        {
          role: "user",
          content: `Return only JSON matching this schema: ${JSON.stringify(analysisSchema)}\n\n${analysisContext({ transcript, conferenceName, sessionName, userName, interactionDate, timezone })}`
        }
      ]
    })
  });

  const content = result.message?.content;
  if (!content?.trim()) throw new ProviderError("Qwen3 returned no structured analysis", { code: "empty_local_analysis" });
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new ProviderError(`Qwen3 analysis could not be parsed: ${error.message}`, { code: "invalid_local_analysis" });
  }
}
