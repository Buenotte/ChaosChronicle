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
    tone: 'Едкая ирония, высмеивание официальной версии врага, бытовые маркеры, фраза «Продолжаем наблюдение» в конце.',
  },
  kasjanov: {
    file: 'kasjanov_style.txt',
    label: '🪖 Юрий Касьянов (Военный реализм)',
    tone: 'Рубленый синтаксис, акцент на ТТХ, дронах, логистике, презрение к очковтирательству, фраза «Работаем дальше. Без иллюзий.» в конце.',
  },
  klimovski: {
    file: 'klimovski_style.txt',
    label: '🔬 Юрий Климовский (Клиническая геополитика)',
    tone: 'Патологоанатомический диагноз, геополитические элиты, снятие имперского бренда, интеллектуальный цинизм, фраза «Диагноз поставлен, агония продолжается» в конце.',
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    const fallback = `🔥 ${effectiveTitle.toUpperCase()}\n\nРазбираем главное событие дня без цензуры и пропаганды. Почему официальная версия трещит по швам и что происходит на самом деле.\n\nПодробный разбор смотрите в новом выпуске на канале ChaosChronicle:\n👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔\n\n#ChaosChronicle #новости #война #сатира #аналитика`;
    return { success: true, post: fallback, style };
  }

  const systemPrompt = `Ты — автор коротких постов для Facebook канала ChaosChronicle.
Напиши ОЧЕНЬ КРАТКИЙ, ёмкий пост (всего 40-70 слов), где изложена только самая суть новости без лишней воды.

СТИЛЕВОЙ ТОН:
${styleConfig.tone}

СТРОГИЕ ТРЕБОВАНИЯ К ПОСТУ:
1. Краткость: 1-2 коротких предложения, рассказывающие только факты новости и главную суть.
2. Призыв к просмотру видео:
👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔
3. Фирменная концовка стиля и 3-5 хэштегов (#ChaosChronicle #новости ...).
4. Выдавай ТОЛЬКО готовый текст поста без вступлений.`;

  const userPrompt = `ТЕМА/ЗАГОЛОВОК: ${effectiveTitle}\nКОНТЕКСТ/СЦЕНАРИЙ:\n${effectiveText.slice(0, 1200)}`;

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
    const generatedPost = aiData.choices?.[0]?.message?.content?.trim() || '';

    if (!generatedPost) throw new Error('Пустой ответ модели');

    if (jsonPath && fs.existsSync(jsonPath)) {
      if (!manifest.facebookPosts) manifest.facebookPosts = {};
      manifest.facebookPosts[style] = generatedPost;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }

    return { success: true, post: generatedPost, style };
  } catch (err) {
    const fallback = `🔥 ${effectiveTitle.toUpperCase()}\n\nРазбираем главное событие дня без цензуры и пропаганды.\n\nПодробный разбор смотрите в новом выпуске на канале ChaosChronicle:\n👉 [ССЫЛКА НА ВАШЕ ВИДЕО В YOUTUBE] 🔔\n\n#ChaosChronicle #новости #война #сатира #аналитика`;
    return { success: true, post: fallback, style };
  }
}
