import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');
const scriptsDir = path.resolve(__dirname, '../../scripts');

export async function generateYouTubeMetadata({ title = '', text = '', folderName, bundleDir: inputBundleDir, force = false, model = 'google/gemini-2.5-flash' }) {
  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) {
    bundleDir = path.join(newsDir, folderName);
  }

  const jsonPath = bundleDir ? path.join(bundleDir, 'project.json') : null;
  let manifest = {};
  if (jsonPath && fs.existsSync(jsonPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (!force && manifest.youtubeMetadata && manifest.youtubeMetadata.title && manifest.youtubeMetadata.facebookPost) {
        return { success: true, ...manifest.youtubeMetadata, fromCache: true };
      }
    } catch {}
  }

  const effectiveTitle = manifest.title || title || 'Мировые новости';
  const effectiveText = text || (bundleDir && fs.existsSync(path.join(bundleDir, 'script.txt')) 
    ? fs.readFileSync(path.join(bundleDir, 'script.txt'), 'utf-8') 
    : manifest.original_title || title);

  // Lade Golubuzki-Style Guide falls vorhanden
  let styleGuide = '';
  const stylePath = path.join(scriptsDir, 'golubuzki_style.txt');
  if (fs.existsSync(stylePath)) {
    try { styleGuide = fs.readFileSync(stylePath, 'utf-8').slice(0, 1500); } catch {}
  }

  const fallbackTitle = `🔥 ${effectiveTitle.toUpperCase().slice(0, 65)} | ChaosChronicle`;
  const fallbackDesc = `🌍 ChaosChronicle | Без цензуры и пропаганды.\n\nРазбираем главное событие: ${effectiveTitle}.\n\n⚡ Факты, которые замалчивают\n⚡ Реальный анализ последствий для мировой геополитики\n⚡ Сатирический вердикт от ChaosChronicle\n\n🔔 Подписывайтесь на канал ChaosChronicle, жмите на колокольчик 🔔 и пишите комментарии!\n\n#ChaosChronicle #новости #политика #сатира #аналитика`;
  const fallbackTags = `ChaosChronicle, новости, мировые новости, политика, аналитика, сатира, геополитика, факты, разбор, ${effectiveTitle.slice(0, 30)}`;
  const fallbackHashtags = `#ChaosChronicle #новости #политика #сатира #аналитика`;
  const fallbackFb = `Друзья, привет! 🔥\n\nОчередной день — очередной «жест доброй воли» и провал кремлевских стратегов. Препарируем главную тему дня: ${effectiveTitle} без телевизионной шелухи.\n\nПолный сатирический разбор смотрите в новом выпуске ChaosChronicle:\n👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔\n\nПодписывайтесь на канал, ставьте лайки и пишите мысли в комментариях! 👇\n\n#ChaosChronicle #новости #сатира #политика`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    const fallbackMetadata = {
      title: fallbackTitle,
      description: fallbackDesc,
      tags: fallbackTags,
      hashtags: fallbackHashtags,
      facebookPost: fallbackFb,
      generatedAt: new Date().toISOString(),
    };
    if (jsonPath && fs.existsSync(jsonPath)) {
      manifest.youtubeMetadata = fallbackMetadata;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }
    return { success: true, ...fallbackMetadata };
  }

  const systemPrompt = `Ты — ведущий медиа-продюсер, SMM-маркетолог и сатирик канала ChaosChronicle (в стиле Алексея Голобуцкого: едкий сарказм, смех как оружие против пропаганды, деконструкция мифов).
На основе новости и сценария создай комплект метаданных для YouTube и готовый вирусный пост для Facebook.

ТРЕБОВАНИЯ К FACEBOOK-ПОСТУ:
1. Обязательное яркое приветствие с эмодзи в начале (например: «Друзья, привет! 🔥» или «Привет всем, кто смотрит на мир без розовых очков! 🌍👋»).
2. Краткий, живой, сатирический текст (80-130 слов) с сочными эмодзи (⚡ 💣 🎯 👀 🔔 👇).
3. Призыв к просмотру с ссылкой: 👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔
4. Призыв подписаться на ChaosChronicle, ставить лайки и комментировать.
5. 4-6 хэштегов внизу.

Ответь СТРОГО в формате JSON без каких-либо тегов \`\`\`json:
{
  "title": "Хлёсткий кликабельный YouTube-заголовок (до 75 символов) с эмодзи | ChaosChronicle",
  "description": "Полное описание для YouTube: интро, 3 пункта ⚡, призыв к подписке 🔔, хэштеги.",
  "tags": "Теги через запятую для YouTube Studio (до 400 символов)",
  "hashtags": "#ChaosChronicle #новости #сатира #аналитика #политика",
  "facebookPost": "Короткий готовый пост для Facebook с приветствием, эмодзи, ссылкой и хэштегами"
}`;

  const userPrompt = `НОВОСТЬ: ${effectiveTitle}\nТЕКСТ:\n${effectiveText.slice(0, 1200)}`;

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
        max_tokens: 850,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(12000),
    });

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    let parsed = null;
    try {
      const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (!parsed || !parsed.title) throw new Error('Некорректный ответ модели');

    const metadata = {
      title: parsed.title,
      description: parsed.description,
      tags: parsed.tags,
      hashtags: parsed.hashtags,
      facebookPost: parsed.facebookPost || fallbackFb,
      generatedAt: new Date().toISOString(),
    };

    if (jsonPath && fs.existsSync(jsonPath)) {
      manifest.youtubeMetadata = metadata;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }

    return { success: true, ...metadata };
  } catch (err) {
    const fallbackMetadata = {
      title: fallbackTitle,
      description: fallbackDesc,
      tags: fallbackTags,
      hashtags: fallbackHashtags,
      facebookPost: fallbackFb,
      generatedAt: new Date().toISOString(),
    };

    if (jsonPath && fs.existsSync(jsonPath)) {
      manifest.youtubeMetadata = fallbackMetadata;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }

    return { success: true, ...fallbackMetadata };
  }
}
