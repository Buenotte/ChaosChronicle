import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { overlayRussianHeadlineOnThumbnail } from './thumbnailOverlayService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

export async function generateTitleVariants(title = '', summary = '', bundleDir = null, folderName = null) {
  let effectiveTitle = title;

  let targetFolder = bundleDir;
  if (!targetFolder && folderName) {
    targetFolder = path.join(newsDir, folderName);
  }
  if (targetFolder && fs.existsSync(targetFolder)) {
    const jsonPath = path.join(targetFolder, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (manifest.original_title) effectiveTitle = manifest.original_title;
        else if (manifest.title && manifest.title.length > effectiveTitle.length) effectiveTitle = manifest.title;
      } catch {}
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    return {
      resolvedTitle: effectiveTitle,
      variants: [
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
  return {
    resolvedTitle: effectiveTitle,
    variants: uniqueVariants.length > 0 ? uniqueVariants : [effectiveTitle],
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

  // 3. Update thumbnail.jpg
  const thumbnailDir = path.join(targetFolder, 'thumbnail');
  const destSub = path.join(thumbnailDir, 'thumbnail.jpg');
  const destRoot = path.join(targetFolder, 'thumbnail.jpg');
  const rawBackgroundPath = path.join(thumbnailDir, 'raw_background.jpg');

  if (updateThumbnail) {
    if (fs.existsSync(rawBackgroundPath)) {
      fs.copyFileSync(rawBackgroundPath, destSub);
      overlayRussianHeadlineOnThumbnail(destSub, cleanTitle, { position: 'center', fontColor: 'yellow' });
      fs.copyFileSync(destSub, destRoot);
    } else if (fs.existsSync(destSub)) {
      overlayRussianHeadlineOnThumbnail(destSub, cleanTitle, { position: 'center', fontColor: 'yellow' });
      fs.copyFileSync(destSub, destRoot);
    }
  }

  return {
    success: true,
    newTitle: cleanTitle,
    folderName: path.basename(targetFolder),
    thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
  };
}
