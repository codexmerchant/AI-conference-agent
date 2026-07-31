# Cross-Platform Local AI Setup (Windows & Linux)

This guide documents how to set up the local AI transcription and speaker diarization pipelines on **Windows** and **Linux** systems.

The cross-platform pipeline is:
`Audio -> Whisper (faster-whisper/openai-whisper) + PyAnnote Diarization (with pseudo-diarizer fallback) -> Qwen3 (via Ollama) -> Review & Save`

---

## 1. Setup Ollama & Qwen3

1. **Install Ollama**:
   * **Windows**: Download and run the installer from [Ollama.com](https://ollama.com).
   * **Linux**: Run the install script:
     ```bash
     curl -fsSL https://ollama.com/install.sh | sh
     ```
2. **Download Qwen3**:
   Run the model:
   ```bash
   ollama run qwen3
   ```
   When the interactive prompt appears, you can exit by typing `/bye`. Ollama will keep the model loaded and ready in the background.

---

## 2. Setup Python Environment & Dependencies

1. **Create Virtual Environment**:
   Navigate to the `demo` directory:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\activate
     ```
   * **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
2. **Install Transcription Backend**:
   Install `faster-whisper` (highly recommended for performance):
   ```bash
   pip install faster-whisper torch
   ```
   *Note: If you have an NVIDIA GPU, make sure to install the appropriate PyTorch with CUDA support to enable GPU acceleration.*

3. **Install Diarization Backend (Optional)**:
   The diarization script utilizes `pyannote.audio` if configured, and gracefully falls back to a time-based pseudo-diarizer if it is not installed or configured. If you wish to use high-quality PyAnnote diarization:
   ```bash
   pip install pyannote.audio
   ```
   *Note: Using PyAnnote speaker-diarization-3.1 requires you to accept model terms on HuggingFace and set the `HF_TOKEN` environment variable.*

---

## 3. Environment Configuration

Create or update the configuration in your terminal environment or environment manager.

### Windows (PowerShell)
```powershell
# Port for the Node web server
$env:PORT="8080"

# Path to the python executable in your virtual environment
$env:MLX_WHISPER_PYTHON=".venv/Scripts/python"

# Path to the cross-platform diarization batch script wrapper
$env:FLUID_AUDIO_BINARY="local-ai/diarize.bat"

# Local Ollama endpoint
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
```

### Linux / macOS
```bash
# Port for the Node web server
export PORT=8080

# Path to the python executable in your virtual environment
export MLX_WHISPER_PYTHON=.venv/bin/python

# Path to the cross-platform diarization shell script wrapper
export FLUID_AUDIO_BINARY=local-ai/diarize.sh

# Local Ollama endpoint
export OLLAMA_BASE_URL=http://127.0.0.1:11434

# Ensure wrapper script is executable
chmod +x local-ai/diarize.sh
```

---

## 4. Run the Demo

Start the application from the `demo` directory:
```bash
npm start
```
Open your browser to `http://localhost:8080` (or whichever port you configured). You can now upload audio files for end-to-end local transcription, diarization, and structured Qwen3 analysis.
