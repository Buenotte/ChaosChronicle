import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isValidYouTubeUrl,
  fetchYouTubeMetadata,
  downloadYouTubeAudio,
  transcribeAudioFile,
  downloadThumbnail,
  downloadSubtitlesIfAvailable,
} from '../services/youtubeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const newsDir = path.resolve(__dirname, '../../news');

export const YOUTUBE_STYLES = {
  scipop: {
    id: 'scipop',
    name: '🌟 Увлекательный Научпоп & Факты',
    systemInstruction: `Ты — ведущий научно-популярного YouTube-канала (в духе Veritasium, Kurzgesagt, Научпок).
Твоя задача — создать захватывающий, ясный и доступный рассказ на 3 минуты (СТРОГО 400–550 слов).
Правила:
- Ошеломляющий хук с первой секунды: парадокс природы, необычный факт или вопрос, взрывающий шаблоны.
- Доступные и яркие аналогии на простых примерах, объясняющие сложные вещи на пальцах.
- Эффект «вау» и неподдельный восторг перед законами Вселенной и науки.
- КАТЕГОРИЧЕСКИ БЕЗ формата интервью: не упоминай ведущих, интервьюеров и имена гостей/экспертов («У нас в гостях...», «Доктор Бузунов рассказал...»). Рассказывай только о САМИХ научных явлениях и фактах напрямую зрителю.
- БЕЗ диалогов, БЕЗ символов «>>», БЕЗ приветствий («Всем привет») и концовок («Ставьте лайки»).
- СТРОГО цельный авторский монолог диктора на чистом русском языке.`,
  },
  mystery: {
    id: 'mystery',
    name: '🕵️ Тайны Истории & Загадки Прошлого',
    systemInstruction: `Ты — ведущий топового документально-исторического YouTube-канала с атмосферой глубокого саспенса и расследования.
Твоя задача — создать интригующий документальный монолог на 3 минуты (СТРОГО 400–550 слов).
Правила:
- Загадочное начало: забытый артефакт, исчезнувшая экспедиция, нестыковка в официальной хронике.
- Нагнетание интриги шаг за шагом, как в детективном триллере, с опорой на реальные факты и детали.
- Кинематографичный язык документального расследования, удерживающий напряжение.
- КАТЕГОРИЧЕСКИ БЕЗ формата интервью: никаких гостей, экспертов («в студии...», «наш эксперт...»). Рассказывай только саму тайну и события прошлого напрямую зрителю.
- БЕЗ диалогов, БЕЗ символов «>>», БЕЗ приветствий, прощаний и ремарок в скобках.
- СТРОГО цельный монолог для озвучки.`,
  },
  tech_future: {
    id: 'tech_future',
    name: '🚀 Технологии Будущего & Инженерия',
    systemInstruction: `Ты — визионер технологий, космических открытий и революционной инженерии на YouTube.
Твоя задача — создать вдохновляющий и динамичный рассказ на 3 минуты (СТРОГО 400–550 слов).
Правила:
- Старт с масштаба: как изобретение или открытие изменит цивилизацию в ближайшие годы.
- Понятный разбор инженерных решений: алгоритмы ИИ, мегаструктуры, космические миссии, квантовые скачки.
- Высокий темп, технологический оптимизм, смелый взгляд за горизонт возможностей.
- КАТЕГОРИЧЕСКИ БЕЗ формата интервью: никаких бесед, подкастов и имен спикеров. Рассказывай только о самих технологиях, инженерных решениях и будущем.
- БЕЗ диалогов, БЕЗ символов «>>», БЕЗ приветствий и шаблонных клише.
- СТРОГО готовый монолог диктора для озвучки.`,
  },
  psychology: {
    id: 'psychology',
    name: '🧠 Человек & Скрытые Законы Психики',
    systemInstruction: `Ты — исследователь поведения человека, тайн мозга и эволюционной психологии на YouTube.
Твоя задача — создать переворачивающий сознание психологический монолог на 3 минуты (СТРОГО 400–550 слов).
Правила:
- Мгновенный крючок в зрителя: демонстрация когнитивной ошибки или ловушки мозга, в которую человек попадает каждый день.
- Разбор психологических механизмов: гормоны, эволюционные инстинкты, парадоксы выбора и скрытые мотивы.
- Диалог напрямую с аудиторией, побуждающий взглянуть на себя совершенно по-новому.
- КАТЕГОРИЧЕСКИ БЕЗ формата интервью: никаких гостей, ведущих и упоминания интервью («у меня в студии...», «гость программы...»). Только чистая психология и работа мозга.
- БЕЗ диалогов, БЕЗ символов «>>», БЕЗ приветствий и ссылок.
- СТРОГО чистый текст авторского монолога для диктора.`,
  },
  storytelling: {
    id: 'storytelling',
    name: '🔥 Вирусный Топ-Сторителлинг (Высокий CTR)',
    systemInstruction: `Ты — мастер вирусного сторителлинга на YouTube с удержанием внимания 100% от начала до конца.
Твоя задача — упаковать историю в остросюжетный, кинематографичный рассказ на 3 минуты (СТРОГО 400–550 слов).
Правила:
- Взрывное начало на первой секунде: кульминация, ставка «всё или ничего» или драматический выбор.
- Открытые петли (open loops) и эмоциональные качели: от отчаяния к триумфу, от загадки к откровению.
- Плотный динамичный слог, изобилие глаголов действия, хлесткий ритм.
- КАТЕГОРИЧЕСКИ БЕЗ формата интервью: никаких упоминаний спикеров видео, ведущих или диалогов («Здравствуйте — Здравствуйте»). Рассказывай историю как единый захватывающий сюжет.
- БЕЗ диалогов, БЕЗ символов «>>», БЕЗ призывов подписаться и скобок.
- СТРОГО чистый монолог для озвучки.`,
  },
};

