import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');
const scriptsDir = path.resolve(__dirname, '../../scripts');

const STYLES = {
  scipop: { label: '🌟 Научпоп & Факты', focus: 'Научные открытия, законы природы, биология, мозг, космос, парадоксы, «Почему...», «Как устроен...». Без политики и сатиры.' },
  mystery: { label: '🕵️ Тайны Истории & Загадки', focus: 'Исторические тайны, забытые цивилизации, нестыковки в хрониках, саспенс, архивные открытия. Без сатиры.' },
  tech_future: { label: '🚀 Технологии Будущего & Инженерия', focus: 'Прорывной ИИ, квантовые технологии, космос, роботы, мегапроекты, инженерные революции.' },
  psychology: { label: '🧠 Человек & Психика', focus: 'Тайны сознания, когнитивные ловушки, гормоны, сон, психология поведения, скрытые мотивы. Без гостей и интервью.' },
  storytelling: { label: '🔥 Вирусный Сторителлинг', focus: 'Остросюжетная интрига, кульминация, цена ошибки, драматический выбор, максимальный интерес (CTR 20%+).' },
  golubuzki: { file: 'golubuzki_style.txt', label: '🎭 Алексей Голобуцкий', focus: 'Едкая политическая сатира, смех как оружие, деконструкция официальной лжи врага, высмеивание паники в бункере.' },
  clickbait: { file: 'clickbait_style.txt', label: '🔥 Кликбейт & YouTube Топ (CTR 20%+)', focus: 'Ультра-вирусный темп, мощный шок-фактор, парадоксальные контрасты, хлесткие панчлайны и мемы.' },
  kasjanov: { file: 'kasjanov_style.txt', label: '🪖 Юрий Касьянов', focus: 'Военно-инженерный реализм, акцент на ТТХ, дронах, логистике, точный расчет и уязвимости врага.' },
  klimovski: { file: 'klimovski_style.txt', label: '🔬 Юрий Климовский', focus: 'Клинический геополитический реализм, анатомия решений Кремля, клановые интересы элит.' },
  gibrid: { file: 'gibrid_style.txt', label: '⚡ Гибридный стиль (3 в 1)', focus: 'Синтез сатиры Голобуцкого, военного реализма Касьянова и геополитической анатомии Климовского.' },
};

export function stripBloggerNames(text = '') {
  if (!text) return '';
  const bloggerRegex = /#?(?:голобуцк[а-яёa-z]*|касьянов[а-яёa-z]*|климовск[а-яёa-z]*|golubuzk[a-z]*|golobutsk[a-z]*|kasyanov[a-z]*|kasjanov[a-z]*|klimovsk[a-z]*|варламов[а-яёa-z]*|невзоров[а-яёa-z]*|шульман[а-яёa-z]*|кац[а-яёa-z]*)\b/gi;
  const satireRegex = /#?(?:сатир[а-яёa-z]*|satir[a-z]*)\b/gi;
  const forbiddenMetaRegex = /\b(?:глубокая аналитика без гротеска|глубокой аналитики без гротеска|без гротеска|глубокая аналитика|глубокий разбор|разбор полетов|наш разбор)\b/gi;
  const forbiddenIntroRegex = /^(?:сегодня\s+)?(?:в\s+этом\s+(?:видео|выпуске|ролике)\s+)?(?:мы\s+)?(?:разбираем|анализируем)\b[^.!?\n]*[:.!?]?\s*/gim;
  const forbiddenWeRegex = /\bмы\s+(?:разбираем|анализируем|посмотрим|раскроем|видим|покажем|наблюдаем)\b/gi;

  return text
    .replace(bloggerRegex, '')
    .replace(satireRegex, '')
    .replace(forbiddenIntroRegex, '')
    .replace(forbiddenMetaRegex, '')
    .replace(forbiddenWeRegex, '')
    .replace(/📺\s*Разбор смотрите/gi, '📺 Смотрите подробности')
    .replace(/\bРазбор смотрите/gi, 'Смотрите подробности')
    .replace(/\bРазбираем\b[:\s-]*/gi, '')
    .replace(/\bАнализируем\b[:\s-]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/^,\s*|,\s*$/g, '')
    .trim();
}

