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
  clickbait: { file: 'clickbait_style.txt', label: '🔥 Кликбейт & YouTube Топ (CTR 20%+)', focus: 'Ультра-вирусный темп, мощный шок-фактор, парадоксальные контрасты, хлесткие панчлайны и открытые петли интриги.' },
  golubuzki: { file: 'golubuzki_style.txt', label: '🎭 Алексей Голобуцкий', focus: 'Едкая сатира, смех как оружие, деконструкция официальной лжи врага и живой саркастический язык.' },
  kasjanov: { file: 'kasjanov_style.txt', label: '🪖 Юрий Касьянов', focus: 'Военно-инженерный реализм, аналитика без штампов, глубокий разбор ТТХ, логистики и тактики.' },
  klimovski: { file: 'klimovski_style.txt', label: '🔬 Юрий Климовский', focus: 'Клинический геополитический реализм, анатомия теневых решений Кремля, клановые интересы элит.' },
  analytics: { file: 'analytics_style.txt', label: '🧠 Увлекательная Аналитика (Без гротеска)', focus: 'Глубокий, понятный разбор: скрытые мотивы, расстановка сил, факты и последствия без гротеска.' },
  gibrid: { file: 'gibrid_style.txt', label: '⚡ Гибридный стиль (3 в 1)', focus: 'Синтез сатиры Голобуцкого, военного реализма Касьянова и геополитической анатомии Климовского.' },
};