// Helper to call Gemini 3.8 Flash direct or OpenRouter
async function generateScriptWithAI(systemInstruction, userInstruction, maxTokens = 8000) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.includes('HIER')) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userInstruction }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: maxTokens },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (response.ok) {
        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const answerPart = parts.find(p => !p.thought && p.text) || parts[parts.length - 1];
        const text = answerPart?.text;
        if (text && text.trim().length > 100) return text.trim();
      }
    } catch (err) {
      console.warn('Gemini 3.8 direct generation failed, trying OpenRouter:', err.message);
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey && !apiKey.includes('HIER')) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userInstruction }],
          max_tokens: maxTokens,
          temperature: 0.85,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text && text.trim().length > 100) return text.trim();
      }
    } catch (err) {
      console.warn('OpenRouter script generation failed:', err.message);
    }
  }
  throw new Error('Не удалось сгенерировать текст: ИИ API недоступен');
}

// POST /api/youtube/info - Preview metadata only
router.post('/api/youtube/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!isValidYouTubeUrl(url)) {
      return res.status(400).json({ success: false, error: 'Некорректная ссылка на YouTube' });
    }
    const metadata = await fetchYouTubeMetadata(url);
    res.json({ success: true, metadata });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/youtube/import-to-package - Complete pipeline
