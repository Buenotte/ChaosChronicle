import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { overlayRussianHeadlineOnThumbnail } from './thumbnailOverlayService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

const TITLE_STYLES = {
  clickbait: {
    name: '🔥 Кликбейт & YouTube Топ (CTR 20%+)',
    desc: 'Максимальная кликабельность, интрига, шок-фактор, мощные глаголы, вопросы, открытая петля любопытства, эффект разорвавшейся бомбы.',
  },
  golubuzki: {
    name: '🎭 Алексей Голобуцкий (Сатира & Сарказм)',
    desc: 'Едкий сарказм, язвительное высмеивание бункера, мемы («по плану», «бункерный дед», «аналоговнет», «отрицательный рост», «скрепы»).',
  },
  kasjanov: {
    name: '🪖 Юрий Касьянов (Военный реализм)',
    desc: 'Военно-технический реализм, акцент на ТТХ, дроны, логистику, цену ошибок и точный расчет.',
  },
  klimovski: {
    name: '🔬 Юрий Климовский (Клиническая геополитика)',
    desc: 'Клинический диагноз, геополитический цинизм, снятие имперских брендов, кулуарные кураторы.',
  },
  gibrid: {
    name: '⚡ Гибридный стиль (3 в 1)',
    desc: 'Синтез едкой сатиры, военного реализма и геополитического анализа.',
  },
};

export async function generateTitleVariants(title = '', summary = '', bundleDir = null, folderName = null, forceRegenerate = false, style = 'clickbait', text = '') {
  let effectiveTitle = title;
  let existingVariants = [];
  let scriptContent = text || '';

  let targetFolder = bundleDir;
  if (!targetFolder && folderName) {
    targetFolder = path.join(newsDir, folderName);
  }
  let jsonPath = null;
  if (targetFolder && fs.existsSync(targetFolder)) {
    jsonPath = path.join(targetFolder, 'project.json');
    const txtPath = path.join(targetFolder, 'script.txt');
    if (!scriptContent && fs.existsSync(txtPath)) {
      try { scriptContent = fs.readFileSync(txtPath, 'utf-8'); } catch {}
    }
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (!effectiveTitle) {
          if (manifest.original_title) effectiveTitle = manifest.original_title;
          else if (manifest.title) effectiveTitle = manifest.title;
        }
        if (!forceRegenerate && Array.isArray(manifest.title_variants) && manifest.title_variants.length > 0) {
          existingVariants = manifest.title_variants;
        }
      } catch {}
    }
  }

  if (!forceRegenerate && existingVariants.length > 0) {
    return {
      resolvedTitle: effectiveTitle,
      variants: existingVariants,
      style,
      fromCache: true,
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    return {
      resolvedTitle: effectiveTitle,
      variants: existingVariants.length > 0 ? existingVariants : [
        effectiveTitle.slice(0, 30),
        `УДАР ПО ${effectiveTitle.slice(0, 20)}`,
        `САМОЛИКВИДАЦИЯ: ${effectiveTitle.slice(0, 15)}`,
      ],
      style,
    };
  }

  const selectedStyleConfig = TITLE_STYLES[style] || TITLE_STYLES.clickbait;
  const systemPrompt = `Ты — лучший в мире YouTube-продюсер и эксперт по вирусным обложкам и кликабельным заголовкам (CTR 15-25%) в стиле: ${selectedStyleConfig.name}.
ОСОБЕННОСТИ СТИЛЯ: ${selectedStyleConfig.desc}

Твоя задача: Создать РОВНО 10 РАЗНЫХ супер-кликабельных, цепляющих и убойных YouTube-заголовков, которые заставляют зрителя немедленно кликнуть на видео!

СТРОГИЕ ПРАВИЛА И СТРУКТУРА:
1. ДЛИНА: СТРОГО 4-5 СЛОВ (идеально для обложек и ленты YouTube).
2. СУТЬ И КЛИКАБЕЛЬНОСТЬ: Используй проверенные вирусные YouTube-формулы:
   - Интрига и вопрос (ЧТО СКРЫВАЮТ?, КУДА ПРИЛЕТЕЛО НА САМОМ ДЕЛЕ?, КТО ОТВЕТИТ?)
   - Шок-фактор и срыв покровов (ТАКОГО НЕ ОЖИДАЛИ, ПРИКАЗ БЫЛ ОТДАН, СРОЧНЫЙ УДАР)
   - Конкретика темы (называй место, суть события, главных действующих лиц)
   - Жесткая эмоциональная оценка и ирония по выбранному стилю.
3. БЕЗ кавычек, БЕЗ нумерации, БЕЗ точек на конце.
4. ВЫВОД: Выведи РОВНО 10 строк, по одному заголовку на строку (капсом UPPERCASE). Никаких вводных слов или пояснений.`;

  const contextBody = scriptContent ? `\n\nДЕТАЛИ ИЗ СЦЕНАРИЯ:\n"""\n${scriptContent.slice(0, 1200)}\n"""` : '';
  const userPrompt = `НОВОСТЬ / ТЕМА:\n"${effectiveTitle}"${contextBody}\n\nСгенерируй 10 убойных, супер-кликабельных заголовков из 4-5 слов для YouTube:`;

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
        max_tokens: 350,
        temperature: 0.9,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!aiRes.ok) throw new Error(`AI API error: ${aiRes.status}`);

    const data = await aiRes.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    const rawLines = rawContent
      .split('\n')
      .map(l => l.replace(/^[\d\s.\-•*]+/, '').replace(/["'«»`]/g, '').trim().toUpperCase())
      .filter(l => l.length > 5 && l.split(/\s+/).length >= 3 && l.split(/\s+/).length <= 7);

    const uniqueVariants = Array.from(new Set(rawLines)).slice(0, 10);
    const finalVariants = uniqueVariants.length > 0 ? uniqueVariants : (existingVariants.length > 0 ? existingVariants : [effectiveTitle]);

    if (jsonPath && fs.existsSync(jsonPath) && finalVariants.length > 0) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        manifest.title_variants = finalVariants;
        manifest.title_variants_style = style;
        manifest.title_variants_updated_at = new Date().toISOString();
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {}
    }

    return {
      resolvedTitle: effectiveTitle,
      variants: finalVariants,
      style,
    };
  } catch (err) {
    return {
      resolvedTitle: effectiveTitle,
      variants: existingVariants.length > 0 ? existingVariants : [effectiveTitle],
      style,
    };
  }
}

