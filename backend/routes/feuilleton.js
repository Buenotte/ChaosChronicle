import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const MODELS = {
  gemini:   'google/gemini-2.5-flash',
  deepseek: 'deepseek/deepseek-chat',
  qwen:     'qwen/qwen-2.5-72b-instruct',
  free:     'openrouter/free',
};

// ── Hybrid Prompt Builder aus scripts/ (Klimovski, Kasyanov, Golubuckiy) ──────
export function buildHybridPrompt(newsTitle, newsSummary = '') {
  const scriptsDir = path.resolve(__dirname, '../../scripts');
  const gibridPath = path.join(scriptsDir, 'gibrid_style.txt');
  const klimovskiPath = path.join(scriptsDir, 'klimovski_style.txt');
  const kasjanovPath = path.join(scriptsDir, 'kasjanov_style.txt');
  const golubuzkiPath = path.join(scriptsDir, 'golubuzki_style.txt');

  const gibridTemplate = fs.existsSync(gibridPath) ? fs.readFileSync(gibridPath, 'utf-8') : '';
  const klimovskiStyle = fs.existsSync(klimovskiPath) ? fs.readFileSync(klimovskiPath, 'utf-8') : '';
  const kasjanovStyle = fs.existsSync(kasjanovPath) ? fs.readFileSync(kasjanovPath, 'utf-8') : '';
  const golubuzkiStyle = fs.existsSync(golubuzkiPath) ? fs.readFileSync(golubuzkiPath, 'utf-8') : '';

  let fullPrompt = gibridTemplate
    .replace('{Здесь_будет_текст_из_файла_Климовский}', klimovskiStyle)
    .replace('{Здесь_будет_текст_из_файла_Касьянов}', kasjanovStyle)
    .replace('{Здесь_будет_текст_из_файла_Голобуцкий}', golubuzkiStyle);

  const newsText = `ТЕМА НОВОСТИ: ${newsTitle}\nКОНТЕКСТ: ${newsSummary || ''}`;
  fullPrompt = fullPrompt.replace('[ВСТАВЬТЕ ТЕКСТ НОВОСТИ]', newsText);

  // СТРОГИЕ ПРАВИЛА ДЛЯ 100% ЧИСТОЙ ОЗВУЧКИ ГОЛОСОМ ИИ (TTS):
  fullPrompt += `\n\nСТРОЖАЙШИЕ ПРАВИЛА ДЛЯ АУДИО-ОЗВУЧКИ (TTS):\n` +
    `1. ПИШИ ТОЛЬКО ЧИСТЫЙ ПРОИЗНОСИМЫЙ ТЕКСТ ДИКТОРА от первого до последнего слова.\n` +
    `2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать заголовки блоков (например: НЕ ПИШИ "**Блок 1: Ироничный Крючок...**"), НЕ ПИШИ тайминги "(0:00 – 0:45)".\n` +
    `3. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать плейсхолдеры в квадратных скобках типа "[Название_канала]". Называй канал "ChaosChronicle". НЕ вставляй строки [B-Roll:...].\n` +
    `4. Весь текст должен быть единым, ритмичным, готовым дикторским монологом для озвучки голосовым ИИ.`;

  return fullPrompt;
}

// ── Генератор заголовков в стиле Голобуцкого (4-5 слов, сатира & деконструкция) ──
export async function generateGolubuzkiTitle(newsTitle, newsSummary = '') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    return (newsTitle || 'ГЛАВНАЯ НОВОСТЬ ДНЯ').split(/\s+/).slice(0, 5).join(' ').toUpperCase();
  }

  try {
    const scriptsDir = path.resolve(__dirname, '../../scripts');
    const golubuzkiPath = path.join(scriptsDir, 'golubuzki_style.txt');
    const golubuzkiGuide = fs.existsSync(golubuzkiPath) ? fs.readFileSync(golubuzkiPath, 'utf-8').slice(0, 1500) : '';

    const systemPrompt = `Ты — мастер убойных, вирусных и сатирических заголовков для YouTube в авторском стиле «Алексей Голобуцкий» (деконструкция пропаганды, едкая ирония, короткие хлесткие фразы).
Твоя задача: на основе новости создать сатирический, броский заголовок для обложки и видео.
СТРОГИЕ ТРЕБОВАНИЯ:
1. ДЛИНА: СТРОГО 4-5 СЛОВ (не больше и не меньше).
2. СТИЛЬ: Едкий сарказм, деконструкция официальной лжи врага, мемы и триггеры («по плану», «бункерный дед», «высокоточный террор», «аналоговнет», «отрицательный рост»).
3. БЕЗ кавычек, БЕЗ точки на конце.
4. Выведи ТОЛЬКО заголовок из 4-5 слов на русском языке капсом (UPPERCASE). Никаких лишних слов.`;

    const userPrompt = `Новость: ${newsTitle}\nКонтекст: ${newsSummary?.slice(0, 350) || ''}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 40,
        temperature: 0.85,
      }),
      signal: AbortSignal.timeout(7000),
    });

    if (res.ok) {
      const data = await res.json();
      let text = data.choices?.[0]?.message?.content?.trim();
      if (text) {
        text = text.replace(/["'«»`]/g, '').replace(/\.$/, '').trim();
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length >= 3 && words.length <= 6) {
          return text.toUpperCase();
        }
      }
    }
  } catch (err) {
    console.warn('Golubuzki title generation fallback:', err.message);
  }

  return (newsTitle || 'ГЛАВНАЯ НОВОСТЬ ДНЯ').split(/\s+/).slice(0, 5).join(' ').toUpperCase();
}

