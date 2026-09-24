import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrapeArticleText } from '../services/articleScraperService.js';
import { YOUTUBE_STYLES } from '../services/youtubeStyles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const MODELS = { gemini: 'google/gemini-2.5-flash', deepseek: 'deepseek/deepseek-chat' };

const STYLES = {
  golubuzki: { file: 'golubuzki_style.txt', label: '🎭 Алексей Голобуцкий', focus: 'Едкая сатира, смех как оружие, деконструкция лжи врага.' },
  clickbait: { file: 'clickbait_style.txt', label: '🔥 Кликбейт & YouTube Топ (CTR 20%+)', focus: 'Ультра-вирусный темп, шок-фактор, открытые петли.' },
  kasjanov: { file: 'kasjanov_style.txt', label: '🪖 Юрий Касьянов', focus: 'Военно-инженерный реализм, аналитика ТТХ, логистики и тактики.' },
  klimovski: { file: 'klimovski_style.txt', label: '🔬 Юрий Климовский', focus: 'Клинический геополитический реализм, анатомия решений Кремля.' },
  gibrid: { file: 'gibrid_style.txt', label: '⚡ Гибридный стиль (3 в 1)', focus: 'Синтез сатиры Голобуцкого, военного реализма и геополитики.' },
};

export function buildStyledFeuilletonPrompt(newsTitle, newsSummary = '', styleKey = 'golubuzki', tone = 'grotesque') {
  if (YOUTUBE_STYLES[styleKey]) {
    const ytCfg = YOUTUBE_STYLES[styleKey];
    return {
      systemInstruction: ytCfg.systemInstruction,
      userInstruction: `ТЕМА: ${newsTitle}\nМАТЕРИАЛ:\n"""\n${newsSummary || ''}\n"""\n\nСоздай 3-минутный монолог (СТРОГО 400–550 слов) в стиле «${ytCfg.name}» без приветствий:`,
    };
  }

  const scriptsDir = path.resolve(__dirname, '../../scripts');
  const effectiveKey = styleKey === 'analytics' ? 'gibrid' : styleKey;
  const styleConfig = STYLES[effectiveKey] || STYLES.golubuzki;
  let styleGuide = '';
  if (styleConfig?.file) {
    const stylePath = path.join(scriptsDir, styleConfig.file);
    if (fs.existsSync(stylePath)) {
      try { styleGuide = fs.readFileSync(stylePath, 'utf-8').slice(0, 2400); } catch {}
    }
  }

  const isAnalytics = tone === 'analytics';
  const roleName = isAnalytics ? 'глубокий военный и политический аналитик' : 'ведущий сатирический колумнист и аналитик';
  const textGenre = isAnalytics ? 'увлекательный 3-минутный аналитический обзор' : 'яркий 3-минутный фельетон';
  const hookRule = isAnalytics
    ? '2. 🎯 ПЕРВЫЕ 3 СЕКУНДЫ (СИЛЬНЫЙ АНАЛИТИЧЕСКИЙ ХУК): Первое предложение (7–12 слов) ОБЯЗАНО вскрывать скрытую суть события!'
    : '2. 💥 ПЕРВЫЕ 3 СЕКУНДЫ (ВЗРЫВНОЙ ХУК): Первое предложение (7–12 слов) ОБЯЗАНО быть парадоксальным столкновением противоположностей!';
  const coreRule = isAnalytics
    ? '3. 🧠 УВЛЕКАТЕЛЬНЫЙ АНАЛИЗ: Раскрывай причинно-следственные связи, ставки и мотивы. БЕЗ цирка и кричащего гротеска!'
    : '3. 🎬 ВИЗУАЛЬНЫЙ ГРОТЕСК И МЕТАФОРЫ-МЕМЫ: Создавай 2–3 кинематографичные сцены с физическими деталями!';

  let focusDesc = styleConfig.focus;
  if (isAnalytics) {
    if (styleKey === 'kasjanov') focusDesc = 'Военно-инженерный реализм Касьянова: анализ ТТХ, тактики БПЛА, РЭБ, ПВО и логистики.';
    else if (styleKey === 'klimovski') focusDesc = 'Геополитический реализм Климовского: анатомия теневых решений, клановые интересы.';
    else if (styleKey === 'golubuzki') focusDesc = 'Острая политическая публицистика Голобуцкого: деконструкция пропаганды, факты и анализ.';
    else if (styleKey === 'gibrid') focusDesc = 'Синтез военно-технического (Касьянов) и геополитического (Климовский) анализа.';
  }

  const systemInstruction = `Ты — ${roleName} канала ChaosChronicle. Напиши ${textGenre} (400-550 слов) на русском языке для видео.
СТРОГАЯ ПОЗИЦИЯ: СТРОГО НА СТОРОНЕ УКРАИНЫ. Вскрывай кремлевскую пропаганду, ложь властей РФ и военную агрессию.
АВТОРСКИЙ СТИЛЬ: ${styleConfig.label} (${isAnalytics ? 'РЕЖИМ АНАЛИТИКИ' : 'РЕЖИМ САТИРЫ'})
ГЛАВНЫЙ ФОКУС: ${focusDesc}
${styleGuide && !isAnalytics ? `\nПОДРОБНОЕ РУКОВОДСТВО ПО СТИЛЮ:\n${styleGuide}\n` : ''}
СТРОЖАЙШИЕ ПРАВИЛА ДЛЯ АУДИО-ОЗВУЧКИ (TTS):
1. ПИШИ ТОЛЬКО ЧИСТЫЙ ПРОИЗНОСИМЫЙ ТЕКСТ ДИКТОРА.
${hookRule}
${coreRule}
4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО начинать с приветствий («Привет, друзья!», «С вами ChaosChronicle»).
5. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать заголовки блоков («**Блок 1**»), тайминги, плейсхолдеры [B-Roll:...], концовки «Работаем дальше. Без иллюзий.».
6. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать от первого лица («мы», «я», «мы разбираем», «наш анализ», «разбор полетов»). Веди повествование строго в третьем лице!`;

  const userInstruction = isAnalytics
    ? `ТЕМА: ${newsTitle}\nФАКТЫ: ${newsSummary || ''}\n\nНапиши увлекательный аналитический текст в стиле ${styleConfig.label} простым языком (БЕЗ приветствий, сразу с сути):`
    : `ТЕМА НОВОСТИ: ${newsTitle}\nКОНТЕКСТ/ФАКТЫ: ${newsSummary || ''}\n\nНапиши монолог фельетона в стиле ${styleConfig.label} с яркими метафорами и парадоксальным хуком (БЕЗ приветствий):`;

  return { systemInstruction, userInstruction };
}

