import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { overlayRussianHeadlineOnThumbnail } from './thumbnailOverlayService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

export async function generateTitleVariants(title = '', summary = '', bundleDir = null, folderName = null, forceRegenerate = false) {
  let effectiveTitle = title;
  let existingVariants = [];

  let targetFolder = bundleDir;
  if (!targetFolder && folderName) {
    targetFolder = path.join(newsDir, folderName);
  }
  let jsonPath = null;
  if (targetFolder && fs.existsSync(targetFolder)) {
    jsonPath = path.join(targetFolder, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (manifest.original_title) effectiveTitle = manifest.original_title;
        else if (manifest.title && manifest.title.length > effectiveTitle.length) effectiveTitle = manifest.title;
        if (Array.isArray(manifest.title_variants) && manifest.title_variants.length > 0) {
          existingVariants = manifest.title_variants;
        }
      } catch {}
    }
  }

  // Wenn forceRegenerate = false und bereits Varianten existieren, nimm die gespeicherten Varianten ohne KI-Aufruf
  if (!forceRegenerate && existingVariants.length > 0) {
    return {
      resolvedTitle: effectiveTitle,
      variants: existingVariants,
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
      ]
    };
  }

  const systemPrompt = `Ты — мастер убойных, вирусных и сатирических заголовков для YouTube в авторском стиле «Алексей Голобуцкий» (деконструкция российской пропаганды, едкая ирония, короткие хлесткие фразы, смех как оружие).
Твоя задача: на основе новости создать РОВНО 10 РАЗНЫХ убойных вариантов заголовков.
СТРОГИЕ ТРЕБОВАНИЯ:
1. ДЛИНА КАЖДОГО ЗАГОЛОВКА: СТРОГО 4-5 СЛОВ (не больше и не меньше).
2. СТИЛЬ: Едкий сарказм, трибун, высмеивание официальной версии врага, слова-маркеры («по плану», «бункерный дед», «аналоговнет», «отрицательный рост», «скрепы», «высокоточный террор», «хлопок и задымление»).
3. БЕЗ кавычек, БЕЗ нумерации, БЕЗ точек на конце.
4. Выведи ТОЛЬКО 10 строк, по одному заголовку на строку (капсом UPPERCASE). Никаких вводных слов или пояснений.`;

  const userPrompt = `Новость: ${effectiveTitle}\nКонтекст: ${summary?.slice(0, 400) || ''}`;

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

  if (!aiRes.ok) {
    throw new Error(`AI API error: ${aiRes.status}`);
  }

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
      manifest.title_variants_updated_at = new Date().toISOString();
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {}
  }

  return {
    resolvedTitle: effectiveTitle,
    variants: finalVariants,
  };
}

export function updatePackageTitle(targetFolder, newTitle, updateThumbnail = true) {
  if (!targetFolder || !fs.existsSync(targetFolder)) {
    throw new Error('Папка пакета не найдена');
  }

  const cleanTitle = newTitle.trim();

  // 1. Update project.json
  const jsonPath = path.join(targetFolder, 'project.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (!manifest.original_title) manifest.original_title = manifest.title;
      manifest.title = cleanTitle;
      manifest.title_updated_at = new Date().toISOString();
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {}
  }

  // 2. Update script.md
  const mdPath = path.join(targetFolder, 'script.md');
  if (fs.existsSync(mdPath)) {
    try {
      const mdContent = fs.readFileSync(mdPath, 'utf-8');
      const lines = mdContent.split('\n');
      lines[0] = `# 🎭 ${cleanTitle}`;
      fs.writeFileSync(mdPath, lines.join('\n'), 'utf-8');
    } catch {}
  }

  // 3. Update thumbnail and style.json
  const thumbnailDir = path.join(targetFolder, 'thumbnail');
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  const styleJsonPath = path.join(thumbnailDir, 'style.json');
  let currentStyle = {};
  if (fs.existsSync(styleJsonPath)) {
    try {
      currentStyle = JSON.parse(fs.readFileSync(styleJsonPath, 'utf-8'));
    } catch {}
  }

  const updatedStyle = {
    text: cleanTitle,
    font: currentStyle.font || 'impact',
    fontFamilyName: currentStyle.fontFamilyName || 'Impact, sans-serif',
    fontSize: currentStyle.fontSize || 'auto',
    customSizeNum: currentStyle.customSizeNum || 82,
    fontColor: currentStyle.fontColor || 'yellow',
    borderColor: currentStyle.borderColor || 'black',
    borderWidth: currentStyle.borderWidth !== undefined ? Number(currentStyle.borderWidth) : 9,
    shadowDistance: currentStyle.shadowDistance !== undefined ? Number(currentStyle.shadowDistance) : 4,
    isItalic: !!currentStyle.isItalic,
    tiltAngle: Number(currentStyle.tiltAngle) || 0,
    position: currentStyle.position || 'center',
    hasBox: !!currentStyle.hasBox,
    photoUrl: currentStyle.photoUrl || null,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(styleJsonPath, JSON.stringify(updatedStyle, null, 2), 'utf-8');

  // Update manifest headlineConfig
  if (fs.existsSync(jsonPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      manifest.headlineConfig = updatedStyle;
      manifest.thumbnail_updated_at = updatedStyle.updatedAt;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {}
  }

  const destSub = path.join(thumbnailDir, 'thumbnail.jpg');
  const rawBackgroundPath = path.join(thumbnailDir, 'raw_background.jpg');

  if (updateThumbnail) {
    if (fs.existsSync(rawBackgroundPath)) {
      fs.copyFileSync(rawBackgroundPath, destSub);
      overlayRussianHeadlineOnThumbnail(destSub, cleanTitle, updatedStyle);
    } else if (fs.existsSync(destSub)) {
      fs.copyFileSync(destSub, rawBackgroundPath);
      overlayRussianHeadlineOnThumbnail(destSub, cleanTitle, updatedStyle);
    }
  }

  return {
    success: true,
    newTitle: cleanTitle,
    folderName: path.basename(targetFolder),
    style: updatedStyle,
    thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
  };
}
