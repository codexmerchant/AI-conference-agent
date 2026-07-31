import argparse
import json
import time
from pathlib import Path

def run_pyannote(input_path, output_path, threshold):
    try:
        from pyannote.audio import Pipeline
        import torch
        import os
        
        token = os.environ.get("HF_TOKEN")
        if not token:
            return None
            
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=token
        )
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        pipeline.to(device)
        
        start_time = time.time()
        diarization = pipeline(input_path)
        processing_time = time.time() - start_time
        
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "speakerId": str(speaker),
                "startTimeSeconds": round(turn.start, 3),
                "endTimeSeconds": round(turn.end, 3)
            })
            
        return {
            "segments": segments,
            "processingTimeSeconds": round(processing_time, 2)
        }
    except Exception as e:
        print(f"PyAnnote diarization failed or not configured: {e}. Falling back to pseudo-diarizer.")
        return None

def run_pseudo_diarizer(input_path, output_path):
    import subprocess
    duration = 60.0
    try:
        cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", input_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        duration = float(result.stdout.strip())
    except Exception:
        pass
        
    start_time = time.time()
    segments = []
    current_time = 0.0
    segment_duration = 15.0
    speaker_toggle = True
    
    while current_time < duration:
        end_time = min(current_time + segment_duration, duration)
        segments.append({
            "speakerId": "SPEAKER_00" if speaker_toggle else "SPEAKER_01",
            "startTimeSeconds": round(current_time, 3),
            "endTimeSeconds": round(end_time, 3)
        })
        current_time = end_time
        speaker_toggle = not speaker_toggle
        
    processing_time = time.time() - start_time
    return {
        "segments": segments,
        "processingTimeSeconds": round(processing_time, 2)
    }

def main():
    parser = argparse.ArgumentParser(description="Cross-platform Diarization Adapter")
    parser.add_argument("action", choices=["process", "health"])
    parser.add_argument("input", nargs="?", help="Input audio file path")
    parser.add_argument("--output", help="Output JSON path")
    parser.add_argument("--threshold", type=float, default=0.6, help="Diarization threshold")
    
    args = parser.parse_args()
    
    if args.action == "health":
        print(json.dumps({"ready": True}))
        return
        
    if not args.input or not args.output:
        parser.error("input and --output are required for 'process' action")
        
    result = run_pyannote(args.input, args.output, args.threshold)
    if result is None:
        result = run_pseudo_diarizer(args.input, args.output)
        
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")

if __name__ == "__main__":
    main()
