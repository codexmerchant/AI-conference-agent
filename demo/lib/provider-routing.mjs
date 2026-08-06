import { ProviderError } from "./openai-service.mjs";

export function chooseTranscriptionProvider({ preference = "mlx", statuses = {}, localReady, openAIConfigured }) {
  const ready = { ...statuses, mlx: statuses.mlx ?? localReady };
  if (preference === "mlx" || preference === "faster-whisper") {
    if (ready[preference]) return preference;
    const isMlx = preference === "mlx";
    throw new ProviderError(isMlx
      ? "Local MLX Whisper is not ready. Run ./scripts/setup-local-transcription.sh from the demo directory."
      : "Local faster-whisper is not ready. Run the Linux or Windows cross-platform AI setup from the demo directory.", {
      status: 503,
      code: isMlx ? "mlx_whisper_unavailable" : "faster_whisper_unavailable",
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

export function chooseDiarizationProvider({ preference = "fluid", statuses = {} }) {
  if (preference === "fluid" || preference === "pyannote") {
    if (statuses[preference]) return preference;
    const isFluid = preference === "fluid";
    throw new ProviderError(isFluid
      ? "FluidAudio diarization is not ready. Run ./scripts/setup-local-diarization.sh from the demo directory."
      : "pyannote diarization is not ready. Run the Linux or Windows cross-platform AI setup and configure HUGGINGFACE_TOKEN.", {
      status: 503,
      code: isFluid ? "fluid_diarization_unavailable" : "pyannote_unavailable",
      retryable: false
    });
  }
  throw new ProviderError(`Unsupported diarization provider: ${preference}`, {
    status: 503,
    code: "invalid_diarization_provider",
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
