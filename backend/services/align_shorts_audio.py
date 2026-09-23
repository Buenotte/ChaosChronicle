import sys
import json
import os
import whisper

def align_audio(audio_path, max_duration=60):
    if not os.path.exists(audio_path):
        print(json.dumps({"success": False, "error": "Audio file not found"}))
        return

    try:
        model = whisper.load_model('tiny')
        res = model.transcribe(audio_path, word_timestamps=True, language='ru')
        words = []
        for seg in res.get('segments', []):
            if seg['start'] > max_duration:
                break
            for w in seg.get('words', []):
                if w['start'] > max_duration:
                    break
                clean_word = w['word'].strip()
                if clean_word:
                    words.append({
                        "word": clean_word,
                        "start": round(w['start'], 2),
                        "end": round(w['end'], 2)
                    })
        print(json.dumps({"success": True, "words": words}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    if len(sys.argv) > 1:
        audio = sys.argv[1]
        dur = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0
        align_audio(audio, dur)
