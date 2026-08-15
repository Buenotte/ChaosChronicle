import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const MODELS = {
  gemini:   'google/gemini-2.5-flash',
  deepseek: 'deepseek/deepseek-chat',
  qwen:     'qwen/qwen-2.5-72b-instruct',
  free:     'openrouter/free',
};

const STYLES = {
  golubuzki: {
    file: 'golubuzki_style.txt',
    label: '🎭 Алексей Голобуцкий',
    focus: 'Едкий политический сарказм, смех как оружие, деконструкция официальной лжи врага, бытовые маркеры, ироничный финал «Продолжаем наблюдение».',
  },
  kasjanov: {
    file: 'kasjanov_style.txt',
    label: '🪖 Юрий Касьянов',
    focus: 'Военно-технический реализм, рубленый синтаксис, акцент на ТТХ, дронах, РЭБ, логистике, презрение к очковтирательству, финал «Работаем дальше. Без иллюзий.».',
  },
  klimovski: {
    file: 'klimovski_style.txt',
    label: '🔬 Юрий Климовский',
    focus: 'Клинический реализм и геополитика, мир как операционный стол, диагноз вместо мнения, кулуарные кураторы и снятие имперских брендов, финал «Диагноз поставлен, агония продолжается».',
  },
  gibrid: {
    file: 'gibrid_style.txt',
    label: '⚡ Гибридный стиль (3 в 1)',
    focus: 'Синтез сатиры Голобуцкого, военного реализма Касьянова и геополитической анатомии Климовского.',
  },
};

// ── Построитель промпта фельетона с выбором авторского стиля ──
export function buildStyledFeuilletonPrompt(newsTitle, newsSummary = '', styleKey = 'golubuzki') {
  const scriptsDir = path.resolve(__dirname, '../../scripts');
  const styleConfig = STYLES[styleKey] || STYLES.golubuzki;
  const stylePath = path.join(scriptsDir, styleConfig.file);
  let styleGuide = '';

  if (fs.existsSync(stylePath)) {
    try { styleGuide = fs.readFileSync(stylePath, 'utf-8').slice(0, 1800); } catch {}
  }

  const systemInstruction = `Ты — ведущий сатирический колумнист и аналитик канала ChaosChronicle.
Твоя задача — написать яркий, захватывающий 3-минутный фельетон (400-550 слов) на русском языке для видео.

АВТОРСКИЙ СТИЛЬ: ${styleConfig.label}
ГЛАВНЫЙ ФОКУС: ${styleConfig.focus}
${styleGuide ? `\nПОДРОБНОЕ РУКОВОДСТВО ПО СТИЛЮ:\n${styleGuide}\n` : ''}

СТРОЖАЙШИЕ ПРАВИЛА ДЛЯ АУДИО-ОЗВУЧКИ (TTS):
1. ПИШИ ТОЛЬКО ЧИСТЫЙ ПРОИЗНОСИМЫЙ ТЕКСТ ДИКТОРА от первого до последнего слова.
2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО НАЧИНАТЬ ТЕКСТ С ПРИВЕТСТВИЙ («Привет, друзья!», «С вами ChaosChronicle», «Доброго времени суток», «Здравствуйте», «Приветствую»). Начинай СРАЗУ с инфоповода, саркастического хука или хлесткого факта!
3. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать заголовки блоков (например: НЕ ПИШИ "**Блок 1: ...**"), НЕ ПИШИ тайминги "(0:00 – 0:45)".
4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать плейсхолдеры в квадратных скобках [B-Roll:...], [Название_канала]. Называй канал "ChaosChronicle".
5. Текст должен звучать слитно, ритмично и мощно для записи голосовым ИИ.`;

  const userInstruction = `ТЕМА НОВОСТИ: ${newsTitle}\nКОНТЕКСТ/ФАКТЫ: ${newsSummary || ''}\n\nНапиши полный, готовый монолог фельетона в стиле ${styleConfig.label} (БЕЗ вступительных приветствий, сразу с сути):`;

  return { systemInstruction, userInstruction };
}

// ── Генератор заголовков в стиле Голобуцкого (4-5 слов) ──
export async function generateGolubuzkiTitle(newsTitle, newsSummary = '') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    return (newsTitle || 'ГЛАВНАЯ НОВОСТЬ ДНЯ').split(/\s+/).slice(0, 5).join(' ').toUpperCase();
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Создай убойный сатирический YouTube-заголовок для обложки. СТРОГО 4-5 СЛОВ (капсом UPPERCASE). БЕЗ кавычек и точек.' },
          { role: 'user', content: `Новость: ${newsTitle}\nКонтекст: ${newsSummary?.slice(0, 300) || ''}` }
        ],
        max_tokens: 40,
        temperature: 0.85,
      }),
      signal: AbortSignal.timeout(7000),
    });

    if (res.ok) {
      const data = await res.json();
      let text = data.choices?.[0]?.message?.content?.trim();
      if (text) {
        text = text.replace(/["'«»`]/g, '').replace(/\.$/, '').trim();
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length >= 3 && words.length <= 6) {
          return text.toUpperCase();
        }
      }
    }
  } catch (err) {
    console.warn('Title generation fallback:', err.message);
  }
  return (newsTitle || 'ГЛАВНАЯ НОВОСТЬ ДНЯ').split(/\s+/).slice(0, 5).join(' ').toUpperCase();
}

function cleanSpeechTextForAudio(rawText) {
  if (!rawText) return '';
  return rawText
    .replace(/^#+\s.*$/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[b-roll:[^\]]*\]/gi, '')
    .replace(/\([0-9]+:[0-9]+[^)]*\)/g, '')
    .replace(/^[А-Яа-яЁё\s0-9]+:\s*/gm, '')
    .replace(/^(Привет,?\s*друзья!?|Доброго\s+времени\s+суток!?[^.!?\n]*[.!?]|Здравствуйте,?\s*[^.!?\n]*[.!?]|Приветствую,?\s*[^.!?\n]*[.!?]|С\s+вами\s+ChaosChronicle[^.!?\n]*[.!?])\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// POST /api/generate-feuilleton
// WICHTIG: Generiert den Text NUR im Speicher ohne automatisches Speichern auf Festplatte!
router.post('/api/generate-feuilleton', async (req, res) => {
  const { title, summary, model = 'gemini', source, style = 'golubuzki' } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY ist nicht konfiguriert.' });
  }

  const modelId = MODELS[model] || MODELS.gemini;
  const { systemInstruction, userInstruction } = buildStyledFeuilletonPrompt(title, summary, style);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'ChaosChronicle',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userInstruction },
        ],
        max_tokens: 2200,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    const text = cleanSpeechTextForAudio(rawText);
    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.round((words / 140) * 10) / 10;

    const punchyTitle = await generateGolubuzkiTitle(title, summary);

    const feuilletonObj = {
      title: punchyTitle || title,
      originalTitle: title,
      text,
      model: modelId,
      modelName: model,
      style,
      words,
      minutes,
      readTimeMin: minutes,
      source,
      imageUrl: req.body.imageUrl,
      images: req.body.images || (req.body.imageUrl ? [req.body.imageUrl] : []),
      isSaved: false,
    };

    res.json({
      success: true,
      feuilleton: feuilletonObj,
      ...feuilletonObj,
    });
  } catch (err) {
    console.error('Feuilleton error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