async function callGeminiDirect(systemInstruction, userInstruction, maxTokens = 4000) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.includes('HIER')) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: userInstruction }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: maxTokens },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch { return null; }
}

export async function generateGolubuzkiTitle(newsTitle, newsSummary = '', monologueText = '', tone = 'satire', style = 'golubuzki') {
  const textContext = monologueText && monologueText.trim() ? monologueText.slice(0, 1200) : (newsSummary || newsTitle);
  const isAnalytics = tone === 'analytics';
  const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(style);
  const sysPrompt = isYt
    ? `Ты — ведущий YouTube-продюсер. Создай 1 ЗАХВАТЫВАЮЩИЙ заголовок по теме (СТРОГО 4-5 СЛОВ, UPPERCASE). Главная суть/интрига. БЕЗ политики и сатиры.`
    : isAnalytics
    ? `Ты — военный аналитик ChaosChronicle. Создай 1 МОЩНЫЙ АНАЛИТИЧЕСКИЙ YouTube-заголовок (СТРОГО 4-5 СЛОВ, UPPERCASE). Серьезный диагноз и нерв темы. БЕЗ клоунады.`
    : `Ты — мастер острой сатиры. Создай 1 ХЛЕСТКИЙ сатирический YouTube-заголовок (СТРОГО 4-5 СЛОВ, UPPERCASE). Острый парадокс реальности. БЕЗ клоунады.`;
  const userPrompt = `ТЕКСТ:\n"""\n${textContext}\n"""\n\nСоздай 1 заголовок из 4-5 слов капсом:`;

  try {
    const directTitle = await callGeminiDirect(sysPrompt, userPrompt, 1200);
    if (directTitle) {
      const clean = directTitle.replace(/["'«»`]/g, '').replace(/\.$/, '').trim();
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length >= 3 && words.length <= 6) return clean.toUpperCase();
    }
  } catch {}

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey && !apiKey.includes('HIER')) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }],
          max_tokens: 400, temperature: 0.85,
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
    } catch {}
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
    .replace(/(?:сегодня|в этом (?:видео|выпуске))\s+мы\s+(?:разбираем|анализируем|посмотрим)[^.!?\n]*[.!?]?/gi, '')
    .replace(/\bмы\s+(?:разбираем|анализируем|посмотрим|раскроем|видим|обсудим)\b/gi, '')
    .replace(/\b(?:глубокая аналитика\s*(?:без гротеска)?|без гротеска)\b/gi, '')
    .replace(/\b(?:Разбор полетов|Глубокий разбор|Наш разбор)\b/gi, '')
    .replace(/(?:Работаем\s+дальше[.,!\s]*)+/gi, '')
    .replace(/(?:Без\s+иллюзий[.,!\s]*)+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

router.post('/api/generate-feuilleton', async (req, res) => {
  const { title, summary, model = 'gemini', source, style = 'golubuzki', tone = 'grotesque' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  let effectiveSummary = (summary || req.body.original_news || req.body.originalNews || req.body.sourceText || '').trim();
  const folderName = req.body.folderName || req.body.matchingPkg?.folderName || '';
  const bundleDir = req.body.bundleDir || req.body.matchingPkg?.bundleDir || '';
  if (folderName || bundleDir) {
    const targetDir = bundleDir || path.resolve(__dirname, '../../news', folderName);
    const srcFile = path.join(targetDir, 'source.txt'), origFile = path.join(targetDir, 'original_news.txt');
    if (fs.existsSync(srcFile)) {
      try { const d = fs.readFileSync(srcFile, 'utf-8').trim(); if (d.length > 50) effectiveSummary = d; } catch {}
    } else if (fs.existsSync(origFile)) {
      try { const d = fs.readFileSync(origFile, 'utf-8').trim(); if (d.length > 50) effectiveSummary = d; } catch {}
    }
  }

  const articleUrl = req.body.url || req.body.link || req.body.matchingPkg?.url || '';
  if ((effectiveSummary.length < 1200 || req.body.forceScrape) && articleUrl && /^https?:\/\//i.test(articleUrl)) {
    try {
      const scraped = await scrapeArticleText(articleUrl);
      if (scraped && scraped.length > effectiveSummary.length) effectiveSummary = scraped;
    } catch {}
  }

  const modelId = MODELS[model] || MODELS.gemini;
  const { systemInstruction, userInstruction } = buildStyledFeuilletonPrompt(title, effectiveSummary, style, tone);

  try {
    let rawText = '';
    if (model === 'gemini') {
      try { rawText = await callGeminiDirect(systemInstruction, userInstruction, 4000); } catch {}
    }

    if (!rawText) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey || apiKey.includes('HIER')) return res.status(500).json({ error: 'OPENROUTER_API_KEY nicht konfiguriert.' });
      const orModelId = MODELS[model] || MODELS.gemini;
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:5173', 'X-Title': 'ChaosChronicle' },
        body: JSON.stringify({ model: orModelId, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userInstruction }], max_tokens: 2200, temperature: 0.85 }),
      });
      if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
      const data = await response.json();
      rawText = data.choices?.[0]?.message?.content || '';
    }
    const text = cleanSpeechTextForAudio(rawText);
    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.round((words / 140) * 10) / 10;
    const punchyTitle = await generateGolubuzkiTitle(title, effectiveSummary, text, tone, style);

    const feuilletonObj = {
      title: punchyTitle || title,
      originalTitle: title,
      url: articleUrl,
      text,
      model: modelId,
      modelName: model,
      style,
      words,
      readingTimeMinutes: minutes,
      minutes,
      readTimeMin: minutes,
      source: source || 'Telegram / RSS',
      date: new Date().toISOString(),
      summary: effectiveSummary,
      original_news: effectiveSummary,
      imageUrl: req.body.imageUrl,
      images: req.body.images || (req.body.imageUrl ? [req.body.imageUrl] : []),
      isSaved: false,
    };

    if (req.body.saveToPackage && (folderName || bundleDir)) {
      const targetDir = bundleDir || path.resolve(__dirname, '../../news', folderName);
      if (fs.existsSync(targetDir)) {
        fs.writeFileSync(path.join(targetDir, 'script.txt'), text, 'utf-8');
        const origSection = effectiveSummary ? `## 📝 Исходное сообщение\n${effectiveSummary}\n\n---\n\n` : '';
        fs.writeFileSync(path.join(targetDir, 'script.md'), `# 🎭 ${punchyTitle || title}\n\n---\n\n${origSection}## 🎬 Сценарий\n${text}\n`, 'utf-8');
        const jsonPath = path.join(targetDir, 'project.json');
        if (fs.existsSync(jsonPath)) {
          try {
            const m = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            m.word_count = words; m.style = style; m.text_updated_at = new Date().toISOString();
            if (punchyTitle && (!m.title || m.title === m.original_title)) m.title = punchyTitle;
            fs.writeFileSync(jsonPath, JSON.stringify(m, null, 2), 'utf-8');
          } catch {}
        }
        feuilletonObj.isSaved = true;
      }
    }

    res.json({ success: true, feuilleton: feuilletonObj, ...feuilletonObj });
  } catch (err) {
    console.error('Feuilleton error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export async function generateYouTubeHooks(newsTitle, newsSummary = '', scriptText = '', styleKey = 'golubuzki', tone = 'grotesque') {
  const context = scriptText && scriptText.trim() ? scriptText.slice(0, 1200) : (newsSummary || newsTitle);
  const isAnalytics = tone === 'analytics' || styleKey === 'analytics';

  const sysInst = isAnalytics
    ? `Ты — главный редактор аналитического YouTube-канала. Создай ровно 5 СИЛЬНЫХ, ИНТРИГУЮЩИХ 3-секундных хуков (СТРОГО 1 предложение, 8–15 слов).
СТРОГО БЕЗ ГРОТЕСКА, БЕЗ КЛОУНАДЫ, БЕЗ БРЕДА.
ФОРМАТ (СТРОГО JSON-массив из 5 объектов):
[
  { "id": "intrigue", "type": "🎯 Скрытая суть", "hook": "Точное интригующее предложение о подоплеке события..." },
  { "id": "paradox", "type": "💥 Реальный парадокс", "hook": "Парадоксальное столкновение планов и фактов..." },
  { "id": "stakes", "type": "🧠 Ставки и цена", "hook": "Предложение о реальных геополитических последствиях..." },
  { "id": "turning_point", "type": "⚡ Точка невозврата", "hook": "Предложение о необратимости начавшихся процессов..." },
  { "id": "fact", "type": "🔍 Неудобный факт", "hook": "Жесткий реальный факт, меняющий всю картину..." }
]`
    : `Ты — мастер острой сатиры. Создай ровно 5 ХЛЕСТКИХ, ОСТРОУМНЫХ 3-секундных хуков (СТРОГО 1 предложение, 8–15 слов).
СТРОГО БЕЗ КЛОУНАДЫ. Привязка к реальности.
ФОРМАТ (СТРОГО JSON-массив из 5 объектов):
[
  { "id": "paradox", "type": "💥 Парадокс реальности", "hook": "Острое предложение о крахе иллюзий..." },
  { "id": "satire", "type": "🎭 Едкая ирония", "hook": "Хлесткое саркастическое предложение по поводу события..." },
  { "id": "scene", "type": "🎬 Меткий образ", "hook": "Яркая, но жизненная метафора ситуации..." },
  { "id": "diagnosis", "type": "⚡ Политический диагноз", "hook": "Беспощадный вывод о природе случившегося..." },
  { "id": "punch", "type": "🎯 Точный панчлайн", "hook": "Остроумный панч в нерв темы..." }
]`;

  const userInst = `ТЕМА: ${newsTitle}\nКОНТЕКСТ:\n"""\n${context}\n"""\n\nСоздай 5 хуков в формате JSON:`;

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
            temperature: 0.75,
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
  } catch (e) {}

  const shortTitle = (newsTitle || 'главной темы').replace(/["'«»`]/g, '').slice(0, 45);
  return isAnalytics ? [
    { id: 'intrigue', type: '🎯 Скрытая суть', hook: `За внешним шумом вокруг «${shortTitle}» скрывается ключевой сдвиг, меняющий правила игры.` },
    { id: 'paradox', type: '💥 Реальный парадокс', hook: `Официальные заявления о «${shortTitle}» полностью противоречат реальной картине на земле.` },
    { id: 'stakes', type: '🧠 Ставки и цена', hook: `Цена решений вокруг сюжета с «${shortTitle}» оказалась несоизмеримо выше первоначальных расчетов.` },
    { id: 'turning_point', type: '⚡ Точка невозврата', hook: `События вокруг «${shortTitle}» запустили цепную реакцию, которую уже невозможно остановить.` },
    { id: 'fact', type: '🔍 Неудобный факт', hook: `Главная деталь в истории с «${shortTitle}», которую тщательно обходят кремлевские спикеры.` },
  ] : [
    { id: 'paradox', type: '💥 Парадокс реальности', hook: `Грандиозная спецоперация вокруг «${shortTitle}» разбилась о суровую реальность и законы логики.` },
    { id: 'satire', type: '🎭 Едкая ирония', hook: `Очередной кремлевский «хитрый план» с «${shortTitle}» вновь обернулся публичным конфузом.` },
    { id: 'scene', type: '🎬 Меткий образ', hook: `Пока пропаганда празднует величие, ситуация вокруг «${shortTitle}» стремительно выходит из-под контроля.` },
    { id: 'diagnosis', type: '⚡ Политический диагноз', hook: `История с «${shortTitle}» наглядно обнажает фатальную системную ошибку всей властной вертикали.` },
    { id: 'punch', type: '🎯 Точный панчлайн', hook: `Попытка спасти лицо в сюжете с «${shortTitle}» лишь быстрее приближает закономерный финал.` },
  ];
}

router.post('/api/generate-hooks', async (req, res) => {
  try {
    const { title = '', summary = '', text = '', style = 'golubuzki', tone = 'grotesque' } = req.body;
    if (!title && !text) {
      return res.status(400).json({ success: false, error: 'Title or text required' });
    }
    const hooks = await generateYouTubeHooks(title, summary, text, style, tone);
    res.json({ success: true, hooks });
  } catch (err) {
    console.error('Hooks generation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
