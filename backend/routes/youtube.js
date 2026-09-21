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
import { generateTitleVariants } from '../services/packageTitleService.js';
import { YOUTUBE_STYLES } from '../services/youtubeStyles.js';
import { extractTwentyFactsFromTranscript } from '../services/youtubeFactsService.js';

export { YOUTUBE_STYLES };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const newsDir = path.resolve(__dirname, '../../news');

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
      console.warn('Gemini direct script generation failed, trying OpenRouter:', err.message);
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

export async function buildYouTubeScript(rawText, selectedStyle, metadata = {}) {
  const systemInstruction = selectedStyle.systemInstruction || YOUTUBE_STYLES.scipop.systemInstruction;
  let factsPrompt = '';
  if (metadata.selectedFacts && Array.isArray(metadata.selectedFacts) && metadata.selectedFacts.length > 0) {
    factsPrompt = `\nВЫБРАННЫЕ ПОЛЬЗОВАТЕЛЕМ КЛЮЧЕВЫЕ ФАКТЫ ДЛЯ СЦЕНАРИЯ:\n` +
      metadata.selectedFacts.map((f, i) => `${i + 1}. [${f.title}]: ${f.text}`).join('\n') +
      `\nСТРОГОЕ ТРЕБОВАНИЕ: Построй 3-минутный монолог ИМЕННО вокруг этих фактов! Раскрой их детали и парадоксы. Не отвлекайся на посторонние темы.\n`;
  }

  const userPrompt = `ИСТОЧНИК: YouTube "${metadata.title || 'YouTube'}" (${metadata.channel || ''})
${metadata.duration ? `ПРОДОЛЖИТЕЛЬНОСТЬ: ${Math.round(metadata.duration / 60)} мин.` : ''}
${factsPrompt}
ТЕКСТ ИЗ АУДИО / СУТЬ ВИДЕО:
"""
${rawText.slice(0, 60000)}
"""
ЗАДАЧА:
Создай ЗАХВАТЫВАЮЩИЙ, ЦЕЛЬНЫЙ 3-МИНУТНЫЙ ТЕКСТ (СТРОГО 400–550 СЛОВ) в стиле «${selectedStyle.name}».
ПРАВИЛА:
1. КАТЕГОРИЧЕСКИ БЕЗ ФОРМАТА ИНТЕРВЬЮ: Никаких гостей, интервьюеров и ведущих («Сегодня у нас...», «доктор», «Бузунов»).
2. БЕЗ ДИАЛОГОВ И ПРИВЕТСТВИЙ: Никаких «Добрый день», реплик и символов «>>».
3. РАССКАЗЫВАЙ ТОЛЬКО О САМОЙ ТЕМЕ: Захватывающе объясняй факты и явления зрителю напрямую.
4. Мощный хук с первых секунд, чистый монолог диктора (400–550 слов):`;

  const rawGenerated = await generateScriptWithAI(systemInstruction, userPrompt, 8000);
  return rawGenerated.replace(/&gt;&gt;/g, '').replace(/>>/g, '').replace(/^[\-\u2013\u2014]\s+/gm, '').replace(/^(Добрый (день|вечер|утро)|Здравствуйте)[^.!?\n]*[.!?\n]+/gmi, '').trim();
}