export function cleanSpeechTextForAudio(rawText = '') {
  return rawText
    .replace(/\[Название_канала\]/g, 'ChaosChronicle')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\*\*\s*Блок\s*\d+:[^*]+\*\*/gi, '')
    .replace(/Блок\s*\d+:[^\n]+/gi, '')
    .replace(/\(\d+:\d+\s*–\s*\d+:\d+\)/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n');
}

// POST /api/generate-feuilleton
router.post('/api/generate-feuilleton', async (req, res) => {
  const { title, summary, model = 'gemini', source = '' } = req.body;
  const modelId = MODELS[model] || MODELS.gemini;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.includes('HIER')) {
    return res.status(500).json({ success: false, error: 'OpenRouter API Key nicht konfiguriert in .env' });
  }

  try {
    const hybridPrompt = buildHybridPrompt(title, summary);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'ChaosChronicle',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'user', content: hybridPrompt },
        ],
        max_tokens: 2200,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    const text = cleanSpeechTextForAudio(rawText);
    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.round((words / 140) * 10) / 10;

    const newsDir = path.resolve(__dirname, '../../news');
    if (!fs.existsSync(newsDir)) {
      fs.mkdirSync(newsDir, { recursive: true });
    }

    const safeTitlePart = (title || '').replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').replace(/_+/g, '_').slice(0, 25);
    let bundleDir = null;

    if (safeTitlePart.length >= 6) {
      const existingDirs = fs.readdirSync(newsDir, { withFileTypes: true });
      for (const d of existingDirs) {
        if (d.isDirectory() && d.name.includes(safeTitlePart)) {
          bundleDir = path.join(newsDir, d.name);
          console.log(`♻️ Bestehenden Ordner für Nachricht wiederverwendet: news/${d.name}`);
          break;
        }
      }
    }

    const now = new Date();
    if (!bundleDir) {
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const safeTitle = (title || 'Feuilleton')
        .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80);
      bundleDir = path.join(newsDir, `${dateStr}_${safeTitle}`);
    }

    const photosDir = path.join(bundleDir, 'photos');
    fs.mkdirSync(photosDir, { recursive: true });

    const imagesList = Array.isArray(req.body.images) && req.body.images.length > 0
      ? req.body.images
      : (req.body.imageUrl ? [req.body.imageUrl] : []);

    // 4-5 слов заголовок в стиле Голобуцкого
    const punchyTitle = await generateGolubuzkiTitle(title, summary);

    const mdContent = `# 🎭 ${punchyTitle || title}\n\n- **Оригинальная тема**: ${title}\n- **Дата**: ${now.toLocaleString('ru-RU')}\n- **Модель ИИ**: ${modelId}\n- **Хронометраж**: ~${minutes} мин.\n- **Количество слов**: ${words}\n- **Источник**: ${source || 'RSS Feed'}\n\n---\n\n${text}\n`;
    const mdPath = path.join(bundleDir, 'script.md');
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    const cleanSpeechText = cleanSpeechTextForAudio(text);
    const txtPath = path.join(bundleDir, 'script.txt');
    fs.writeFileSync(txtPath, cleanSpeechText, 'utf-8');

    const savedPhotos = [];
    for (let i = 0; i < Math.min(imagesList.length, 30); i++) {
      const imgUrl = imagesList[i];
      try {
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(5000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
          const imgFileName = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
          const imgPath = path.join(photosDir, imgFileName);
          fs.writeFileSync(imgPath, buffer);
          savedPhotos.push(`photos/${imgFileName}`);
        }
      } catch (err) {
        console.error(`Fehler beim Herunterladen von Bild ${imgUrl}:`, err.message);
      }
    }

    const projectManifest = {
      title: punchyTitle || title,
      original_title: title,
      source,
      model: modelId,
      date: now.toISOString(),
      duration_target_seconds: Math.round(minutes * 60),
      word_count: words,
      speech_text_file: 'script.txt',
      markdown_file: 'script.md',
      photos: savedPhotos,
    };
    const jsonPath = path.join(bundleDir, 'project.json');
    fs.writeFileSync(jsonPath, JSON.stringify(projectManifest, null, 2), 'utf-8');

    const folderName = path.basename(bundleDir);
    const feuilletonObj = {
      title: punchyTitle || title,
      originalTitle: title,
      text,
      model: modelId,
      modelName: model,
      words,
      minutes,
      readTimeMin: minutes,
      source,
      imageUrl: req.body.imageUrl,
      images: req.body.images || [],
      folderName,
      bundleDir,
    };

    res.json({
      success: true,
      feuilleton: feuilletonObj,
      ...feuilletonObj,
    });
  } catch (err) {
    console.error('Feuilleton error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
