import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');
const scriptsDir = path.resolve(__dirname, '../../scripts');

const STYLES = {
  golubuzki: { file: 'golubuzki_style.txt', label: '🎭 Алексей Голобуцкий', focus: 'Едкая политическая сатира, смех как оружие, деконструкция официальной лжи врага, высмеивание паники в бункере.' },
  kasjanov: { file: 'kasjanov_style.txt', label: '🪖 Юрий Касьянов', focus: 'Военно-инженерный реализм, акцент на ТТХ, дронах, логистике, точный расчет и уязвимости врага.' },
  klimovski: { file: 'klimovski_style.txt', label: '🔬 Юрий Климовский', focus: 'Клинический геополитический реализм, анатомия решений Кремля, клановые интересы элит.' },
  gibrid: { file: 'gibrid_style.txt', label: '⚡ Гибридный стиль (3 в 1)', focus: 'Синтез сатиры Голобуцкого, военного реализма Касьянова и геополитической анатомии Климовского.' },
};

export function stripBloggerNames(text = '') {
  if (!text) return '';
  const bloggerRegex = /#?(?:голобуцк[а-яёa-z]*|касьянов[а-яёa-z]*|климовск[а-яёa-z]*|golubuzk[a-z]*|golobutsk[a-z]*|kasyanov[a-z]*|kasjanov[a-z]*|klimovsk[a-z]*|варламов[а-яёa-z]*|невзоров[а-яёa-z]*|шульман[а-яёa-z]*|кац[а-яёa-z]*)\b/gi;
  const satireRegex = /#?(?:сатир[а-яёa-z]*|satir[a-z]*)\b/gi;
  return text
    .replace(bloggerRegex, '')
    .replace(satireRegex, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();
}

export function cleanExtractedTitle(raw = '', fallback = '') {
  let t = (raw || '').trim();
  t = t.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  t = t.replace(/^\{?\s*"?(?:title|youtube_title|заголовок)"?\s*:\s*"?/i, '');
  t = t.replace(/,\s*"?(?:youtube_description|description|tags|facebookPost)[\s\S]*$/i, '');
  t = t.replace(/["'{}]+/g, '').trim();
  t = t.replace(/^(?:title|заголовок)[:\s-]+/i, '').trim();
  t = stripBloggerNames(t);
  if (!t || t.length < 5) t = fallback;
  if (!t.toLowerCase().includes('chaos chronicle') && !t.toLowerCase().includes('chaoschronicle')) {
    t = `${t} | Chaos Chronicle`;
  }
  t = t.replace(/(?:\s*\|\s*Chaos\s*Chronicle\s*)+/gi, ' | Chaos Chronicle');
  return t.slice(0, 95);
}

const MODEL_MAP = {
  gemini:   'google/gemini-2.5-flash',
  deepseek: 'deepseek/deepseek-chat',
};

export async function generateYouTubeMetadata({
  title = '',
  text = '',
  folderName,
  bundleDir: inputBundleDir,
  force = false,
  style = 'clickbait',
  model = 'gemini',
  section = 'all',
}) {
  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) {
    bundleDir = path.join(newsDir, folderName);
  }

  const jsonPath = bundleDir ? path.join(bundleDir, 'project.json') : null;
  let manifest = {};
  if (jsonPath && fs.existsSync(jsonPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const cached = manifest.youtubeMetadata && (manifest.youtubeMetadata[style] || (!force && manifest.youtubeMetadata.title ? manifest.youtubeMetadata : null));
      if (!force && section === 'all' && cached && cached.title && cached.facebookPost) {
        return { success: true, ...cached, style, fromCache: true };
      }
    } catch {}
  }

  if (!force && section === 'all') {
    return {
      success: true,
      notGenerated: true,
      title: '',
      description: '',
      tags: '',
      hashtags: '',
      facebookPost: '',
      style,
    };
  }

  const effectiveTitle = manifest.title || title || 'Мировые новости';
  const effectiveText = text || (bundleDir && fs.existsSync(path.join(bundleDir, 'script.txt')) 
    ? fs.readFileSync(path.join(bundleDir, 'script.txt'), 'utf-8') 
    : manifest.original_title || title);

  const styleCfg = STYLES[style] || STYLES.golubuzki;
  let styleGuide = '';
  const stylePath = path.join(scriptsDir, styleCfg.file);
  if (fs.existsSync(stylePath)) {
    try { styleGuide = fs.readFileSync(stylePath, 'utf-8').slice(0, 1500); } catch {}
  }

  const fallbackTitle = `🔥 ${effectiveTitle.toUpperCase().slice(0, 65)} | ChaosChronicle`;
  const fallbackDesc = `Разбираем главное событие: ${effectiveTitle}.\n\n⚡ Факты, которые замалчивают\n⚡ Реальный анализ последствий для мировой геополитики\n⚡ Аналитический вердикт от ChaosChronicle\n\n🔔 Подписывайтесь на канал ChaosChronicle, жмите на колокольчик 🔔 и пишите комментарии!\n\n#ChaosChronicle #новости #политика #аналитика #геополитика`;
  const fallbackTags = `ChaosChronicle, новости, мировые новости, политика, аналитика, геополитика, факты, разбор, ${effectiveTitle.slice(0, 30)}`;
  const fallbackHashtags = `#ChaosChronicle #новости #политика #аналитика #геополитика`;
  const fallbackFb = `🔥 ${effectiveTitle.toUpperCase()}\n\nРазбираем главное событие дня без цензуры и пропаганды.\n\n📺 Разбор смотрите на канале Chaos Chronicle:\n👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔\n\n🔔 Подпишитесь, чтобы не пропустить новые сводки! 🔔\n\n#ChaosChronicle #Chaos_Chronicle #новости #политика #аналитика`;

  const ensureFacebookPostCta = (raw) => {
    let p = (raw || '').trim();
    if (!p.includes('Chaos Chronicle') && !p.includes('ChaosChronicle')) p = `📺 Канал Chaos Chronicle:\n${p}`;
    if (!p.includes('[ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE]') && !p.includes('[ССЫЛКА НА ВИДЕО В YOUTUBE]')) p += '\n\n👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔';
    const cta = 'Подпишитесь, чтобы не пропустить новые сводки! 🔔';
    if (!p.includes('Подпишитесь, чтобы не пропустить новые сводки!')) {
      const h = p.indexOf('#');
      p = h > -1 ? `${p.slice(0, h).trimEnd()}\n\n🔔 ${cta}\n\n${p.slice(h).trimStart()}` : `${p}\n\n🔔 ${cta}\n\n#ChaosChronicle #новости #политика #аналитика`;
    }
    return p;
  };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    if (section === 'title') return { success: true, title: fallbackTitle };
    if (section === 'description') return { success: true, description: fallbackDesc, tags: fallbackTags, hashtags: fallbackHashtags };
    if (section === 'facebookPost') return { success: true, facebookPost: fallbackFb };
    return { success: true, title: fallbackTitle, description: fallbackDesc, tags: fallbackTags, hashtags: fallbackHashtags, facebookPost: fallbackFb, style };
  }

  const chosenModel = MODEL_MAP[model] || model || 'google/gemini-2.5-flash';

  let systemPrompt = `Ты — ведущий медиа-продюсер канала Chaos Chronicle.
На основе новости создай метаданные для YouTube и Facebook в авторском стиле: ${styleCfg.label}
ФОКУС: ${styleCfg.focus}
ПОЗИЦИЯ: СТРОГО НА СТОРОНЕ УКРАИНЫ.
СТРОГИЕ ПРАВИЛА: БЕЗ слова «сатира», БЕЗ имен блогеров в тегах/хэштегах.`;

  if (section === 'title') {
    systemPrompt += `\nСоздай ТОЛЬКО 1 убойный, супер-кликабельный YouTube-заголовок (до 75 символов) с эмодзи в конце | Chaos Chronicle.
Ответь СТРОГО JSON: { "title": "..." }`;
  } else if (section === 'description') {
    systemPrompt += `\nСоздай ТОЛЬКО описание для YouTube БЕЗ приветствий (суть, 3 тезиса ⚡, призыв 🔔, хэштеги), а также keywords теги и хэштеги.
Ответь СТРОГО JSON: { "description": "...", "tags": "...", "hashtags": "..." }`;
  } else if (section === 'facebookPost') {
    systemPrompt += `\nСоздай ТОЛЬКО готовый вирусный пост для Facebook (40-70 слов, БЕЗ приветствий, ссылка 👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔, фраза «Подпишитесь, чтобы не пропустить новые сводки! 🔔», хэштеги).
Ответь СТРОГО JSON: { "facebookPost": "..." }`;
  } else {
    systemPrompt += `\nОтветь СТРОГО JSON:
{
  "title": "Хлёсткий кликабельный YouTube-заголовок (до 75 символов) с эмодзи | Chaos Chronicle",
  "description": "Описание YouTube БЕЗ приветствий: суть темы, 3 пункта ⚡, призыв к подписке 🔔, хэштеги.",
  "tags": "Теги через запятую для YouTube Studio (без слова сатира и имен)",
  "hashtags": "#ChaosChronicle #новости #аналитика #политика #геополитика",
  "facebookPost": "Короткий готовый пост для Facebook"
}`;
  }

  const userPrompt = `НОВОСТЬ: ${effectiveTitle}\nТЕКСТ:\n${effectiveText.slice(0, 1200)}`;

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: section === 'title' ? 120 : (section === 'facebookPost' ? 300 : 850),
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(12000),
    });

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    let parsed = {};
    try {
      const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (section === 'title') {
      const titleCandidate = parsed.title || rawContent;
      const generatedTitle = cleanExtractedTitle(titleCandidate, fallbackTitle);
      return { success: true, title: generatedTitle, section: 'title', model };
    }
    if (section === 'description') {
      const generatedDesc = stripBloggerNames(parsed.description || fallbackDesc);
      const generatedTags = stripBloggerNames(parsed.tags || fallbackTags);
      const generatedHashtags = stripBloggerNames(parsed.hashtags || fallbackHashtags);
      return { success: true, description: generatedDesc, tags: generatedTags, hashtags: generatedHashtags, section: 'description', model };
    }
    if (section === 'facebookPost') {
      const generatedFb = stripBloggerNames(ensureFacebookPostCta(parsed.facebookPost || rawContent || fallbackFb));
      return { success: true, facebookPost: generatedFb, section: 'facebookPost', model };
    }

    if (!parsed || !parsed.title) throw new Error('Некорректный ответ модели');

    const metadata = {
      title: cleanExtractedTitle(parsed.title || fallbackTitle, fallbackTitle),
      description: stripBloggerNames(parsed.description || ''),
      tags: stripBloggerNames(parsed.tags || ''),
      hashtags: stripBloggerNames(parsed.hashtags || ''),
      facebookPost: stripBloggerNames(ensureFacebookPostCta(parsed.facebookPost || fallbackFb)),
      generatedAt: new Date().toISOString(),
      style,
      model,
    };

    if (jsonPath && fs.existsSync(jsonPath)) {
      if (!manifest.youtubeMetadata || typeof manifest.youtubeMetadata !== 'object') manifest.youtubeMetadata = {};
      manifest.youtubeMetadata[style] = metadata;
      manifest.youtubeMetadata.title = metadata.title;
      manifest.youtubeMetadata.description = metadata.description;
      manifest.youtubeMetadata.tags = metadata.tags;
      manifest.youtubeMetadata.hashtags = metadata.hashtags;
      manifest.youtubeMetadata.facebookPost = metadata.facebookPost;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }

    return { success: true, ...metadata };
  } catch (err) {
    if (section === 'title') return { success: true, title: fallbackTitle, section: 'title' };
    if (section === 'description') return { success: true, description: fallbackDesc, tags: fallbackTags, hashtags: fallbackHashtags, section: 'description' };
    if (section === 'facebookPost') return { success: true, facebookPost: fallbackFb, section: 'facebookPost' };

    const fallbackMetadata = {
      title: fallbackTitle,
      description: fallbackDesc,
      tags: fallbackTags,
      hashtags: fallbackHashtags,
      facebookPost: fallbackFb,
      generatedAt: new Date().toISOString(),
      style,
    };

    if (jsonPath && fs.existsSync(jsonPath)) {
      if (!manifest.youtubeMetadata || typeof manifest.youtubeMetadata !== 'object') manifest.youtubeMetadata = {};
      manifest.youtubeMetadata[style] = fallbackMetadata;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }

    return { success: true, ...fallbackMetadata };
  }
}

export function saveYouTubeMetadataJson({ bundleDir: inputBundleDir, folderName, title, description, tags, hashtags, facebookPost, style = 'golubuzki' }) {
  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) {
    bundleDir = path.join(newsDir, folderName);
  }
  if (!bundleDir || !fs.existsSync(bundleDir)) {
    return { success: false, error: 'Папка пакета не найдена' };
  }

  const metadata = {
    title: (title || '').trim(),
    description: (description || '').trim(),
    tags: (tags || '').trim(),
    hashtags: (hashtags || '').trim(),
    facebookPost: (facebookPost || '').trim(),
    savedAt: new Date().toISOString(),
    style,
  };

  const jsonPath = path.join(bundleDir, 'project.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (!manifest.youtubeMetadata || typeof manifest.youtubeMetadata !== 'object') manifest.youtubeMetadata = {};
      manifest.youtubeMetadata[style] = metadata;
      manifest.youtubeMetadata.title = metadata.title;
      manifest.youtubeMetadata.description = metadata.description;
      manifest.youtubeMetadata.tags = metadata.tags;
      manifest.youtubeMetadata.hashtags = metadata.hashtags;
      manifest.youtubeMetadata.facebookPost = metadata.facebookPost;
      manifest.youtubeMetadata.savedAt = metadata.savedAt;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {}
  }

  const separateJsonPath = path.join(bundleDir, 'youtube_metadata.json');
  fs.writeFileSync(separateJsonPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return { success: true, metadata, folderName: path.basename(bundleDir) };
}
