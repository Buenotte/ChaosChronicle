import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

export const TTS_VOICES = {
  nikolay:  { voice: 'ru-RU-DmitryNeural',   label: 'Nikolay',  rate: '+0%',  pitch: '-10Hz' },
  dmitry:   { voice: 'ru-RU-DmitryNeural',   label: 'Dmitry',   rate: '+8%',  pitch: '+0Hz'  },
  svetlana: { voice: 'ru-RU-SvetlanaNeural', label: 'Svetlana', rate: '+0%',  pitch: '+0Hz'  },
  darya:    { voice: 'ru-RU-DaryaNeural',    label: 'Darya',    rate: '-5%',  pitch: '-5Hz'  },
};

// POST /api/generate-audio
router.post('/api/generate-audio', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, text = '', voiceKey = 'nikolay', voice } = req.body;
    const effectiveVoiceKey = voiceKey || voice || 'nikolay';
    const newsDir = path.resolve(__dirname, '../../news');

    let bundleDir = inputBundleDir;
    if (!bundleDir && folderName) {
      bundleDir = path.join(newsDir, folderName);
    }

    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(400).json({ success: false, error: 'Папка проекта не найдена' });
    }

    const txtPath = path.join(bundleDir, 'script.txt');
    const audioPath = path.join(bundleDir, 'audio.mp3');

    if (!fs.existsSync(txtPath) && text) {
      const cleanSpeechText = text
        .split('\n\n')
        .filter(p => !p.startsWith('[B-Roll:'))
        .join('\n\n');
      fs.writeFileSync(txtPath, cleanSpeechText, 'utf-8');
    }

    if (!fs.existsSync(txtPath)) {
      return res.status(400).json({ success: false, error: 'Файл с текстом script.txt не найден' });
    }

    const voiceCfg = TTS_VOICES[effectiveVoiceKey] || TTS_VOICES.nikolay;
    const cmd = `edge-tts -f "${txtPath}" -v ${voiceCfg.voice} --rate=${voiceCfg.rate} --pitch=${voiceCfg.pitch} --write-media "${audioPath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Audio generation error:', error.message, stderr);
        return res.status(500).json({ success: false, error: `Ошибка генерации аудио: ${error.message}` });
      }

      const jsonPath = path.join(bundleDir, 'project.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          manifest.hasAudio = true;
          manifest.audio_generated_at = new Date().toISOString();
          manifest.voice = voiceCfg.label;
          fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
        } catch {}
      }

      console.log(`🎙️ Аудио-файл сохранен: ${audioPath} (${voiceCfg.label})`);
      res.json({
        success: true,
        audioPath,
        audioFileName: 'audio.mp3',
        audioUrl: `/news-static/${path.basename(bundleDir)}/audio.mp3`,
        folderName: path.basename(bundleDir),
        voice: `${voiceCfg.label} (${voiceCfg.voice})`,
        voiceKey: effectiveVoiceKey,
        rate: voiceCfg.rate,
        pitch: voiceCfg.pitch,
      });
    });
  } catch (err) {
    console.error('Generate audio error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/voices
router.get('/api/voices', (req, res) => {
  res.json({ voices: Object.entries(TTS_VOICES).map(([key, cfg]) => ({ key, label: cfg.label, voice: cfg.voice })) });
});

export default router;
