import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');
const scriptsDir = path.resolve(__dirname, '../../scripts');

const STYLES = {
  golubuzki: {
    file: 'golubuzki_style.txt',
    label: '🎭 Алексей Голобуцкий (Сатира & Сарказм)',
    tone: 'Едкая ирония, высмеивание официальной лжи врага, саркастическая подача и живой язык.',
  },
  kasjanov: {
    file: 'kasjanov_style.txt',
    label: '🪖 Юрий Касьянов (Военный реализм)',
    tone: 'Рубленый синтаксис, акцент на ТТХ, дронах, логистике, презрение к очковтирательству, точный расчет.',
  },
  klimovski: {
    file: 'klimovski_style.txt',
    label: '🔬 Юрий Климовский (Клиническая геополитика)',
    tone: 'Клинический диагноз, геополитические элиты, снятие имперского бренда, интеллектуальная аналитика.',
  },
};

export async function generateFacebookPost({ folderName, bundleDir: inputBundleDir, title = '', text = '', style = 'golubuzki', force = false }) {
  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) {
    bundleDir = path.join(newsDir, folderName);
  }

  const jsonPath = bundleDir ? path.join(bundleDir, 'project.json') : null;
  let manifest = {};
  if (jsonPath && fs.existsSync(jsonPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (!force && manifest.facebookPosts && manifest.facebookPosts[style]) {
        return { success: true, post: manifest.facebookPosts[style], style, fromCache: true };
      }
    } catch {}
  }

  const effectiveTitle = manifest.title || title || 'События дня';
  const effectiveText = text || (bundleDir && fs.existsSync(path.join(bundleDir, 'script.txt'))
    ? fs.readFileSync(path.join(bundleDir, 'script.txt'), 'utf-8')
    : manifest.original_title || title);

  const styleConfig = STYLES[style] || STYLES.golubuzki;
  let styleGuide = '';
  const styleFilePath = path.join(scriptsDir, styleConfig.file);
  if (fs.existsSync(styleFilePath)) {
    try { styleGuide = fs.readFileSync(styleFilePath, 'utf-8').slice(0, 1800); } catch {}
  }

  const fallback = `🔥 ${effectiveTitle.toUpperCase()}\n\nФакты, скрытые мотивы и реальные последствия события.\n\n📺 Смотрите подробности на канале Chaos Chronicle:\n👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔\n\n🔔 Подпишитесь, чтобы не пропустить новые сводки! 🔔\n\n#ChaosChronicle #Chaos_Chronicle #новости #политика #события`;

  const formatPostWithMandatoryElements = (rawText) => {
    let p = (rawText || '').trim();
    p = p
      .replace(/глубокая аналитика\s*(?:без гротеска)?/gi, '')
      .replace(/без гротеска/gi, '')
      .replace(/(?:сегодня|в этом (?:видео|выпуске))\s+мы\s+(?:разбираем|анализируем|посмотрим)[^.!?\n]*[.!?]?/gi, '')
      .replace(/\bмы\s+(?:разбираем|анализируем|посмотрим|раскроем|видим|обсудим)\b/gi, '')
      .replace(/\bРазбор смотрите\b/gi, 'Смотрите подробности')
      .replace(/\b(?:Разбираем|Анализируем):\s*/gi, '')
      .replace(/\b(?:Разбор полетов|Глубокий разбор|Наш разбор)\b/gi, '')
      .trim();
    if (!p.includes('Chaos Chronicle') && !p.includes('ChaosChronicle')) {
      p = `📺 Канал Chaos Chronicle:\n${p}`;
    }
    if (!p.includes('[ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE]') && !p.includes('[ССЫЛКА НА ВИДЕО В YOUTUBE]')) {
      p += '\n\n👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔';
    }
    const mandatoryCta = 'Подпишитесь, чтобы не пропустить новые сводки! 🔔';
    if (!p.includes('Подпишитесь, чтобы не пропустить новые сводки!')) {
      const hashIdx = p.indexOf('#');
      if (hashIdx > -1) {
        const topPart = p.slice(0, hashIdx).trimEnd();
        const hashes = p.slice(hashIdx).trimStart();
        p = `${topPart}\n\n🔔 ${mandatoryCta}\n\n${hashes}`;
      } else {
        p += `\n\n🔔 ${mandatoryCta}\n\n#ChaosChronicle #новости #политика #события`;
      }
    }
    return p;
  };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    return { success: true, post: fallback, style };
  }

  const systemPrompt = `Ты — ведущий медиа-продюсер вирусных постов для Facebook канала Chaos Chronicle.
Напиши КРАТКИЙ, ёмкий вирусный пост (40-70 слов) с сочным гротеском, парадоксом или точными фактами из новости.

СТИЛЕВОЙ ТОН:
${styleConfig.tone}

СТРОГИЕ ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ К ПОСТУ:
1. Краткость и суть: 1-2 предложения с сутью новости и яркой физической метафорой/фактом (как в сценарии).
2. ПИСАТЬ СТРОГО В ТРЕТЬЕМ ЛИЦЕ. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать от первого лица ("мы", "я", "наш", "посмотрим")!
3. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать служебные клише: "Разбираем", "Анализируем", "Разбор", "Глубокая аналитика", "Без гротеска".
4. Указание канала: канал Chaos Chronicle
5. Ссылка на видео: 👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔
6. ОБЯЗАТЕЛЬНАЯ ФРАЗА В КОНЦЕ (ТОЧНО В ТАКОМ ВИДЕ):
Подпишитесь, чтобы не пропустить новые сводки! 🔔
7. Хэштеги: #ChaosChronicle #новости #политика ... (КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать слово «сатира» и имена блогеров, авторов или стилей в хэштегах!)
8. Выдавай ТОЛЬКО готовый текст поста.`;

  const userPrompt = `ТЕМА: ${effectiveTitle}\nКОНТЕКСТ:\n${effectiveText.slice(0, 1200)}`;

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
        max_tokens: 500,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(12000),
    });

    const aiData = await aiRes.json();
    const rawGenerated = aiData.choices?.[0]?.message?.content?.trim() || '';
    if (!rawGenerated) throw new Error('Пустой ответ модели');

    const bloggerRegex = /#?(?:голобуцк[а-яёa-z]*|касьянов[а-яёa-z]*|климовск[а-яёa-z]*|golubuzk[a-z]*|golobutsk[a-z]*|kasyanov[a-z]*|kasjanov[a-z]*|klimovsk[a-z]*|варламов[а-яёa-z]*|невзоров[а-яёa-z]*|шульман[а-яёa-z]*|кац[а-яёa-z]*)\b/gi;
    const satireRegex = /#?(?:сатир[а-яёa-z]*|satir[a-z]*)\b/gi;
    const cleanedGenerated = rawGenerated
      .replace(bloggerRegex, '')
      .replace(satireRegex, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const finalPost = formatPostWithMandatoryElements(cleanedGenerated);

    if (jsonPath && fs.existsSync(jsonPath)) {
      if (!manifest.facebookPosts) manifest.facebookPosts = {};
      manifest.facebookPosts[style] = finalPost;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }

    return { success: true, post: finalPost, style };
  } catch (err) {
    return { success: true, post: fallback, style };
  }
}
