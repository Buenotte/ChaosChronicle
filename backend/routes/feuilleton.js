import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const MODELS = {
  gemini:   'google/gemini-2.5-flash',
  deepseek: 'deepseek/deepseek-chat',
};

const STYLES = {
  golubuzki: {
    file: 'golubuzki_style.txt',
    label: '🎭 Алексей Голобуцкий',
    focus: 'Едкая политическая сатира, смех как оружие, деконструкция официальной лжи врага, высмеивание паники в бункере и живой саркастический язык.',
  },
  kasjanov: {
    file: 'kasjanov_style.txt',
    label: '🪖 Юрий Касьянов',
    focus: 'Военно-инженерный реализм, аналитика без штампов, глубокий разбор ТТХ, логистики, тактики и уязвимостей врага, разнообразный живой язык.',
  },
  klimovski: {
    file: 'klimovski_style.txt',
    label: '🔬 Юрий Климовский',
    focus: 'Клинический геополитический реализм, анатомия теневых решений Кремля, клановые интересы элит, демистификация имперской пропаганды.',
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
    try { styleGuide = fs.readFileSync(stylePath, 'utf-8').slice(0, 2400); } catch {}
  }

  const systemInstruction = `Ты — ведущий сатирический колумнист и аналитик канала ChaosChronicle.
Твоя задача — написать яркий, захватывающий 3-минутный фельетон (400-550 слов) на русском языке для видео.

СТРОГАЯ ПОЗИЦИЯ:
- СТРОГО НА СТОРОНЕ УКРАИНЫ. Без ложного нейтралитета. Бескомпромиссно высмеивай кремлевскую пропаганду, имперские мифы, ложь властей РФ и военную агрессию.

АВТОРСКИЙ СТИЛЬ: ${styleConfig.label}
ГЛАВНЫЙ ФОКУС: ${styleConfig.focus}
${styleGuide ? `\nПОДРОБНОЕ РУКОВОДСТВО ПО СТИЛЮ:\n${styleGuide}\n` : ''}

СТРОЖАЙШИЕ ПРАВИЛА ДЛЯ АУДИО-ОЗВУЧКИ (TTS):
1. ПИШИ ТОЛЬКО ЧИСТЫЙ ПРОИЗНОСИМЫЙ ТЕКСТ ДИКТОРА от первого до последнего слова.
2. 💥 ПЕРВЫЕ 3 СЕКУНДЫ (ВЗРЫВНОЙ ПАРАДОКСАЛЬНЫЙ ХУК): Первое предложение монолога (7–12 слов) ОБЯЗАНО быть максимально парадоксальным и ироничным столкновением противоположностей (как "Великая морская держава прячет зерно от дронов среди айсбергов и белых медведей"), мгновенно вызывающим вопрос "Что за бред?!" и приковывающим зрителя!
3. 🎬 ВИЗУАЛЬНЫЙ ГРОТЕСК И МЕТАФОРЫ-МЕМЫ: Создавай 2–3 кинематографичные, сочные сцены с физическими деталями, которые зритель мгновенно видит (например: "матросы ломами отбивают лед от пшеницы", "дрон в зимнем камуфляже выныривает из полыньи", "мука со вкусом айсберга"). Избегай сухой политологии — рисуй смешной и абсурдный фарс!
4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО НАЧИНАТЬ ТЕКСТ С ПРИВЕТСТВИЙ («Привет, друзья!», «С вами ChaosChronicle», «Доброго времени суток», «Здравствуйте», «Приветствую»). Начинай СРАЗУ с убойного хука!
5. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать заголовки блоков (например: НЕ ПИШИ "**Блок 1: ...**"), НЕ ПИШИ тайминги "(0:00 – 0:45)".
6. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать плейсхолдеры в квадратных скобках [B-Roll:...], [Название_канала]. Называй канал "ChaosChronicle".
7. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать шаблонные концовки-клише «Работаем дальше. Без иллюзий.», «Работаем дальше», «Без иллюзий».
8. ТРЕБОВАНИЕ К РАЗНООБРАЗИЮ: Каждый текст должен иметь уникальную композицию и подачу, отталкиваясь от конкретных деталей. Избегай повторов одних и тех же фраз!
9. Текст должен звучать слитно, ритмично и мощно для записи голосовым ИИ.`;

  const userInstruction = `ТЕМА НОВОСТИ: ${newsTitle}\nКОНТЕКСТ/ФАКТЫ: ${newsSummary || ''}\n\nНапиши полный, готовый монолог фельетона в стиле ${styleConfig.label} с яркими визуальными метафорами и парадоксальным хуком (БЕЗ вступительных приветствий, сразу с сути):`;

  return { systemInstruction, userInstruction };
}