export function updatePackageTitle(bundleDir, newTitle, updateThumbnail = true, titleOptions = {}) {
  if (!bundleDir || !fs.existsSync(bundleDir)) {
    return { success: false, error: 'Папка пакета не найдена' };
  }

  const cleanTitle = newTitle.trim();
  const jsonPath = path.join(bundleDir, 'project.json');
  let manifest = {};
  if (fs.existsSync(jsonPath)) {
    try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
  }

  manifest.title = cleanTitle;
  manifest.title_updated_at = new Date().toISOString();
  if (titleOptions && Object.keys(titleOptions).length > 0) {
    manifest.headlineConfig = { ...(manifest.headlineConfig || {}), ...titleOptions };
  }
  fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

  let thumbUpdated = false;
  let thumbnailUrl = null;
  const thumbDir = path.join(bundleDir, 'thumbnail');
  const thumbPath = path.join(thumbDir, 'thumbnail.jpg');
  const rawBg = path.join(thumbDir, 'raw_background.jpg');

  if (updateThumbnail) {
    try {
      if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

      if (!fs.existsSync(rawBg)) {
        if (fs.existsSync(thumbPath)) {
          fs.copyFileSync(thumbPath, rawBg);
        } else {
          const photosDir = path.join(bundleDir, 'photos');
          if (fs.existsSync(photosDir)) {
            const photoList = fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
            if (photoList.length > 0) {
              const firstPic = path.join(photosDir, photoList[0]);
              try {
                execSync(`ffmpeg -y -i "${firstPic}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[v]" -map "[v]" -q:v 2 "${rawBg}"`, { timeout: 10000 });
              } catch {
                fs.copyFileSync(firstPic, rawBg);
              }
            }
          }
        }
      }

      if (fs.existsSync(rawBg)) {
        fs.copyFileSync(rawBg, thumbPath);
        const existingStyle = fs.existsSync(path.join(thumbDir, 'style.json'))
          ? JSON.parse(fs.readFileSync(path.join(thumbDir, 'style.json'), 'utf-8'))
          : (manifest.headlineConfig || {});
        const mergedStyle = { ...existingStyle, ...titleOptions, text: cleanTitle };

        fs.writeFileSync(path.join(thumbDir, 'style.json'), JSON.stringify(mergedStyle, null, 2), 'utf-8');

        overlayRussianHeadlineOnThumbnail(thumbPath, cleanTitle, mergedStyle);
        thumbUpdated = true;
        manifest.thumbnail = 'thumbnail/thumbnail.jpg';
        manifest.thumbnail_updated_at = new Date().toISOString();
        manifest.headlineConfig = mergedStyle;
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
        thumbnailUrl = `/news-static/${path.basename(bundleDir)}/thumbnail/thumbnail.jpg?t=${Date.now()}`;
      }
    } catch (err) {
      console.warn('Thumbnail overlay update on title save failed:', err.message);
    }
  }

  return {
    success: true,
    newTitle: cleanTitle,
    thumbnailUpdated: thumbUpdated,
    thumbnailUrl,
  };
}
