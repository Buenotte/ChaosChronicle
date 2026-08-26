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

  const fallback = `🔥 ${effectiveTitle.toUpperCase()}\n\nРазбираем главное событие дня без цензуры и пропаганды.\n\n📺 Разбор смотрите на канале Chaos Chronicle:\n👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔\n\n🔔 Подпишитесь, чтобы не пропустить новые сводки! 🔔\n\n#ChaosChronicle #Chaos_Chronicle #новости #политика #аналитика`;

  const formatPostWithMandatoryElements = (rawText) => {
    let p = (rawText || '').trim();
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
        p += `\n\n🔔 ${mandatoryCta}\n\n#ChaosChronicle #новости #политика #аналитика`;
      }
    }
    return p;
  };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    return { success: true, post: fallback, style };
  }

  const systemPrompt = `Ты — автор постов для Facebook канала Chaos Chronicle.
Напиши КРАТКИЙ, ёмкий пост (всего 40-70 слов), где изложена только самая суть новости без лишней воды.

СТИЛЕВОЙ ТОН:
${styleConfig.tone}

СТРОГИЕ ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ К ПОСТУ:
1. Краткость: 1-2 коротких предложения с сутью новости.
2. Указание канала: канал Chaos Chronicle
3. Ссылка на видео: 👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔
4. ОБЯЗАТЕЛЬНАЯ ФРАЗА В КОНЦЕ (ТОЧНО В ТАКОМ ВИДЕ):
Подпишитесь, чтобы не пропустить новые сводки! 🔔
5. Хэштеги: #ChaosChronicle #новости #политика #аналитика ... (КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать слово «сатира» и имена блогеров, авторов или стилей в хэштегах!)
6. Выдавай ТОЛЬКО готовый текст поста.`;

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
