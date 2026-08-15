import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { overlayRussianHeadlineOnThumbnail } from './thumbnailOverlayService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

const TITLE_STYLES = {
  golubuzki: {
    name: '🎭 Алексей Голобуцкий (Сатира & Сарказм)',
    desc: 'Едкий сарказм, деконструкция официальной лжи, мемы («по плану», «бункерный дед», «аналоговнет», «отрицательный рост», «скрепы»).',
  },
  kasjanov: {
    name: '🪖 Юрий Касьянов (Военный реализм)',
    desc: 'Военно-технический реализм, акцент на ТТХ, дроны, логистику, цену ошибок, «без иллюзий».',
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

export async function generateTitleVariants(title = '', summary = '', bundleDir = null, folderName = null, forceRegenerate = false, style = 'golubuzki', text = '') {
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
        if (manifest.original_title) effectiveTitle = manifest.original_title;
        else if (manifest.title && manifest.title.length > effectiveTitle.length) effectiveTitle = manifest.title;
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

  const selectedStyleConfig = TITLE_STYLES[style] || TITLE_STYLES.golubuzki;
  const systemPrompt = `Ты — мастер убойных, вирусных и кликабельных заголовков для YouTube в авторском стиле: ${selectedStyleConfig.name}.
ОСОБЕННОСТИ СТИЛЯ: ${selectedStyleConfig.desc}

Твоя задача: СТРОГО НА ОСНОВЕ ПРИВЕДЕННОГО ТЕКСТА ФЕЛЬЕТОНА/МОНОЛОГА создать РОВНО 10 РАЗНЫХ убойных вариантов заголовков.
СТРОГИЕ ТРЕБОВАНИЯ:
1. ДЛИНА КАЖДОГО ЗАГОЛОВКА: СТРОГО 4-5 СЛОВ (не больше и не меньше).
2. СТИЛЬ: В точности соответствуй стилю ${selectedStyleConfig.name}.
3. БЕЗ кавычек, БЕЗ нумерации, БЕЗ точек на конце.
4. Выведи ТОЛЬКО 10 строк, по одному заголовку на строку (капсом UPPERCASE). Никаких вводных слов или пояснений.`;

  const contextText = (scriptContent || summary || effectiveTitle).trim();
  const userPrompt = `ПОЛНЫЙ ТЕКСТ ФЕЛЬЕТОНА/МОНОЛОГА:\n"""\n${contextText.slice(0, 1500)}\n"""\n\nСоздай 10 убойных заголовков из 4-5 слов строго на основе содержания этого текста:`;

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

export function updatePackageTitle(bundleDir, newTitle, updateThumbnail = true) {
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
  fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

  let thumbUpdated = false;
  let thumbnailUrl = null;
  const thumbDir = path.join(bundleDir, 'thumbnail');
  const thumbPath = path.join(thumbDir, 'thumbnail.jpg');

  if (updateThumbnail && fs.existsSync(thumbPath)) {
    try {
      const styleConfig = fs.existsSync(path.join(thumbDir, 'style.json'))
        ? JSON.parse(fs.readFileSync(path.join(thumbDir, 'style.json'), 'utf-8'))
        : (manifest.headlineConfig || {});

      overlayRussianHeadlineOnThumbnail({
        bundleDir,
        headlineText: cleanTitle,
        ...styleConfig,
      });
      thumbUpdated = true;
      thumbnailUrl = `/news-static/${path.basename(bundleDir)}/thumbnail/thumbnail.jpg?t=${Date.now()}`;
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
