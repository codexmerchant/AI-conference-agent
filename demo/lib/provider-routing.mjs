import { ProviderError } from "./openai-service.mjs";

export function chooseTranscriptionProvider({ preference = "mlx", localReady, openAIConfigured }) {
  if (preference === "mlx") {
    if (localReady) return "mlx";
    throw new ProviderError("Local MLX Whisper is not ready. Run ./scripts/setup-local-transcription.sh from the demo directory.", {
      status: 503,
      code: "mlx_whisper_unavailable",
      retryable: false
    });
  }
  if (preference === "openai") {
    if (openAIConfigured) return "openai";
    throw new ProviderError("OPENAI_API_KEY is required when TRANSCRIPTION_PROVIDER=openai", {
      status: 503,
      code: "missing_api_key",
      retryable: false
    });
  }
  throw new ProviderError(`Unsupported transcription provider: ${preference}`, {
    status: 503,
    code: "invalid_transcription_provider",
    retryable: false
  });
}

export function chooseAnalysisProvider({ preference = "ollama", localReady, openAIConfigured }) {
  if (preference === "ollama") {
    if (localReady) return "ollama";
    throw new ProviderError("Local Ollama/Qwen3 analysis is not ready. Start Ollama and confirm qwen3 is installed.", {
      status: 503,
      code: "ollama_unavailable",
      retryable: false
    });
  }
  if (preference === "openai") {
    if (openAIConfigured) return "openai";
    throw new ProviderError("OPENAI_API_KEY is required when ANALYSIS_PROVIDER=openai", {
      status: 503,
      code: "missing_api_key",
      retryable: false
    });
  }
  throw new ProviderError(`Unsupported analysis provider: ${preference}`, {
    status: 503,
    code: "invalid_analysis_provider",
    retryable: false
  });
}