// ── Построитель промпта фельетона с выбором авторского стиля ──
export function buildStyledFeuilletonPrompt(newsTitle, newsSummary = '', styleKey = 'golubuzki', tone = 'grotesque') {
  const scriptsDir = path.resolve(__dirname, '../../scripts');
  const styleConfig = STYLES[styleKey] || STYLES.golubuzki;
  const stylePath = path.join(scriptsDir, styleConfig.file);
  let styleGuide = '';

  if (fs.existsSync(stylePath)) {
    try { styleGuide = fs.readFileSync(stylePath, 'utf-8').slice(0, 2400); } catch {}
  }

  const isAnalytics = tone === 'analytics' || styleKey === 'analytics';
  const roleName = isAnalytics ? 'глубокий военный и политический аналитик' : 'ведущий сатирический колумнист и аналитик';
  const textGenre = isAnalytics ? 'увлекательный 3-минутный аналитический обзор' : 'яркий 3-минутный фельетон';
  const hookRule = isAnalytics
    ? '2. 🎯 ПЕРВЫЕ 3 СЕКУНДЫ (СИЛЬНЫЙ АНАЛИТИЧЕСКИЙ ХУК): Первое предложение (7–12 слов) ОБЯЗАНО вскрывать скрытую суть события или интригующий вопрос, мгновенно приковывая внимание зрителя!'
    : '2. 💥 ПЕРВЫЕ 3 СЕКУНДЫ (ВЗРЫВНОЙ ПАРАДОКСАЛЬНЫЙ ХУК): Первое предложение (7–12 слов) ОБЯЗАНО быть максимально парадоксальным столкновением противоположностей, вызывающим шок и интерес!';
  const coreRule = isAnalytics
    ? '3. 🧠 УВЛЕКАТЕЛЬНЫЙ АНАЛИЗ И СТОРИТЕЛЛИНГ: Раскрывай причинно-следственные связи, скрытые мотивы, технологические и геополитические ставки простым, понятным языком. БЕЗ цирка, клоунады и кричащего гротеска — говори умно, логично и доказательно!'
    : '3. 🎬 ВИЗУАЛЬНЫЙ ГРОТЕСК И МЕТАФОРЫ-МЕМЫ: Создавай 2–3 кинематографичные, сочные сцены с физическими деталями, которые зритель мгновенно видит. Рисуй смешной и абсурдный фарс!';

  let focusDesc = styleConfig.focus;
  if (isAnalytics) {
    if (styleKey === 'kasjanov') focusDesc = 'Военно-инженерный реализм Касьянова: глубокий профессиональный разбор ТТХ вооружений, тактики БПЛА, РЭБ, эшелонирования ПВО, логистики и реальных возможностей сторон БЕЗ ГРОТЕСКА.';
    else if (styleKey === 'klimovski') focusDesc = 'Геополитический реализм Климовского: клиническая анатомия теневых решений, клановые интересы, расстановка сил на мировой арене, дипломатические ставки и пружины БЕЗ ГРОТЕСКА.';
    else if (styleKey === 'golubuzki') focusDesc = 'Острая политическая публицистика Голобуцкого: последовательная деконструкция пропагандистских нарративов, факты, аргументы и политический анализ БЕЗ ГРОТЕСКА.';
    else if (styleKey === 'gibrid') focusDesc = 'Синтез глубокого военно-технического (Касьянов) и геополитического (Климовский) анализа БЕЗ ГРОТЕСКА.';
  }

  const systemInstruction = `Ты — ${roleName} канала ChaosChronicle.
Твоя задача — написать ${textGenre} (400-550 слов) на русском языке для видео.

СТРОГАЯ ПОЗИЦИЯ:
- СТРОГО НА СТОРОНЕ УКРАИНЫ. Без ложного нейтралитета. Бескомпромиссно вскрывай кремлевскую пропаганду, имперские мифы, ложь властей РФ и военную агрессию.

АВТОРСКИЙ СТИЛЬ: ${styleConfig.label} (${isAnalytics ? 'РЕЖИМ ЧИСТОЙ АНАЛИТИКИ БЕЗ ГРОТЕСКА' : 'РЕЖИМ САТИРЫ И ГРОТЕСКА'})
ГЛАВНЫЙ ФОКУС: ${focusDesc}
${styleGuide && !isAnalytics ? `\nПОДРОБНОЕ РУКОВОДСТВО ПО СТИЛЮ:\n${styleGuide}\n` : ''}

СТРОЖАЙШИЕ ПРАВИЛА ДЛЯ АУДИО-ОЗВУЧКИ (TTS):
1. ПИШИ ТОЛЬКО ЧИСТЫЙ ПРОИЗНОСИМЫЙ ТЕКСТ ДИКТОРА от первого до последнего слова.
${hookRule}
${coreRule}
4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО НАЧИНАТЬ ТЕКСТ С ПРИВЕТСТВИЙ («Привет, друзья!», «С вами ChaosChronicle», «Здравствуйте»). Начинай СРАЗУ с сути!
5. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать заголовки блоков (НЕ ПИШИ "**Блок 1: ...**"), НЕ ПИШИ тайминги "(0:00 – 0:45)".
6. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать плейсхолдеры в квадратных скобках [B-Roll:...]. Называй канал "ChaosChronicle".
7. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать шаблонные концовки-клише «Работаем дальше. Без иллюзий.».
8. ТРЕБОВАНИЕ К РАЗНООБРАЗИЮ: Каждый текст должен иметь уникальную композицию и подачу. Избегай повторов одних и тех же фраз!
9. Текст должен звучать слитно, ритмично и мощно для записи голосовым ИИ.`;

  const userInstruction = isAnalytics
    ? `ТЕМА: ${newsTitle}\nФАКТЫ: ${newsSummary || ''}\n\nНапиши увлекательный аналитический разбор в стиле ${styleConfig.label} простым и живым языком БЕЗ ГРОТЕСКА (БЕЗ вступительных приветствий, сразу с интригующей сути):`
    : `ТЕМА НОВОСТИ: ${newsTitle}\nКОНТЕКСТ/ФАКТЫ: ${newsSummary || ''}\n\nНапиши полный, готовый монолог фельетона в стиле ${styleConfig.label} с яркими визуальными метафорами и парадоксальным хуком (БЕЗ вступительных приветствий, сразу с сути):`;

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
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`Google Gemini Direct ${response.status}: ${errText}`);
    return null;
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Генератор заголовков в стиле Голобуцкого (4-5 слов) СТРОГО ИЗ ТЕКСТА ──
export async function generateGolubuzkiTitle(newsTitle, newsSummary = '', monologueText = '') {
  const textContext = monologueText && monologueText.trim() ? monologueText.slice(0, 1200) : (newsSummary || newsTitle);

  // 1. Попытка через прямой Google Gemini API (gemini-3.7-flash)
  try {
    const directTitle = await callGeminiDirect(
      `Ты — главный редактор YouTube-канала ChaosChronicle и мастер ультра-гротескных, вирусных заголовков.
Твоя задача — создать ОДИН УЛЬТРА-ГРОТЕСКНЫЙ, хлесткий YouTube-заголовок (СТРОГО 4-5 СЛОВ, ВСЕ БУКВЫ ЗАГЛАВНЫЕ UPPERCASE).
ФОРМУЛА ВИРУСНОГО ГРОТЕСКА:
- Столкновение несовместимого, парадокс, ирония, абсурд реальности («КУКУРУЗА ДЛЯ СЕВЕРНОГО ПОЛЮСА», «ПРЯЧУТ ФЛОТ СРЕДИ АЙСБЕРГОВ», «ВОЕНРУК ПРЕПАРИРУЕТ ЛЯГУШКУ ШТЫКОМ»).
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ скучные штампы, кавычки и точки.
- СТРОГО 4-5 СЛОВ капсом.`,
      `ТЕКСТ:\n"""\n${textContext}\n"""\n\nСоздай 1 ультра-гротескный заголовок из 4-5 слов капсом:`,
      1200
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
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Создай 1 ультра-гротескный YouTube-заголовок из 4-5 слов капсом UPPERCASE без кавычек и точек.' },
            { role: 'user', content: `Текст:\n"""\n${textContext}\n"""\n\n1 заголовок из 4-5 слов капсом:` }
          ],
          max_tokens: 400,
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
          if (words.length >= 3 && words.length <= 6) return text.toUpperCase();
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
  const { title, summary, model = 'gemini', source, style = 'golubuzki', tone = 'grotesque' } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const modelId = model === 'gemini' ? 'gemini-3.7-flash' : (MODELS[model] || MODELS.gemini);
  const { systemInstruction, userInstruction } = buildStyledFeuilletonPrompt(title, summary, style, tone);

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

// ── Генератор 5 ультра-гротескных 3-секундных хуков для YouTube ──
export async function generateYouTubeHooks(newsTitle, newsSummary = '', scriptText = '', styleKey = 'golubuzki') {
  const context = scriptText && scriptText.trim() ? scriptText.slice(0, 1200) : (newsSummary || newsTitle);
  const sysInst = `Ты — главный сценарист вирусных YouTube-роликов и эксперт по взрывным 3-секундным хукам (Retention Rate 100%+).
Твоя задача — создать ровно 5 УЛЬТРА-ГРОТЕСКНЫХ, кинематографичных вариантов первого открывающего предложения (СТРОГО ОДНО ПРЕДЛОЖЕНИЕ, 7–14 слов).

ФОРМУЛА ВИРУСНОГО ГРОТЕСКА:
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ скучные шаблоны («То, что сейчас скрывают...», «Вы не поверите...», «Официальные сказки...», «Эксперты бьют тревогу...», «Факты на столе...»).
- Каждый хук ОБЯЗАН быть яркой физической сценой-мемом или парадоксальным столкновением несовместимого:
  Примеры эталонов:
  * «Великая морская держава прячет зерно от дронов среди белых медведей и полярных льдов.»
  * «Контуженый военрук на уроке биологии объясняет строение клетки через устройство осколочной гранаты.»
  * «Ядерный хищник так долго пугал тайгу, что с голодухи начал с аппетитом пожирать собственную берлогу.»
  * «Кремлевские генералы сдали отопление на металлолом, чтобы сварить суп из досок несущей стены.»
  * «Пекари в Каире будут печь лепешки из русской муки со вкусом вечной мерзлоты и машинного масла.»

ФОРМАТ ОТВЕТА (СТРОГО JSON-массив из 5 объектов):
[
  { "id": "grotesque", "type": "🎪 Визуальный гротеск", "hook": "Одно сочное гротескное предложение..." },
  { "id": "paradox", "type": "💥 Когнитивный диссонанс", "hook": "Одно парадоксальное предложение..." },
  { "id": "satire", "type": "🎭 Едкий сатирический панч", "hook": "Одно язвительное панч-предложение..." },
  { "id": "meme", "type": "🎬 Кинематографичный мем", "hook": "Одно визуальное мем-предложение..." },
  { "id": "climax", "type": "⚡ Физический абсурд", "hook": "Одно абсурдное бытовое предложение..." }
]`;

  const userInst = `ТЕМА: ${newsTitle}\nКОНТЕКСТ:\n"""\n${context}\n"""\n\nСоздай 5 ультра-гротескных 3-секундных хуков в формате JSON:`;

  try {
    let raw = await callGeminiDirect(sysInst, userInst, 2500);
    if (!raw) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (apiKey && !apiKey.includes('HIER')) {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'system', content: sysInst }, { role: 'user', content: userInst }],
            max_tokens: 2500,
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

  const shortTitle = (newsTitle || 'главной темы').replace(/["'«»`]/g, '').slice(0, 45);
  return [
    { id: 'grotesque', type: '🎪 Визуальный гротеск', hook: `Сверхдержава пытается победить законы физики и логики в безумной истории с «${shortTitle}».` },
    { id: 'paradox', type: '💥 Когнитивный диссонанс', hook: `Обещали мировое величие, а в итоге спасаются бегством в сюжете вокруг «${shortTitle}».` },
    { id: 'satire', type: '🎭 Едкий сатирический панч', hook: `Очередной кремлевский «хитрый план» с «${shortTitle}» обернулся цирком на глазах у всего мира.` },
    { id: 'meme', type: '🎬 Кинематографичный мем', hook: `Пока генералы рисуют победы, реальность вокруг «${shortTitle}» горит ярким пионерским костром.` },
    { id: 'climax', type: '⚡ Физический абсурд', hook: `Финальный аккорд имперского фарса: как «${shortTitle}» добивает остатки здравого смысла.` },
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
