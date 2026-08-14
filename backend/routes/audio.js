import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

export const TTS_VOICES = {
  nikolay:  { voice: 'ru-RU-DmitryNeural',   label: 'Николай (Edge TTS - Рекомендуется)', rate: '+0%',  pitch: '-10Hz', provider: 'edge' },
  dmitry:   { voice: 'ru-RU-DmitryNeural',   label: 'Дмитрий (Edge TTS - Глубокий)',      rate: '+8%',  pitch: '+0Hz',  provider: 'edge' },
  svetlana: { voice: 'ru-RU-SvetlanaNeural', label: 'Светлана (Edge TTS - Женский)',      rate: '+0%',  pitch: '+0Hz',  provider: 'edge' },
  ostap:    { voice: 'uk-UA-OstapNeural',    label: 'Остап (Edge TTS - Украинский)',      rate: '+0%',  pitch: '+0Hz',  provider: 'edge' },
  polina:   { voice: 'uk-UA-PolinaNeural',   label: 'Полина (Edge TTS - Украинский)',     rate: '+0%',  pitch: '+0Hz',  provider: 'edge' },
  el_adam:    { voiceId: 'pNInz6obpgDQGcFmaJgB', label: '⭐ Adam (ElevenLabs - Авторитетный)', provider: 'elevenlabs' },
  el_antoni:  { voiceId: 'ErXwobaYiN019PkySvjV', label: '⭐ Antoni (ElevenLabs - Журналист)', provider: 'elevenlabs' },
  el_arnold:  { voiceId: 'VR6AewLTigWG4xSOukaG', label: '⭐ Arnold (ElevenLabs - Сатирический)', provider: 'elevenlabs' },
  el_george:  { voiceId: 'JBFqnCBsd6RMkjVDRZzb', label: '⭐ George (ElevenLabs - Рассказчик)', provider: 'elevenlabs' },
  el_rachel:  { voiceId: '21m00Tcm4TlvDq8ikWAM', label: '⭐ Rachel (ElevenLabs - Женский)', provider: 'elevenlabs' },
  el_bella:   { voiceId: 'EXAVITQu4vr4xnSDxMaL', label: '⭐ Bella (ElevenLabs - Эмоциональный)', provider: 'elevenlabs' },
};

// POST /api/generate-audio
router.post('/api/generate-audio', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, text = '', voiceKey, voice, customVoiceId } = req.body;
    const effectiveVoiceKey = voiceKey || voice || 'el_adam';
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

    const speechText = fs.readFileSync(txtPath, 'utf-8').trim();
    if (!speechText) {
      return res.status(400).json({ success: false, error: 'Текст для озвучки пуст. Пожалуйста, сначала создайте или сохраните сценарий новости!' });
    }

    const voiceCfg = TTS_VOICES[effectiveVoiceKey] || TTS_VOICES.nikolay;

    // 1. ElevenLabs API Provider
    if (effectiveVoiceKey.startsWith('el_') || voiceCfg.provider === 'elevenlabs' || customVoiceId) {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey || apiKey.includes('HIER')) {
        return res.status(400).json({ success: false, error: 'ELEVENLABS_API_KEY не настроен в .env' });
      }

      const voiceId = customVoiceId || voiceCfg.voiceId || 'pNInz6obpgDQGcFmaJgB';
      const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: speechText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!elRes.ok) {
        const errJson = await elRes.json().catch(() => ({}));
        throw new Error(errJson.detail?.message || `ElevenLabs API error: ${elRes.status}`);
      }

      const arrayBuf = await elRes.arrayBuffer();
      fs.writeFileSync(audioPath, Buffer.from(arrayBuf));

      const jsonPath = path.join(bundleDir, 'project.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          manifest.hasAudio = true;
          manifest.audio_generated_at = new Date().toISOString();
          manifest.voice = voiceCfg.label || `ElevenLabs (${voiceId})`;
          manifest.audio_provider = 'elevenlabs';
          fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
        } catch {}
      }

      console.log(`🎙️ [ElevenLabs] Аудио-файл сохранен: ${audioPath} (${voiceCfg.label})`);
      return res.json({
        success: true,
        audioPath,
        audioFileName: 'audio.mp3',
        audioUrl: `/news-static/${path.basename(bundleDir)}/audio.mp3`,
        folderName: path.basename(bundleDir),
        voice: voiceCfg.label,
        provider: 'elevenlabs',
        voiceKey: effectiveVoiceKey,
      });
    }

    // 2. Microsoft Edge-TTS Provider (Default / Free)
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
          manifest.audio_provider = 'edge-tts';
          fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
        } catch {}
      }

      console.log(`🎙️ [Edge-TTS] Аудио-файл сохранен: ${audioPath} (${voiceCfg.label})`);
      res.json({
        success: true,
        audioPath,
        audioFileName: 'audio.mp3',
        audioUrl: `/news-static/${path.basename(bundleDir)}/audio.mp3`,
        folderName: path.basename(bundleDir),
        voice: `${voiceCfg.label} (${voiceCfg.voice})`,
        provider: 'edge-tts',
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
  res.json({ voices: Object.entries(TTS_VOICES).map(([key, cfg]) => ({ key, label: cfg.label, provider: cfg.provider, voiceId: cfg.voiceId, voice: cfg.voice })) });
});

export default router;