export function cleanExtractedTitle(raw = '', fallback = '') {
  let t = (raw || '').trim().replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  t = t.replace(/^\{?\s*"?(?:title|youtube_title|заголовок)"?\s*:\s*"?/i, '');
  t = t.replace(/,\s*"?(?:youtube_description|description|tags|facebookPost)[\s\S]*$/i, '');
  t = t.replace(/["'{}]+/g, '').trim().replace(/^(?:title|заголовок)[:\s-]+/i, '').trim();
  t = stripBloggerNames(t);
  if (!t || t.length < 5) t = fallback;
  if (!t.toLowerCase().includes('chaos chronicle') && !t.toLowerCase().includes('chaoschronicle')) {
    t = `${t} | Chaos Chronicle`;
  }
  return t.replace(/(?:\s*\|\s*Chaos\s*Chronicle\s*)+/gi, ' | Chaos Chronicle').slice(0, 95);
}

const MODEL_MAP = {
  gemini:   'google/gemini-2.5-flash',
  deepseek: 'deepseek/deepseek-chat',
};

export async function generateYouTubeMetadata({
  title = '', text = '', folderName, bundleDir: inputBundleDir,
  force = false, style = 'clickbait', tone = 'grotesque',
  model = 'gemini', section = 'all', keywords = '',
}) {
  let bundleDir = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
  const jsonPath = bundleDir ? path.join(bundleDir, 'project.json') : null;
  const separateJsonPath = bundleDir ? path.join(bundleDir, 'youtube_metadata.json') : null;
  let manifest = {};
  if (jsonPath && fs.existsSync(jsonPath)) {
    try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
  }
  let separateMeta = null;
  if (separateJsonPath && fs.existsSync(separateJsonPath)) {
    try { separateMeta = JSON.parse(fs.readFileSync(separateJsonPath, 'utf-8')); } catch {}
  }

  if (!force && section === 'all') {
    let cached = manifest.youtubeMetadata && manifest.youtubeMetadata[style];
    if (!cached && manifest.youtubeMetadata && manifest.youtubeMetadata.style === style && (manifest.youtubeMetadata.title || manifest.youtubeMetadata.description)) {
      cached = manifest.youtubeMetadata;
    }
    if (!cached && separateMeta && separateMeta.style === style && (separateMeta.title || separateMeta.description || separateMeta.facebookPost)) {
      cached = separateMeta;
    }
    if (cached && (cached.title || cached.description || cached.facebookPost)) {
      return {
        success: true, title: cached.title || '', description: cached.description || '',
        tags: cached.tags || '', hashtags: cached.hashtags || '', facebookPost: cached.facebookPost || '',
        style: cached.style || style, tone: cached.tone || tone, fromCache: true,
      };
    }
    return { success: true, notGenerated: true, title: '', description: '', tags: '', hashtags: '', facebookPost: '', style };
  }

  const effectiveTitle = manifest.title || title || 'Мировые новости';
  const effectiveText = text || (bundleDir && fs.existsSync(path.join(bundleDir, 'script.txt')) 
    ? fs.readFileSync(path.join(bundleDir, 'script.txt'), 'utf-8') 
    : manifest.original_title || title);

  const effectiveStyle = (style === 'analytics') ? 'gibrid' : style;
  const styleCfg = STYLES[effectiveStyle] || STYLES.golubuzki;
  const fallbackTitle = `🔥 ${effectiveTitle.toUpperCase().slice(0, 65)} | ChaosChronicle`;
  const fallbackDesc = `${effectiveTitle}.\n\n⚡ Главные факты и скрытые мотивы\n⚡ Последствия для фронта и мировой геополитики\n⚡ Реальный расклад сил\n\n🔔 Подписывайтесь на канал ChaosChronicle, жмите на колокольчик 🔔 и пишите комментарии!\n\n#ChaosChronicle #новости #политика #аналитика #геополитика`;
  const fallbackTags = `ChaosChronicle, новости, мировые новости, политика, аналитика, геополитика, факты, события, ${effectiveTitle.slice(0, 30)}`;
  const fallbackHashtags = `#ChaosChronicle #новости #политика #аналитика #геополитика`;
  const fallbackFb = `🔥 ${effectiveTitle.toUpperCase()}\n\nГлавные события дня, скрытые мотивы и реальные последствия без цензуры и пропаганды.\n\n📺 Смотрите подробности на канале Chaos Chronicle:\n👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔\n\n🔔 Подпишитесь, чтобы не пропустить новые сводки! 🔔\n\n#ChaosChronicle #Chaos_Chronicle #новости #политика #аналитика`;

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
  const isAnalytics = (style === 'analytics' || tone === 'analytics');
  const isYtTopic = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(effectiveStyle);

  const ruleInstruction = isYtTopic
    ? 'Захватывающий, понятный и живой научно-популярный стиль для широкой аудитории. Раскрывай суть явлений, законов и парадоксов.'
    : isAnalytics
    ? 'Умный, интригующий журналистский стиль (причины, военные ТТХ, геополитические ставки и выводы).'
    : 'Используй парадоксы, яркие контрасты и живые метафоры. БЕЗ слова «сатира», БЕЗ имен блогеров в тегах/хэштегах.';

  const strictNegativeRule = `
СТРОЖАЙШИЕ ЗАПРЕТЫ (КАТЕГОРИЧЕСКИ НЕЛЬЗЯ ПИСАТЬ):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать от первого лица («мы», «я», «мы разбираем», «наш анализ», «мы видим», «сегодня мы»).
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать слова и штампы: «Разбираем», «Анализируем», «Разбор», «Глубокая аналитика», «Без гротеска».
${isYtTopic ? '- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕН формат интервью: не упоминай имена гостей, врачей или интервьюеров.' : ''}
- ПОВЕСТВОВАНИЕ СТРОГО В ТРЕТЬЕМ ЛИЦЕ: говори прямо о фактах, событиях, решениях, ТТХ и последствиях!`;

  let systemPrompt = `Ты — ведущий YouTube-продюсер канала Chaos Chronicle.
На основе материала создай метаданные для YouTube и Facebook в стиле: ${styleCfg.label}
ФОКУС: ${styleCfg.focus}
${isYtTopic ? '' : 'ПОЗИЦИЯ: СТРОГО НА СТОРОНЕ УКРАИНЫ.\n'}ПРАВИЛО: ${ruleInstruction}
${strictNegativeRule}`;

  if (section === 'title') {
    systemPrompt += isYtTopic
      ? `\nСоздай ТОЛЬКО 1 захватывающий YouTube-заголовок (до 75 символов) с интригой/научным парадоксом и эмодзи | Chaos Chronicle. БЕЗ сатиры и политики.\nОтветь СТРОГО JSON: { "title": "..." }`
      : isAnalytics
      ? `\nСоздай ТОЛЬКО 1 ёмкий, интригующий аналитический YouTube-заголовок (до 75 символов) с сутью интриги и эмодзи | Chaos Chronicle. БЕЗ гротескного цирка.\nОтветь СТРОГО JSON: { "title": "..." }`
      : `\nСоздай ТОЛЬКО 1 убойный, супер-кликабельный YouTube-заголовок (до 75 символов) с интригой/парадоксом и эмодзи | Chaos Chronicle.\nОтветь СТРОГО JSON: { "title": "..." }`;
  } else if (section === 'description') {
    systemPrompt += isYtTopic
      ? `\nСоздай ТОЛЬКО описание для YouTube БЕЗ приветствий (суть темы в 1-2 ёмких абзацах, 3 ключевых факта ⚡ по теме, призыв 🔔, тематические хэштеги), а также keywords теги и хэштеги. БЕЗ сатиры и политики.\nОтветь СТРОГО JSON: { "description": "...", "tags": "...", "hashtags": "..." }`
      : isAnalytics
      ? `\nСоздай ТОЛЬКО описание для YouTube БЕЗ приветствий (суть события в 1-2 ёмких абзацах, 3 ключевых тезиса ⚡ с фактами и последствиями, призыв 🔔, хэштеги), а также keywords теги и хэштеги.\nОтветь СТРОГО JSON: { "description": "...", "tags": "...", "hashtags": "..." }`
      : `\nСоздай ТОЛЬКО описание для YouTube БЕЗ приветствий (суть с визуальным гротеском, 3 тезиса ⚡ с метафорами из текста, призыв 🔔, хэштеги), а также keywords теги и хэштеги.\nОтветь СТРОГО JSON: { "description": "...", "tags": "...", "hashtags": "..." }`;
  } else if (section === 'facebookPost') {
    systemPrompt += isYtTopic
      ? `\nСоздай ТОЛЬКО готовый пост для Facebook (40-70 слов, БЕЗ приветствий, раскрывающий научный факт/интригу темы, ссылка 👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔, фраза «Подпишитесь, чтобы не пропустить новые сводки! 🔔», тематические хэштеги). БЕЗ сатиры.\nОтветь СТРОГО JSON: { "facebookPost": "..." }`
      : isAnalytics
      ? `\nСоздай ТОЛЬКО готовый пост для Facebook (40-70 слов, БЕЗ приветствий, раскрывающий суть и последствия события, ссылка 👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔, фраза «Подпишитесь, чтобы не пропустить новые сводки! 🔔», хэштеги).\nОтветь СТРОГО JSON: { "facebookPost": "..." }`
      : `\nСоздай ТОЛЬКО готовый вирусный пост для Facebook (40-70 слов, БЕЗ приветствий, с сочным сатирическим гротеском и парадоксом из текста, ссылка 👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔, фраза «Подпишитесь, чтобы не пропустить новые сводки! 🔔», хэштеги).\nОтветь СТРОГО JSON: { "facebookPost": "..." }`;
  } else {
    systemPrompt += isYtTopic
      ? `\nОтветь СТРОГО JSON:\n{\n  "title": "Захватывающий YouTube-заголовок (до 75 символов) с парадоксом/интригой и эмодзи | Chaos Chronicle",\n  "description": "Описание темы для YouTube БЕЗ приветствий: 1-2 ёмких абзаца, 3 пункта ⚡ с фактами/парадоксами, призыв 🔔, тематические хэштеги.",\n  "tags": "Теги через запятую для YouTube Studio по теме выпуска",\n  "hashtags": "#ChaosChronicle #научпоп #факты #наука #история #технологии",\n  "facebookPost": "Пост для Facebook: увлекательный факт или интрига темы без цензуры и политики"\n}`
      : isAnalytics
      ? `\nОтветь СТРОГО JSON:\n{\n  "title": "Интригующий аналитический заголовок (до 75 символов) с эмодзи | Chaos Chronicle",\n  "description": "Описание YouTube БЕЗ приветствий: суть темы (факты, скрытые мотивы, расстановка сил), 3 пункта ⚡ с фактами/последствиями, призыв 🔔, хэштеги.",\n  "tags": "Теги через запятую для YouTube Studio (без слова сатира и имен)",\n  "hashtags": "#ChaosChronicle #новости #аналитика #политика #геополитика",\n  "facebookPost": "Короткий пост для Facebook: суть и скрытые мотивы события без цензуры"\n}`
      : `\nОтветь СТРОГО JSON:\n{\n  "title": "Хлёсткий кликабельный YouTube-заголовок (до 75 символов) с парадоксом и эмодзи | Chaos Chronicle",\n  "description": "Описание YouTube БЕЗ приветствий: суть темы с ярким гротеском, 3 пункта ⚡ с метафорами из текста, призыв 🔔, хэштеги.",\n  "tags": "Теги через запятую для YouTube Studio (без слова сатира и имен)",\n  "hashtags": "#ChaosChronicle #новости #аналитика #политика #геополитика",\n  "facebookPost": "Короткий вирусный пост для Facebook с ярким сатирическим парадоксом и гротеском"\n}`;
  }

  const kwInstruction = keywords && keywords.trim()
    ? `\nОБЯЗАТЕЛЬНЫЕ КЛЮЧЕВЫЕ СЛОВА / АКЦЕНТЫ: Обязательно включи или обыграй в заголовке/описании следующие слова: "${keywords.trim()}".`
    : '';
  const userPrompt = `НОВОСТЬ: ${effectiveTitle}\nТЕКСТ:\n${effectiveText.slice(0, 1200)}${kwInstruction}`;

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

export function saveYouTubeMetadataJson({ bundleDir: inputBundleDir, folderName, title, description, tags, hashtags, facebookPost, style = 'golubuzki', tone = 'grotesque' }) {
  let bundleDir = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
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
    tone,
  };

  const jsonPath = path.join(bundleDir, 'project.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (!manifest.youtubeMetadata || typeof manifest.youtubeMetadata !== 'object') manifest.youtubeMetadata = {};
      manifest.youtubeMetadata[style] = metadata;
      Object.assign(manifest.youtubeMetadata, {
        title: metadata.title, description: metadata.description, tags: metadata.tags,
        hashtags: metadata.hashtags, facebookPost: metadata.facebookPost, style: metadata.style,
        tone: metadata.tone, savedAt: metadata.savedAt,
      });
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {}
  }

  const separateJsonPath = path.join(bundleDir, 'youtube_metadata.json');
  fs.writeFileSync(separateJsonPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return { success: true, metadata, folderName: path.basename(bundleDir) };
}
