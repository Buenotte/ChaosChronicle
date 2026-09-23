import sys
import json
import os
import subprocess

# Ensure UTF-8 output on Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

def get_audio_segment(audio_path, max_duration=60):
    """Trims audio to max_duration for fast Whisper inference."""
    trimmed_path = audio_path + f".trim_{int(max_duration)}.wav"
    try:
        cmd = [
            'ffmpeg', '-y', '-i', audio_path,
            '-t', str(max_duration),
            '-ar', '16000', '-ac', '1',
            '-c:a', 'pcm_s16le', trimmed_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return trimmed_path
    except Exception:
        return audio_path

def align_audio(audio_path, max_duration=60):
    if not os.path.exists(audio_path):
        print(json.dumps({"success": False, "error": f"File not found: {audio_path}"}))
        return

    work_audio = get_audio_segment(audio_path, max_duration)
    try:
        import whisper
        model = whisper.load_model('tiny')
        res = model.transcribe(
            work_audio,
            word_timestamps=True,
            language='ru',
            fp16=False,
            verbose=False
        )

        words = []
        for seg in res.get('segments', []):
            if seg['start'] > max_duration:
                break
            for w in seg.get('words', []):
                start_sec = round(w['start'], 2)
                end_sec = round(w['end'], 2)
                if start_sec >= max_duration:
                    break
                clean_w = w['word'].strip()
                if clean_w:
                    words.append({
                        "word": clean_w,
                        "start": start_sec,
                        "end": min(float(max_duration), end_sec)
                    })

        print(json.dumps({"success": True, "words": words}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
    finally:
        if work_audio != audio_path and os.path.exists(work_audio):
            try:
                os.remove(work_audio)
            except Exception:
                pass

if __name__ == '__main__':
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
        dur = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0
        align_audio(audio_file, dur)
    else:
        print(json.dumps({"success": False, "error": "Missing audio file path"}))
