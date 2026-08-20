import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');
const scriptsDir = path.resolve(__dirname, '../../scripts');

const STYLES = {
  golubuzki: { file: 'golubuzki_style.txt', label: '🎭 Алексей Голобуцкий', focus: 'Едкий политический сарказм, смех как оружие, деконструкция официальной лжи врага, финал «Продолжаем наблюдение».' },
  kasjanov: { file: 'kasjanov_style.txt', label: '🪖 Юрий Касьянов', focus: 'Военно-технический реализм, рубленый синтаксис, акцент на ТТХ, дронах, логистике, финал «Работаем дальше. Без иллюзий.».' },
  klimovski: { file: 'klimovski_style.txt', label: '🔬 Юрий Климовский', focus: 'Клинический реализм и геополитика, мир как операционный стол, диагноз вместо мнения, финал «Диагноз поставлен, агония продолжается».' },
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

export async function generateYouTubeMetadata({ title = '', text = '', folderName, bundleDir: inputBundleDir, force = false, style = 'golubuzki', model = 'google/gemini-2.5-flash' }) {
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
      if (!force && cached && cached.title && cached.facebookPost) {
        return { success: true, ...cached, style, fromCache: true };
      }
    } catch {}
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

  const systemPrompt = `Ты — ведущий медиа-продюсер канала Chaos Chronicle.
На основе новости и сценария создай комплект метаданных для YouTube и готовый краткий пост для Facebook в следующем авторском стиле:
АВТОРСКИЙ СТИЛЬ: ${styleCfg.label}
ФОКУС: ${styleCfg.focus}
${styleGuide ? `РУКОВОДСТВО: ${styleGuide}\n` : ''}
ПОЗИЦИЯ: СТРОГО НА СТОРОНЕ УКРАИНЫ. Высмеивай кремлевскую ложь и агрессию.

СТРОГИЕ ТРЕБОВАНИЯ К ХЭШТЕГАМ И ТЕГАМ (hashtags, tags):
1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать слово «сатира» (и любые производные: #сатира, #сатирический, #политическаясатира, сатира и т.д.)!
2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать имена блогеров, авторов или названий стилей (НИКАКИХ #Голобуцкий, #Касьянов, #Климовский, #golubuzki, #kasyanov, #klimovski и т.д.)!
3. Хэштеги и теги должны относиться ИСКЛЮЧИТЕЛЬНО к теме новости, географии, событиям и каналу: #ChaosChronicle #новости #политика #аналитика #геополитика ...

СТРОГИЕ ТРЕБОВАНИЯ К ОПИСАНИЮ YOUTUBE (description):
1. КАТЕГОРИЧЕСКИ БЕЗ ПРИВЕТСТВИЙ. Сразу начинай с сути темы.
2. 3 тезиса с эмодзи ⚡, призыв подписаться на Chaos Chronicle 🔔 и тематические хэштеги (БЕЗ имён блогеров и БЕЗ слова сатира).

СТРОГИЕ ТРЕБОВАНИЯ К FACEBOOK-ПОСТУ (facebookPost):
1. БЕЗ ПРИВЕТСТВИЙ. Только краткий пересказ сути новости (1-2 коротких предложения, всего 40-70 слов).
2. Название канала: канал Chaos Chronicle
3. Ссылка на видео: 👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔
4. ОБЯЗАТЕЛЬНАЯ ФРАЗА В КОНЦЕ: Подпишитесь, чтобы не пропустить новые сводки! 🔔
5. Хэштеги: #ChaosChronicle #новости #политика #аналитика ... (БЕЗ имён блогеров и БЕЗ слова сатира).

Ответь СТРОГО в формате JSON без каких-либо тегов \`\`\`json:
{
  "title": "Хлёсткий кликабельный YouTube-заголовок (до 75 символов) с эмодзи | Chaos Chronicle",
  "description": "Описание YouTube БЕЗ приветствий: суть темы, 3 пункта ⚡, призыв к подписке 🔔, хэштеги (без имён блогеров и без слова сатира).",
  "tags": "Теги через запятую для YouTube Studio (только по теме новости, без имён блогеров и без слова сатира)",
  "hashtags": "#ChaosChronicle #новости #аналитика #политика #геополитика",
  "facebookPost": "Короткий готовый пост для Facebook (суть + канал Chaos Chronicle + ссылка + Подпишитесь, чтобы не пропустить новые сводки! 🔔 + хэштеги без сатиры и блогеров)"
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
      title: stripBloggerNames(parsed.title || ''),
      description: stripBloggerNames(parsed.description || ''),
      tags: stripBloggerNames(parsed.tags || ''),
      hashtags: stripBloggerNames(parsed.hashtags || ''),
      facebookPost: stripBloggerNames(ensureFacebookPostCta(parsed.facebookPost || fallbackFb)),
      generatedAt: new Date().toISOString(),
      style,
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