// POST /api/youtube/info - Preview metadata only
router.post('/api/youtube/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!isValidYouTubeUrl(url)) return res.status(400).json({ success: false, error: 'Некорректная ссылка на YouTube' });
    const metadata = await fetchYouTubeMetadata(url);
    res.json({ success: true, metadata });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/youtube/extract-facts - Extract 20 key facts (from URL, package folder, or raw text)
router.post('/api/youtube/extract-facts', async (req, res) => {
  try {
    const { url, folderName, bundleDir: inputBundleDir, text: inputText, title: inputTitle, force = false } = req.body;
    let rawText = (inputText || '').trim(), title = (inputTitle || '').trim();
    const targetFolder = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);

    // 1. Из существующего пакета на диске
    if (targetFolder && fs.existsSync(targetFolder)) {
      const jsonPath = path.join(targetFolder, 'project.json');
      let manifest = {};
      if (fs.existsSync(jsonPath)) {
        try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
      }
      if (!title) title = manifest.title || manifest.original_title || path.basename(targetFolder);
      if (!force && Array.isArray(manifest.facts) && manifest.facts.length > 0) {
        return res.json({ success: true, facts: manifest.facts, factsCount: manifest.facts.length, title, cached: true });
      }
      if (!rawText) {
        const origPath = path.join(targetFolder, 'original_news.txt'), srcPath = path.join(targetFolder, 'source.txt'), mdPath = path.join(targetFolder, 'script.md');
        if (fs.existsSync(origPath)) rawText = fs.readFileSync(origPath, 'utf-8');
        else if (fs.existsSync(srcPath)) rawText = fs.readFileSync(srcPath, 'utf-8');
        else if (fs.existsSync(mdPath)) rawText = fs.readFileSync(mdPath, 'utf-8');
        else if (manifest.original_news || manifest.summary) rawText = manifest.original_news || manifest.summary;
      }
      if (rawText && rawText.length >= 40) {
        const facts = await extractTwentyFactsFromTranscript(rawText, title);
        manifest.facts = facts;
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
        return res.json({ success: true, facts, factsCount: facts.length, title });
      }
    }

    // 2. Из переданного текста
    if (rawText && rawText.length >= 40) {
      const facts = await extractTwentyFactsFromTranscript(rawText, title || 'Материал');
      return res.json({ success: true, facts, factsCount: facts.length, title: title || 'Материал' });
    }

    // 3. Скачивание по YouTube URL
    if (!isValidYouTubeUrl(url)) return res.status(400).json({ success: false, error: 'Укажите ссылку на YouTube или текст для анализа' });

    const metadata = await fetchYouTubeMetadata(url);
    const tempDir = path.join(newsDir, `_temp_yt_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const subText = await downloadSubtitlesIfAvailable(url, tempDir);
      if (subText && subText.length > 80) rawText = subText;
    } catch {}

    if (!rawText || rawText.length < 120) {
      try {
        const audioPath = await downloadYouTubeAudio(url, tempDir, 'temp_fact_audio');
        const tr = await transcribeAudioFile(audioPath, 'base');
        if (tr?.text && tr.text.length > 30) rawText = tr.text;
      } catch (err) { console.warn('Audio transcription warning for facts:', err.message); }
    }

    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    if (!rawText || rawText.length < 40) rawText = `${metadata.title}\n\n${metadata.description || ''}`;

    const facts = await extractTwentyFactsFromTranscript(rawText, metadata.title);
    res.json({ success: true, metadata, facts, factsCount: facts.length });
  } catch (err) {
    console.error('Extract facts error:', err);
    res.status(500).json({ success: false, error: err.message || 'Ошибка извлечения фактов' });
  }
});

// POST /api/youtube/import-to-package - Complete pipeline
router.post('/api/youtube/import-to-package', async (req, res) => {
  const { url, style = 'scipop', model = 'gemini', selectedFacts = null } = req.body;
  if (!isValidYouTubeUrl(url)) return res.status(400).json({ success: false, error: 'Укажите корректную ссылку на YouTube' });

  try {
    if (!fs.existsSync(newsDir)) fs.mkdirSync(newsDir, { recursive: true });

    const metadata = await fetchYouTubeMetadata(url);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = (metadata.title || 'YouTube').replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').replace(/_+/g, '_').slice(0, 75);
    const folderName = `${dateStr}_YT_${safeTitle}`;
    const bundleDir = path.join(newsDir, folderName);
    fs.mkdirSync(bundleDir, { recursive: true });

    let rawText = '';
    let transcriptResult = null;
    try {
      const subText = await downloadSubtitlesIfAvailable(url, bundleDir);
      if (subText && subText.length > 80) rawText = subText;
    } catch {}

    const audioPath = await downloadYouTubeAudio(url, bundleDir, 'yt_source_audio');

    if (!rawText || rawText.length < 120) {
      try {
        transcriptResult = await transcribeAudioFile(audioPath, 'base');
        if (transcriptResult?.text && transcriptResult.text.length > 30) rawText = transcriptResult.text;
      } catch (err) {
        console.warn('Audio transcription warning:', err.message);
      }
    }

    if (!rawText.trim() || rawText.trim().length < 20) {
      rawText = `${metadata.title}\n\n${metadata.description || 'Видеоматериал YouTube'}`;
    }

    const selectedStyle = YOUTUBE_STYLES[style] || YOUTUBE_STYLES.scipop;
    const generatedScript = await buildYouTubeScript(rawText, selectedStyle, { ...metadata, selectedFacts });
    const wordCount = generatedScript.split(/\s+/).filter(Boolean).length;

    const thumbDir = path.join(bundleDir, 'thumbnail');
    const photosDir = path.join(bundleDir, 'photos');
    fs.mkdirSync(thumbDir, { recursive: true });
    fs.mkdirSync(photosDir, { recursive: true });

    if (metadata.thumbnail) {
      await downloadThumbnail(metadata.thumbnail, path.join(thumbDir, 'thumbnail.jpg'));
      await downloadThumbnail(metadata.thumbnail, path.join(photosDir, 'yt_original_cover.jpg'));
    }

    fs.writeFileSync(path.join(bundleDir, 'script.txt'), generatedScript, 'utf-8');
    fs.writeFileSync(path.join(bundleDir, 'source.txt'), rawText, 'utf-8');
    fs.writeFileSync(path.join(bundleDir, 'original_news.txt'), rawText, 'utf-8');

    const mdContent = `# 🎬 ${metadata.title}
**Источник:** YouTube · ${metadata.channel} | **Длина:** ${metadata.duration || 0} сек.
**Стиль:** ${selectedStyle.name} | **Слов:** ${wordCount} (~3 мин.)
${selectedFacts?.length ? `\n### 📌 Выбранные факты:\n${selectedFacts.map(f => `- **${f.title}**: ${f.text}`).join('\n')}\n` : ''}
---
## 🎙️ Сценарий YouTube видео (3 минуты)
${generatedScript}
---
## 📝 Исходный транскрипт
${rawText}
`;
    fs.writeFileSync(path.join(bundleDir, 'script.md'), mdContent, 'utf-8');

    if (transcriptResult) {
      fs.writeFileSync(path.join(bundleDir, 'transcript.json'), JSON.stringify(transcriptResult, null, 2), 'utf-8');
    }

    let titleVariants = [];
    try {
      const tvRes = await generateTitleVariants(metadata.title, rawText.slice(0, 500), bundleDir, folderName, true, selectedStyle.id, generatedScript, '');
      titleVariants = tvRes?.variants || [];
    } catch {}
    const chosenTitle = (titleVariants.length > 0) ? titleVariants[0] : metadata.title;

    const manifest = {
      title: chosenTitle,
      original_title: metadata.title,
      title_variants: titleVariants,
      title_variants_style: selectedStyle.id,
      isYouTube: true,
      url: metadata.url,
      date: new Date().toISOString(),
      model,
      style: selectedStyle.id,
      style_name: selectedStyle.name,
      selectedFacts: selectedFacts || null,
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
      title: chosenTitle,
      titleVariants,
      text: generatedScript,
      wordCount,
      metadata,
      hasAudio: fs.existsSync(audioPath),
      transcript: transcriptResult,
    });
  } catch (err) {
    console.error('YouTube import error:', err);
    res.status(500).json({ success: false, error: err.message || 'Ошибка обработки YouTube видео' });
  }
});

// POST /api/youtube/regenerate-script
router.post('/api/youtube/regenerate-script', async (req, res) => {
  try {
    const { bundleDir, folderName, style = 'scipop', selectedFacts } = req.body;
    const targetFolder = bundleDir || (folderName ? path.join(newsDir, folderName) : null);
    if (!targetFolder || !fs.existsSync(targetFolder)) return res.status(404).json({ success: false, error: 'Папка пакета не найдена' });

    let sourceText = '';
    const origPath = path.join(targetFolder, 'original_news.txt'), txtPath = path.join(targetFolder, 'script.txt');
    if (fs.existsSync(origPath)) sourceText = fs.readFileSync(origPath, 'utf-8');
    else if (fs.existsSync(txtPath)) sourceText = fs.readFileSync(txtPath, 'utf-8');
    if (!sourceText.trim()) return res.status(400).json({ success: false, error: 'Исходный текст отсутствует' });

    const selectedStyle = YOUTUBE_STYLES[style] || YOUTUBE_STYLES.scipop;
    let meta = {};
    const jsonPath = path.join(targetFolder, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try { meta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
    }

    const effectiveFacts = selectedFacts !== undefined ? selectedFacts : meta.selectedFacts;
    const generatedScript = await buildYouTubeScript(sourceText, selectedStyle, {
      title: meta.title || meta.original_title,
      channel: meta.youtubeMetadata?.channel,
      selectedFacts: effectiveFacts,
    });
    const wordCount = generatedScript.split(/\s+/).filter(Boolean).length;
    fs.writeFileSync(txtPath, generatedScript, 'utf-8');

    let titleVariants = [];
    try {
      const tvRes = await generateTitleVariants(meta.original_title || meta.title || '', sourceText.slice(0, 500), targetFolder, folderName, true, selectedStyle.id, generatedScript, '', true);
      titleVariants = tvRes?.variants || [];
    } catch {}

    if (fs.existsSync(jsonPath)) {
      try {
        const m = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        m.style = selectedStyle.id;
        m.style_name = selectedStyle.name;
        m.word_count = wordCount;
        m.isYouTube = true;
        if (selectedFacts !== undefined) m.selectedFacts = selectedFacts;
        if (titleVariants.length > 0) {
          m.title_variants = titleVariants;
          m.title_variants_style = selectedStyle.id;
        }
        fs.writeFileSync(jsonPath, JSON.stringify(m, null, 2), 'utf-8');
      } catch {}
    }

    res.json({ success: true, text: generatedScript, titleVariants, wordCount, style: selectedStyle.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