router.post('/api/youtube/import-to-package', async (req, res) => {
  const { url, style = 'scipop', model = 'gemini' } = req.body;

  if (!isValidYouTubeUrl(url)) {
    return res.status(400).json({ success: false, error: 'Пожалуйста, укажите корректную ссылку на YouTube видео или Shorts' });
  }

  try {
    if (!fs.existsSync(newsDir)) fs.mkdirSync(newsDir, { recursive: true });

    // 1. Fetch metadata
    const metadata = await fetchYouTubeMetadata(url);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = (metadata.title || 'YouTube').replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').replace(/_+/g, '_').slice(0, 75);
    const folderName = `${dateStr}_YT_${safeTitle}`;
    const bundleDir = path.join(newsDir, folderName);
    fs.mkdirSync(bundleDir, { recursive: true });

    // 2. Try fast subtitles first
    let rawText = '';
    let transcriptResult = null;
    try {
      const subText = await downloadSubtitlesIfAvailable(url, bundleDir);
      if (subText && subText.length > 80) {
        rawText = subText;
      }
    } catch (subErr) {
      console.warn('Subtitles warning:', subErr.message);
    }

    // 3. Download Source Audio for Whisper transcription
    const audioPath = await downloadYouTubeAudio(url, bundleDir, 'yt_source_audio');

    // 4. If subtitles missing or short, transcribe audio with Whisper
    if (!rawText || rawText.length < 120) {
      try {
        transcriptResult = await transcribeAudioFile(audioPath, 'base');
        if (transcriptResult?.text && transcriptResult.text.length > 30) {
          rawText = transcriptResult.text;
        }
      } catch (transcribeErr) {
        console.warn('Audio transcription warning:', transcribeErr.message);
      }
    }

    if (!rawText.trim() || rawText.trim().length < 20) {
      rawText = `${metadata.title}\n\n${metadata.description || 'Видеоматериал YouTube'}`;
    }

    // 5. Generate 3-minute Script (400-550 words) with one of 5 YouTube styles
    const selectedStyle = YOUTUBE_STYLES[style] || YOUTUBE_STYLES.scipop;
    const systemInstruction = selectedStyle.systemInstruction;
    const userPrompt = `ИСТОЧНИК: YouTube-видео "${metadata.title}" (Канал: ${metadata.channel})
ПРОДОЛЖИТЕЛЬНОСТЬ ОРИГИНАЛА: ${Math.round((metadata.duration || 0) / 60)} мин.

ТЕКСТ ИЗ АУДИО / СУТЬ ВИДЕО:
"""
${rawText.slice(0, 60000)}
"""

ЗАДАЧА:
На основе фактов и сути создай ЗАХВАТЫВАЮЩИЙ, ЦЕЛЬНЫЙ 3-МИНУТНЫЙ ТЕКСТ (СТРОГО 400–550 СЛОВ) в выбранном стиле («${selectedStyle.name}»).

ЖЕЛЕЗНЫЕ ПРАВИЛА:
1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕН ФОРМАТ ИНТЕРВЬЮ: Никаких упоминаний ведущих, интервьюеров, гостей или экспертов (ЗАПРЕЩЕНО: «Сегодня у нас в гостях...», «Доктор Бузунов рассказал...», «наш гость пояснил»).
2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ ДИАЛОГИ И ПРИВЕТСТВИЯ: Никаких «Добрый день», диалоговых реплик и символов «>>» или «&gt;&gt;».
3. РАССКАЗЫВАЙ ТОЛЬКО О САМОЙ ТЕМЕ: Захватывающе объясняй сами явления, научные факты, парадоксы и суть проблемы напрямую зрителю.
4. Мощный интригующий хук с первых секунд, живой и образный язык, чистый монолог без скобок и шаблонов.
5. Готовый связный текст монолога для диктора (400–550 слов):`;

    const rawGenerated = await generateScriptWithAI(systemInstruction, userPrompt, 8000);
    const generatedScript = rawGenerated
      .replace(/&gt;&gt;/g, '')
      .replace(/>>/g, '')
      .replace(/^[\-\u2013\u2014]\s+/gm, '')
      .replace(/^(Добрый (день|вечер|утро)|Здравствуйте)[^.!?\n]*[.!?\n]+/gmi, '')
      .trim();
    const wordCount = generatedScript.split(/\s+/).filter(Boolean).length;

    // 6. Download Thumbnail
    const thumbDir = path.join(bundleDir, 'thumbnail');
    const photosDir = path.join(bundleDir, 'photos');
    fs.mkdirSync(thumbDir, { recursive: true });
    fs.mkdirSync(photosDir, { recursive: true });

    if (metadata.thumbnail) {
      await downloadThumbnail(metadata.thumbnail, path.join(thumbDir, 'thumbnail.jpg'));
      await downloadThumbnail(metadata.thumbnail, path.join(photosDir, 'yt_original_cover.jpg'));
    }

    // 7. Save package files
    fs.writeFileSync(path.join(bundleDir, 'script.txt'), generatedScript, 'utf-8');
    fs.writeFileSync(path.join(bundleDir, 'source.txt'), rawText, 'utf-8');
    fs.writeFileSync(path.join(bundleDir, 'original_news.txt'), rawText, 'utf-8');

    const mdContent = `# 🎬 ${metadata.title}
**Источник:** YouTube · ${metadata.channel} | **Длина оригинала:** ${metadata.duration || 0} сек.
**Ссылка:** ${metadata.url}
**Стиль:** ${selectedStyle.name} | **Сгенерировано слов:** ${wordCount} (~3 мин. чтения)

---

## 🎙️ Сценарий YouTube видео (3 минуты)
${generatedScript}

---

## 📝 Исходный транскрипт аудио / Описание
${rawText}
`;
    fs.writeFileSync(path.join(bundleDir, 'script.md'), mdContent, 'utf-8');

    if (transcriptResult) {
      fs.writeFileSync(path.join(bundleDir, 'transcript.json'), JSON.stringify(transcriptResult, null, 2), 'utf-8');
    }

    // 8. Save project.json manifest
    const manifest = {
      title: metadata.title,
      original_title: metadata.title,
      url: metadata.url,
      date: new Date().toISOString(),
      model,
      style: selectedStyle.id,
      style_name: selectedStyle.name,
      source: `YouTube: ${metadata.channel}`,
      summary: rawText.slice(0, 600),
      original_news: rawText,
      word_count: wordCount,
      created_at: new Date().toISOString(),
      photos: metadata.thumbnail ? ['/news-static/' + folderName + '/photos/yt_original_cover.jpg'] : [],
      audio: null,
      hasAudio: false,
      sourceAudio: fs.existsSync(audioPath) ? 'yt_source_audio.mp3' : null,
      video: 'video.mp4',
      youtubeMetadata: {
        id: metadata.id,
        channel: metadata.channel,
        duration: metadata.duration,
        viewCount: metadata.viewCount,
      },
    };
    fs.writeFileSync(path.join(bundleDir, 'project.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    res.json({
      success: true,
      folderName,
      bundleDir,
      title: metadata.title,
      text: generatedScript,
      wordCount,
      metadata,
      hasAudio: fs.existsSync(audioPath),
      transcript: transcriptResult,
    });
  } catch (err) {
    console.error('YouTube import to package error:', err);
    res.status(500).json({ success: false, error: err.message || 'Ошибка обработки YouTube видео' });
  }
});

export default router;