async function callGeminiDirect(systemInstruction, userInstruction, maxTokens = 4000) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.includes('HIER')) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${geminiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: userInstruction }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Gemini Direct ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Генератор заголовков в стиле Голобуцкого (4-5 слов) СТРОГО ИЗ ТЕКСТА ──
export async function generateGolubuzkiTitle(newsTitle, newsSummary = '', monologueText = '') {
  const textContext = monologueText && monologueText.trim() ? monologueText.slice(0, 1200) : (newsSummary || newsTitle);

  // 1. Попытка через прямой Google Gemini API
  try {
    const directTitle = await callGeminiDirect(
      'Создай убойный сатирический YouTube-заголовок СТРОГО НА ОСНОВЕ ПРИВЕДЕННОГО ТЕКСТА ФЕЛЬЕТОНА. Требования: СТРОГО 4-5 СЛОВ (капсом UPPERCASE). БЕЗ кавычек и точек.',
      `Текст фельетона:\n"""\n${textContext}\n"""\n\nСоздай 1 заголовок из 4-5 слов капсом:`,
      60
    );
    if (directTitle) {
      const clean = directTitle.replace(/["'«»`]/g, '').replace(/\.$/, '').trim();
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length >= 3 && words.length <= 6) return clean.toUpperCase();
    }
  } catch (err) {
    console.warn('Direct title fallback:', err.message);
  }

  // 2. OpenRouter fallback
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey && !apiKey.includes('HIER')) {
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
            { role: 'system', content: 'Создай убойный сатирический YouTube-заголовок СТРОГО НА ОСНОВЕ ПРИВЕДЕННОГО ТЕКСТА ФЕЛЬЕТОНА. Требования: СТРОГО 4-5 СЛОВ (капсом UPPERCASE). БЕЗ кавычек и точек.' },
            { role: 'user', content: `Текст фельетона:\n"""\n${textContext}\n"""\n\nСоздай 1 заголовок из 4-5 слов капсом:` }
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
    .replace(/(?:Работаем\s+дальше[.,!\s]*)+/gi, '')
    .replace(/(?:Без\s+иллюзий[.,!\s]*)+/gi, '')
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

  const modelId = model === 'gemini' ? 'gemini-3.7-flash' : (MODELS[model] || MODELS.gemini);
  const { systemInstruction, userInstruction } = buildStyledFeuilletonPrompt(title, summary, style);

  try {
    let rawText = '';

    // 1. Direkt Google Gemini 3.7 Flash
    if (model === 'gemini') {
      try {
        rawText = await callGeminiDirect(systemInstruction, userInstruction, 4000);
      } catch (gErr) {
        console.warn('Google Gemini Direct fehlgeschlagen, nutze OpenRouter Fallback:', gErr.message);
      }
    }

    // 2. OpenRouter (für DeepSeek, Qwen oder Fallback)
    if (!rawText) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey || apiKey.includes('HIER')) {
        return res.status(500).json({ error: 'OPENROUTER_API_KEY ist nicht konfiguriert.' });
      }

      const orModelId = MODELS[model] || MODELS.gemini;
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ChaosChronicle',
        },
        body: JSON.stringify({
          model: orModelId,
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
      rawText = data.choices?.[0]?.message?.content || '';
    }
    const text = cleanSpeechTextForAudio(rawText);
    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.round((words / 140) * 10) / 10;

    const punchyTitle = await generateGolubuzkiTitle(title, summary, text);

    const feuilletonObj = {
      title: punchyTitle || title,
      originalTitle: title,
      url: req.body.url || req.body.link || '',
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

// ── Генератор 5 вирусных 3-секундных хуков для YouTube ──
export async function generateYouTubeHooks(newsTitle, newsSummary = '', scriptText = '', styleKey = 'golubuzki') {
  const context = scriptText && scriptText.trim() ? scriptText.slice(0, 1000) : (newsSummary || newsTitle);
  const sysInst = `Ты — топ-сценарист вирусных YouTube-видео и эксперт по удержанию аудитории в первые 3 секунды (Retention Rate).
Твоя задача — создать ровно 5 мощных, кинематографичных вариантов первого открывающего предложения (3-секундный хук) для видео-монолога на русском языке.

ТРЕБОВАНИЯ:
1. Длина каждого хука: СТРОГО 7–13 слов (время чтения диктором: 2.5–4.0 секунды).
2. Без приветствий, без клише, без вступительной воды. Сразу максимальное эмоциональное напряжение, интрига, шок или парадокс.
3. Формат ответа: СТРОГО валидный JSON-массив из 5 объектов:
[
  { "id": "shock", "type": "⚡ Шок & Инсайд", "hook": "Текст хука..." },
  { "id": "question", "type": "❓ Провокационный вопрос", "hook": "Текст хука..." },
  { "id": "satire", "type": "🎭 Едкая сатира / Сарказм", "hook": "Текст хука..." },
  { "id": "urgency", "type": "⏳ Высокие ставки / Угроза", "hook": "Текст хука..." },
  { "id": "punch", "type": "💥 Прямой факт-удар", "hook": "Текст хука..." }
]`;

  const userInst = `ТЕМА: ${newsTitle}\nКОНТЕКСТ:\n"""\n${context}\n"""\n\nСоздай 5 вирусных 3-секундных хуков в формате JSON:`;

  try {
    let raw = await callGeminiDirect(sysInst, userInst, 800);
    if (!raw) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (apiKey && !apiKey.includes('HIER')) {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'system', content: sysInst }, { role: 'user', content: userInst }],
            max_tokens: 800,
            temperature: 0.85,
          }),
        });
        if (res.ok) {
          const d = await res.json();
          raw = d.choices?.[0]?.message?.content || '';
        }
      }
    }

    if (raw) {
      const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.warn('generateYouTubeHooks error:', e.message);
  }

  const shortTitle = (newsTitle || 'главной новости').replace(/["'«»`]/g, '').slice(0, 40);
  return [
    { id: 'shock', type: '⚡ Шок & Инсайд', hook: `То, что сейчас скрывают о «${shortTitle}», повергло в панику кремлевских чиновников.` },
    { id: 'question', type: '❓ Провокационный вопрос', hook: `Вы действительно верите официальным сказкам пропаганды о «${shortTitle}»?` },
    { id: 'satire', type: '🎭 Едкая сатира / Сарказм', hook: `Очередной «плановый успех» бункера внезапно превратился в самый громкий провал года.` },
    { id: 'urgency', type: '⏳ Высокие ставки / Угроза', hook: `Последствия событий вокруг «${shortTitle}» ударят по каждому буквально на днях.` },
    { id: 'punch', type: '💥 Прямой факт-удар', hook: `Факты на столе: все бравурные заявления генералов только что разбились вдребезги.` },
  ];
}

// POST /api/generate-hooks
router.post('/api/generate-hooks', async (req, res) => {
  try {
    const { title = '', summary = '', text = '', style = 'golubuzki' } = req.body;
    if (!title && !text) {
      return res.status(400).json({ success: false, error: 'Title or text required' });
    }
    const hooks = await generateYouTubeHooks(title, summary, text, style);
    res.json({ success: true, hooks });
  } catch (err) {
    console.error('Hooks generation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
