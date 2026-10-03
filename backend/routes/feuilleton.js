import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrapeArticleText } from '../services/articleScraperService.js';
import { YOUTUBE_STYLES } from '../services/youtubeStyles.js';
import { getConceptInfo } from '../services/youtubeFactsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const MODELS = { gemini: 'google/gemini-2.5-flash', deepseek: 'deepseek/deepseek-chat' };

const STYLES = {
  golubuzki: { file: 'golubuzki_style.txt', label: '🎭 Алексей Голобуцкий', focus: 'Едкая сатира, смех как оружие, деконструкция лжи врага.' },
  clickbait: { file: 'clickbait_style.txt', label: '🔥 Кликбейт & YouTube Топ (CTR 20%+)', focus: 'Ультра-вирусный темп, шок-фактор, открытые петли.' },
  kasjanov: { file: 'kasjanov_style.txt', label: '🪖 Юрий Касьянов', focus: 'Военно-инженерный реализм, аналитика ТТХ, логистики и тактики.' },
  klimovski: { file: 'klimovski_style.txt', label: '🔬 Юрий Климовский', focus: 'Клинический геополитический реализм, анатомия решений Кремля.' },
  gibrid: { file: 'gibrid_style.txt', label: '⚡ Гибридный стиль (3 в 1)', focus: 'Синтез сатиры Голобуцкого, военного реализма и геополитики.' },
  short_sarcasm: { file: 'short_sarcasm_style.txt', label: '⚡ Хлесткий Сарказм & Короткий Рассказчик', focus: 'Простой, впечатляющий, ультра-динамичный сторителлинг с едким сарказмом и мощным хуком.' },
};

export function extractFactsListFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (trimmed.length < 30) return [];

  // 1. Поиск структурированных пунктов ("1. 🌟 Заголовок\nТекст" или "ФАКТ 1: Заголовок\nТекст" или "1. Заголовок: Текст")
  const numberedBlocks = trimmed.split(/(?=(?:^|\n)(?:\d+[\.\)]\s*(?:🌟\s*)?|ФАКТ\s*\d+|ТЕЗИС\s*\d+|ПУНКТ\s*\d+|ДЕТАЛЬ\s*\d+|ВЫВОД\s*\d+|СИГНАЛ\s*\d+))/i)
    .map(b => b.trim())
    .filter(b => b.length > 15 && /^(?:\d+[\.\)]|ФАКТ|ТЕЗИС|ПУНКТ|ДЕТАЛЬ|ВЫВОД|СИГНАЛ)/i.test(b));

  if (numberedBlocks.length >= 3) {
    return numberedBlocks.map((block, idx) => {
      const cleanBlock = block.replace(/^(?:\d+[\.\)]\s*(?:🌟\s*)?|(?:ФАКТ|ТЕЗИС|ПУНКТ|ДЕТАЛЬ|ВЫВОД|СИГНАЛ)\s*\d+[:.\s-]*)/i, '').trim();
      const lines = cleanBlock.split('\n').map(l => l.trim()).filter(Boolean);
      const firstLine = lines[0] || '';
      let title = firstLine.replace(/^\[|\]$/g, '');
      let desc = lines.slice(1).join(' ');
      if (firstLine.includes(':') && !desc) {
        const parts = firstLine.split(':');
        title = parts[0].trim();
        desc = parts.slice(1).join(':').trim();
      }
      return { id: idx + 1, title: title || `Пункт ${idx + 1}`, text: desc || title };
    });
  }

  // 2. Поиск пунктов в формате "Заголовок: Описание" через двойные переносы строк
  const paragraphBlocks = trimmed.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 20 && p.includes(':'));

  if (paragraphBlocks.length >= 3) {
    return paragraphBlocks.map((p, idx) => {
      const colonIdx = p.indexOf(':');
      const title = p.slice(0, colonIdx).trim().replace(/^[-*•\d.\s]+/, '');
      const desc = p.slice(colonIdx + 1).trim();
      return { id: idx + 1, title: title || `Пункт ${idx + 1}`, text: desc || title };
    });
  }

  return [];
}

export function buildStyledFeuilletonPrompt(newsTitle, newsSummary = '', styleKey = 'golubuzki', tone = 'grotesque', conceptType = 'facts', explicitFacts = null, scriptFormat = 'facts', customWord = '', customPrompt = '') {
  const isNarrativeFormat = scriptFormat === 'feuilleton' || scriptFormat === 'narrative'; // Режим цельного фельетона без нумерации и счета вслух (narrative format)
  const concept = getConceptInfo(conceptType, customWord);
  const extractedFacts = (Array.isArray(explicitFacts) && explicitFacts.length > 0)
    ? explicitFacts
    : extractFactsListFromText(newsSummary);

  const hasExtractedFacts = extractedFacts.length >= 3;
  const factsCount = hasExtractedFacts ? extractedFacts.length : 10;

  let wordCountTarget = '400–550 слов (~3 мин.)';
  if (factsCount >= 15) {
    wordCountTarget = '800–1100 слов (~5–7 минут детального разбора)';
  } else if (factsCount >= 11) {
    wordCountTarget = '550–750 слов (~4–5 минут детального разбора)';
  } else if (factsCount >= 7) {
    wordCountTarget = '420–580 слов (~3–4 минуты озвучки)';
  } else if (factsCount >= 3) {
    wordCountTarget = '350–480 слов (~2.5–3.5 минуты озвучки)';
  }

  const isNonPolitical = ['psychology', 'scipop', 'mystery', 'tech_future', 'storytelling', 'life', 'psikh'].includes(styleKey) ||
    (/(?:психолог|манипуляц|мозг\b|отношен|тест\s+глаз|сон\b|памят|самооценк|уловк)/i.test(newsTitle) && !/(?:всу\b|минобороны|путин|трамп|кремл|зеленск|дрон|обстрел|снаряд|оккупац)/i.test(newsTitle));

  if (YOUTUBE_STYLES[styleKey]) {
    const ytCfg = YOUTUBE_STYLES[styleKey];
    let ytSys = ytCfg.systemInstruction;
    if (hasExtractedFacts) {
      if (isNarrativeFormat) {
        ytSys = ytSys.replace(/\(СТРОГО 400–550 слов\)/g, `(ОБЪЕМ: ${wordCountTarget}, ЦЕЛЬНЫЙ ЗАХВАТЫВАЮЩИЙ РАССКАЗ/ФЕЛЬЕТОН БЕЗ СЧЕТА И НУМЕРАЦИИ ВСЛУХ, НА ОСНОВЕ ВСЕХ ${factsCount} ТЕМ)`);
      } else {
        ytSys = ytSys.replace(/\(СТРОГО 400–550 слов\)/g, `(ОБЪЕМ: ${wordCountTarget}, ОБЯЗАТЕЛЬНО ХУК С ОБЪЯВЛЕНИЕМ ${factsCount} ${concept.labelPlural.toUpperCase()}, СЧЕТ ВСЛУХ И РАЗБОР ВСЕХ ${factsCount} ПУНКТОВ)`);
      }
    }

    const factsPrompt = hasExtractedFacts
      ? (isNarrativeFormat
        ? `\n═══════════════════════════════════════════════════════════════════\n` +
          `📌 СПИСОК ИЗ ${factsCount} КЛЮЧЕВЫХ ${concept.headerWord}, КОТОРЫЕ ДОЛЖНЫ БЫТЬ ПОЛНОСТЬЮ ВПЛЕТЕНЫ В СЮЖЕТ И РАССКАЗ СЦЕНАРИЯ (БЕЗ СЧЕТА ВСЛУХ):\n` +
          extractedFacts.map((f, i) => `${concept.labelSingle.toUpperCase()} ${i + 1}: [${f.title}] ➜ ${f.text}`).join('\n\n') +
          `\n═══════════════════════════════════════════════════════════════════\n` +
          `🚨 СТРОЖАЙШИЕ ТРЕБОВАНИЯ ПО СЦЕНАРИЮ (ЦЕЛЬНЫЙ ТЕКСТ / БЕЗ СЧЕТА ВСЛУХ):\n` +
          `1. 🎯 МОЩНЫЙ ХУК В САМОМ НАЧАЛЕ (ПЕРВОЕ ПРЕДЛОЖЕНИЕ): Первое предложение сразу вскрывает парадокс или интригу темы (БЕЗ объявления номеров и БЕЗ приветствий)!\n` +
          `2. 🎭 ЦЕЛЬНЫЙ СВЯЗНЫЙ ТЕКСТ (БЕЗ НУМЕРАЦИИ И БЕЗ СЧЕТА ВСЛУХ): КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО говорить «Факт первый», «Пункт номер два». Текст льется как единый захватывающий монолог/рассказ!\n` +
          `3. Текст ОБЯЗАН органично раскрыть все ключевые детали и механизмы из переданного списка без выдумок!\n`
        : `\n═══════════════════════════════════════════════════════════════════\n` +
          `📌 СПИСОК ИЗ ${factsCount} КЛЮЧЕВЫХ ${concept.headerWord}, КОТОРЫЕ ОБЯЗАТЕЛЬНО ДОЛЖНЫ БЫТЬ ПРОНУМЕРОВАНЫ ВСЛУХ И ПОДРОБНО ОБЪЯСНЕНЫ В СЦЕНАРИИ:\n` +
          extractedFacts.map((f, i) => `${concept.labelSingle.toUpperCase()} ${i + 1}: [${f.title}] ➜ ${f.text}`).join('\n\n') +
          `\n═══════════════════════════════════════════════════════════════════\n` +
          `🚨 СТРОЖАЙШИЕ ТРЕБОВАНИЯ ПО СЦЕНАРИЮ:\n` +
          `1. 🎯 ОБЯЗАТЕЛЬНЫЙ ХУК В САМОМ НАЧАЛЕ (ПЕРВОЕ ПРЕДЛОЖЕНИЕ): Диктор ОБЯЗАН в первых же словах заявить мощный хук и ПРЯМО ОБЪЯВИТЬ ТЕМУ И РОВНО ${factsCount} ${concept.headerWord}: например, «Вот ${factsCount} ${concept.hookWord} на тему [Тема]...», «Сегодня разберем ${factsCount} ${concept.labelPlural} о [Тема]...»!\n` +
          `2. 🔢 ОБЯЗАТЕЛЬНАЯ НУМЕРАЦИЯ ВСЛУХ (СЧЕТ КАЖДОГО ПУНКТА ОТ 1 ДО ${factsCount}): Диктор ОБЯЗАН четко проговаривать номер каждого пункта («${concept.labelSingle} первый: ...», «${concept.labelSingle} номер два: ...», ..., «${concept.labelSingle} номер ${factsCount}: ...»)!\n` +
          `3. Текст ОБЯЗАН последовательно назвать и подробно раскрыть КАЖДЫЙ ИЗ ВСЕХ ${factsCount} пунктов без пропуска!\n`
        )
      : '';

    const customPromptInstruction = customPrompt && customPrompt.trim()
      ? `\n🎯 ДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ АВТОРА (ОБЯЗАТЕЛЬНО УЧЕСТЬ ПРИ НАПИСАНИИ):\n"""\n${customPrompt.trim()}\n"""\n`
      : '';

    return {
      systemInstruction: ytSys + customPromptInstruction,
      userInstruction: `ТЕМА: ${newsTitle}\n${factsPrompt}\n${customPromptInstruction}МАТЕРИАЛ:\n"""\n${newsSummary || ''}\n"""\n\nСоздай сценарий (${wordCountTarget}) в стиле «${ytCfg.name}» без приветствий:`,
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
  const roleName = isNonPolitical
    ? 'ведущий эксперт-популяризатор и автор захватывающего научно-популярного канала ChaosChronicle'
    : (isAnalytics ? 'глубокий военный и политический аналитик канала ChaosChronicle' : 'ведущий сатирический колумнист и аналитик канала ChaosChronicle');

  const textGenre = isNonPolitical
    ? `захватывающий видео-разбор (${wordCountTarget})`
    : (isAnalytics ? `увлекательный аналитический обзор (${wordCountTarget})` : `яркий фельетон (${wordCountTarget})`);

  const hookRule = (!isNarrativeFormat && hasExtractedFacts)
    ? `2. 🎯 ОБЯЗАТЕЛЬНЫЙ ХУК В САМОМ НАЧАЛЕ (ПЕРВОЕ ПРЕДЛОЖЕНИЕ): Диктор ОБЯЗАН в первых же словах заявить мощный хук и ПРЯМО ОБЪЯВИТЬ ТЕМУ И РОВНО ${factsCount} ${concept.headerWord}: например, «Вот ${factsCount} ${concept.hookWord} на тему [Тема]...», «Сегодня разберем ${factsCount} ${concept.labelPlural} о [Тема]...» или «${factsCount} поразительных ${concept.labelPlural}, которые объясняют [Тема]...»!`
    : isAnalytics
    ? '2. 🎯 ПЕРВЫЕ 3 СЕКУНДЫ (СИЛЬНЫЙ АНАЛИТИЧЕСКИЙ ХУК): Первое предложение (7–12 слов) ОБЯЗАНО вскрывать скрытую суть события!'
    : '2. 💥 ПЕРВЫЕ 3 СЕКУНДЫ (ВЗРЫВНОЙ ХУК): Первое предложение (7–12 слов) ОБЯЗАНО быть парадоксальным столкновением противоположностей!';

  const coreRule = (!isNarrativeFormat && hasExtractedFacts)
    ? `3. 🔢 ОБЯЗАТЕЛЬНАЯ НУМЕРАЦИЯ ВСЛУХ (СЧЕТ КАЖДОГО ПУНКТА ОТ 1 ДО ${factsCount}): Диктор ОБЯЗАН четко проговаривать номер каждого пункта перед его разбором (например: «${concept.labelSingle} первый: ...», «${concept.labelSingle} номер два: ...», ..., «${concept.labelSingle} номер ${factsCount}: ...»)! Зритель должен слышать точный счет всех ${factsCount} пунктов без исключения.`
    : isAnalytics
    ? '3. 🧠 УВЛЕКАТЕЛЬНЫЙ АНАЛИЗ (ЦЕЛЬНЫЙ ТЕКСТ): Раскрывай причинно-следственные связи, ставки и мотивы единым связным текстом. БЕЗ объявления пунктов вслух, БЕЗ цирка и кричащего гротеска!'
    : '3. 🎬 ВИЗУАЛЬНЫЙ ГРОТЕСК И МЕТАФОРЫ-МЕМЫ (ЦЕЛЬНЫЙ ФЕЛЬЕТОН): Создавай единую сатирическую историю с 2–3 кинематографичными сценами, вплетая факты в единую драматургию БЕЗ произнесения номеров пунктов!';

  let focusDesc = styleConfig.focus;
  if (isNonPolitical) {
    focusDesc = 'Глубокий, интригующий и психологически точный разбор всех приемов, механизмов мозга и поведения людей с яркими примерами.';
  } else if (isAnalytics) {
    if (styleKey === 'kasjanov') focusDesc = 'Военно-инженерный реализм Касьянова: анализ ТТХ, тактики БПЛА, РЭБ, ПВО и логистики.';
    else if (styleKey === 'klimovski') focusDesc = 'Геополитический реализм Климовского: анатомия теневых решений, клановые интересы.';
    else if (styleKey === 'golubuzki') focusDesc = 'Острая политическая публицистика Голобуцкого: деконструкция пропаганды, факты и анализ.';
    else if (styleKey === 'gibrid') focusDesc = 'Синтез военно-технического (Касьянов) и геополитического (Климовский) анализа.';
  }

  const systemPosition = isNonPolitical
    ? 'ФОКУС: Научно-популярный и психологический анализ. Раскрывай реальные психологические механизмы, трюки восприятия и поведение людей.'
    : 'СТРОГАЯ ПОЗИЦИЯ: СТРОГО НА СТОРОНЕ УКРАИНЫ. Вскрывай кремлевскую пропаганду, ложь властей РФ и военную агрессию.';

  const systemInstruction = `Ты — ${roleName}. Напиши ${textGenre} на русском языке для видео.
${systemPosition}
АВТОРСКИЙ СТИЛЬ: ${styleConfig.label} (${isNonPolitical ? 'НАУЧПОП & ПСИХОЛОГИЯ' : (isAnalytics ? 'РЕЖИМ АНАЛИТИКИ' : 'РЕЖИМ САТИРЫ')})
ГЛАВНЫЙ ФОКУС: ${focusDesc}
${styleGuide && !isAnalytics && !isNonPolitical ? `\nПОДРОБНОЕ РУКОВОДСТВО ПО СТИЛЮ:\n${styleGuide}\n` : ''}
СТРОЖАЙШИЕ ПРАВИЛА ДЛЯ АУДИО-ОЗВУЧКИ (TTS):
0. 🔒 ГЛАВНОЕ И НЕЗЫБЛЕМОЕ ПРАВИЛО (100% ОПОРА НА СОХРАНЕННЫЙ ОРИГИНАЛ): Сценарий ОБЯЗАН СТРОГО И ПОЛНОСТЬЮ основываться на предоставленном тексте оригинальной новости / сохраненных фактах (ИСХОДНЫЙ МАТЕРИАЛ). Запрещено заменять тему или придумывать посторонние сюжеты. Все события, факты, тезисы, аргументы и примеры берутся ИСКЛЮЧИТЕЛЬНО из переданного материала!
1. ПИШИ ТОЛЬКО ЧИСТЫЙ ПРОИЗНОСИМЫЙ ТЕКСТ ДИКТОРА (${wordCountTarget}).
${hookRule}
${coreRule}
4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО начинать с приветствий («Привет, друзья!», «С вами ChaosChronicle»).
5. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать заголовки блоков («**Блок 1**»), тайминги, плейсхолдеры [B-Roll:...], концовки «Работаем дальше. Без иллюзий.».
${(!isNarrativeFormat && hasExtractedFacts) ? `6. ОБЯЗАТЕЛЬНО раскрой и понятно объясни КАЖДЫЙ из ВСЕХ ${factsCount} ${concept.labelPlural} по порядку от 1-го до ${factsCount}-го с четким голосовым счетом!` : '6. Веди повествование динамично и связно как единую драматургическую историю!'}${customPrompt && customPrompt.trim() ? `\n7. 🎯 ДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ АВТОРА (ОБЯЗАТЕЛЬНО УЧЕСТЬ): ${customPrompt.trim()}` : ''}`;

  const formattedFactsList = hasExtractedFacts
    ? extractedFacts.map((f, i) => `${concept.labelSingle.toUpperCase()} ${i + 1}: [${f.title}] ➜ ${f.text}`).join('\n\n')
    : newsSummary;

  const customPromptBlock = customPrompt && customPrompt.trim()
    ? `\n🎯 ДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ И ПОЖЕЛАНИЯ АВТОРА К ТЕКСТУ (ОБЯЗАТЕЛЬНО УЧТИ ИХ):\n"""\n${customPrompt.trim()}\n"""\n`
    : '';

  const userInstruction = (!isNarrativeFormat && hasExtractedFacts)
    ? `ТЕМА: ${newsTitle}\nРОВНО ${factsCount} КЛЮЧЕВЫХ ${concept.headerWord} ДЛЯ РАЗБОРА:\n"""\n${formattedFactsList}\n"""${customPromptBlock}\n\nСоздай сценарий (${wordCountTarget}) в стиле ${styleConfig.label}. ОБЯЗАТЕЛЬНО начни с хука с объявлением ${factsCount} ${concept.labelPlural} на тему, а затем четко отсчитай и подробно объясни КАЖДЫЙ из ВСЕХ ${factsCount} пунктов («${concept.labelSingle} первый: ...», «${concept.labelSingle} номер два: ...», ..., «${concept.labelSingle} номер ${factsCount}: ...»):`
    : hasExtractedFacts
    ? `ТЕМА: ${newsTitle}\nМАТЕРИАЛ И ${factsCount} КЛЮЧЕВЫХ ТЕМ ДЛЯ ФЕЛЬЕТОНА/ОБЗОРА:\n"""\n${formattedFactsList}\n"""${customPromptBlock}\n\nНапиши ЦЕЛЬНЫЙ ${isAnalytics ? 'аналитический обзор' : 'сатирический фельетон'} (${wordCountTarget}) в стиле ${styleConfig.label}. Вплети все факты и механизмы в единый связный рассказ (БЕЗ счета вслух, БЕЗ «Факт 1», «Пункт 2», сразу начиная с мощного хука без приветствий):`
    : isAnalytics
    ? `ТЕМА: ${newsTitle}\nФАКТЫ: ${newsSummary || ''}${customPromptBlock}\n\nНапиши увлекательный аналитический текст в стиле ${styleConfig.label} простым языком (БЕЗ приветствий, сразу с сути):`
    : `ТЕМА НОВОСТИ: ${newsTitle}\nКОНТЕКСТ/ФАКТЫ: ${newsSummary || ''}${customPromptBlock}\n\nНапиши монолог фельетона в стиле ${styleConfig.label} с яркими метафорами и парадоксальным хуком (БЕЗ приветствий):`;

  return { systemInstruction, userInstruction, factsCount, hasExtractedFacts };
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

export async function generateGolubuzkiTitle(newsTitle, newsSummary = '', monologueText = '', tone = 'satire', style = 'golubuzki', keywords = '') {
  const textContext = monologueText && monologueText.trim() ? monologueText.slice(0, 1200) : (newsSummary || newsTitle);
  const isAnalytics = tone === 'analytics';
  const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(style);
  const hasKeywords = Boolean(keywords && keywords.trim());
  const cleanKeywords = hasKeywords ? keywords.trim() : '';

  const kwReq = hasKeywords ? ` ОБЯЗАТЕЛЬНО включи ключевые слова "${cleanKeywords}" в заголовок!` : '';
  const sysPrompt = isYt
    ? `Ты — ведущий YouTube-продюсер. Создай 1 ЗАХВАТЫВАЮЩИЙ заголовок по теме (СТРОГО 4-6 СЛОВ, UPPERCASE). Главная суть/интрига. БЕЗ политики и сатиры.${kwReq}`
    : isAnalytics
    ? `Ты — военный аналитик ChaosChronicle. Создай 1 МОЩНЫЙ АНАЛИТИЧЕСКИЙ YouTube-заголовок (СТРОГО 4-6 СЛОВ, UPPERCASE). Серьезный диагноз и нерв темы. БЕЗ клоунады.${kwReq}`
    : `Ты — мастер острой сатиры. Создай 1 ХЛЕСТКИЙ сатирический YouTube-заголовок (СТРОГО 4-6 СЛОВ, UPPERCASE). Острый парадокс реальности. БЕЗ клоунады.${kwReq}`;
  const kwUser = hasKeywords ? `\nОБЯЗАТЕЛЬНЫЕ СЛОВА: "${cleanKeywords}"` : '';
  const userPrompt = `ТЕКСТ:\n"""\n${textContext}\n"""${kwUser}\n\nСоздай 1 заголовок из 4-6 слов капсом:`;

  try {
    const directTitle = await callGeminiDirect(sysPrompt, userPrompt, 1200);
    if (directTitle) {
      const clean = directTitle.replace(/["'«»`]/g, '').replace(/\.$/, '').trim();
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length >= 3 && words.length <= 8) return clean.toUpperCase();
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
          if (words.length >= 3 && words.length <= 8) return text.toUpperCase();
        }
      }
    } catch {}
  }
  const baseWords = (newsTitle || 'ГЛАВНАЯ НОВОСТЬ ДНЯ').split(/\s+/).slice(0, 4).join(' ').toUpperCase();
  return (hasKeywords ? `${cleanKeywords.toUpperCase()}: ${baseWords}` : baseWords);
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
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[b-roll:[^\]]*\]/gi, '')
    .replace(/\([0-9]+:[0-9]+[^)]*\)/g, '')
    .replace(/^(?:Диктор|Ведущий|Спикер|Текст|Сценарий):\s*/gmi, '')
    .replace(/^(Привет,?\s*друзья!?|Доброго\s+времени\s+суток!?[^.!?\n]*[.!?]|Здравствуйте,?\s*[^.!?\n]*[.!?]|Приветствую,?\s*[^.!?\n]*[.!?]|С\s+вами\s+ChaosChronicle[^.!?\n]*[.!?])\s*/gi, '')
    .replace(/\b(?:глубокая аналитика\s*(?:без гротеска)?|без гротеска)\b/gi, '')
    .replace(/\b(?:Разбор полетов|Глубокий разбор|Наш разбор)\b/gi, '')
    .replace(/(?:Работаем\s+дальше[.,!\s]*)+/gi, '')
    .replace(/(?:Без\s+иллюзий[.,!\s]*)+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

router.post('/api/generate-feuilleton', async (req, res) => {
  const { title, summary, model = 'gemini', source, style = 'golubuzki', tone = 'grotesque', conceptType = 'facts', customWord = '', scriptFormat = 'facts', customPrompt = '' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  let effectiveSummary = (summary || req.body.original_news || req.body.originalNews || req.body.sourceText || '').trim();
  const folderName = req.body.folderName || req.body.matchingPkg?.folderName || '';
  const bundleDir = req.body.bundleDir || req.body.matchingPkg?.bundleDir || '';
  if ((!effectiveSummary || effectiveSummary.length < 20) && (folderName || bundleDir)) {
    const targetDir = bundleDir || path.resolve(__dirname, '../../news', folderName);
    const srcFile = path.join(targetDir, 'source.txt'), origFile = path.join(targetDir, 'original_news.txt');
    if (fs.existsSync(srcFile)) {
      try { const d = fs.readFileSync(srcFile, 'utf-8').trim(); if (d.length > 50) effectiveSummary = d; } catch {}
    } else if (fs.existsSync(origFile)) {
      try { const d = fs.readFileSync(origFile, 'utf-8').trim(); if (d.length > 50) effectiveSummary = d; } catch {}
    }
  }

  const articleUrl = req.body.url || req.body.link || req.body.matchingPkg?.url || '';
  // Scrapen nur wenn kein eigener Text vorhanden ist ODER forceScrape explizit angefordert wurde (niemals gekürzten Nutzertext überschreiben!)
  if ((!effectiveSummary || req.body.forceScrape) && articleUrl && /^https?:\/\//i.test(articleUrl) && !articleUrl.includes('youtube.com') && !articleUrl.includes('youtu.be')) {
    try {
      const scraped = await scrapeArticleText(articleUrl);
      if (scraped && scraped.length > effectiveSummary.length) effectiveSummary = scraped;
    } catch {}
  }

  const modelId = MODELS[model] || MODELS.gemini;
  const explicitFacts = req.body.selectedFacts || req.body.facts || null;
  const { systemInstruction, userInstruction, factsCount, hasExtractedFacts } = buildStyledFeuilletonPrompt(title, effectiveSummary, style, tone, conceptType, explicitFacts, scriptFormat, customWord, customPrompt);

  try {
    let rawText = '';
    const maxAiTokens = factsCount >= 15 ? 7000 : (factsCount >= 10 ? 5500 : 4000);
    if (model === 'gemini') {
      try { rawText = await callGeminiDirect(systemInstruction, userInstruction, maxAiTokens); } catch {}
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
      scriptFormat,
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
        if (effectiveSummary && effectiveSummary.length > 20) {
          fs.writeFileSync(path.join(targetDir, 'source.txt'), effectiveSummary, 'utf-8');
          fs.writeFileSync(path.join(targetDir, 'original_news.txt'), effectiveSummary, 'utf-8');
        }
        if (explicitFacts && Array.isArray(explicitFacts) && explicitFacts.length > 0) {
          fs.writeFileSync(path.join(targetDir, 'facts.json'), JSON.stringify(explicitFacts, null, 2), 'utf-8');
          const factsFormatted = `📌 ИЗВЛЕЧЕННЫЕ КЛЮЧЕВЫЕ ${concept.headerWord} (${explicitFacts.length}):\n\n` +
            explicitFacts.map((f, i) => `${i + 1}. 🌟 ${f.title}\n${f.text}`).join('\n\n');
          fs.writeFileSync(path.join(targetDir, 'facts.txt'), factsFormatted, 'utf-8');
        } else if (req.body.clearCachedFacts) {
          try {
            if (fs.existsSync(path.join(targetDir, 'facts.json'))) fs.unlinkSync(path.join(targetDir, 'facts.json'));
            if (fs.existsSync(path.join(targetDir, 'facts.txt'))) fs.unlinkSync(path.join(targetDir, 'facts.txt'));
          } catch {}
        }
        const origSection = effectiveSummary ? `## 📝 Исходное сообщение\n${effectiveSummary}\n\n---\n\n` : '';
        fs.writeFileSync(path.join(targetDir, 'script.md'), `# 🎭 ${punchyTitle || title}\n\n---\n\n${origSection}## 🎬 Сценарий\n${text}\n`, 'utf-8');
        const jsonPath = path.join(targetDir, 'project.json');
        if (fs.existsSync(jsonPath)) {
          try {
            const m = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            m.word_count = words; m.style = style; m.scriptFormat = scriptFormat; m.text_updated_at = new Date().toISOString();
            if (effectiveSummary) {
              m.summary = effectiveSummary;
              m.original_news = effectiveSummary;
            }
            if (explicitFacts) {
              m.facts = explicitFacts;
              m.selectedFacts = explicitFacts;
            } else if (req.body.clearCachedFacts) {
              delete m.facts;
              delete m.selectedFacts;
            }
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

export async function generateYouTubeHooks(newsTitle, newsSummary = '', scriptText = '', styleKey = 'golubuzki', tone = 'grotesque', requiredWords = '') {
  const context = scriptText && scriptText.trim() ? scriptText.slice(0, 1200) : (newsSummary || newsTitle);
  const isAnalytics = tone === 'analytics' || styleKey === 'analytics';
  const reqWordsText = requiredWords && requiredWords.trim() ? `\nОБЯЗАТЕЛЬНЫЕ КЛЮЧЕВЫЕ СЛОВА: "${requiredWords.trim()}". Каждый вариант хука ОБЯЗАТЕЛЬНО должен органично включать эти слова!` : '';

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

  const userInst = `ТЕМА: ${newsTitle}\nКОНТЕКСТ:\n"""\n${context}\n"""${reqWordsText}\n\nСоздай 5 хуков в формате JSON:`;

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
  const extraWord = requiredWords && requiredWords.trim() ? ` (${requiredWords.trim()})` : '';
  return isAnalytics ? [
    { id: 'intrigue', type: '🎯 Скрытая суть', hook: `За внешним шумом вокруг «${shortTitle}»${extraWord} скрывается ключевой сдвиг, меняющий правила игры.` },
    { id: 'paradox', type: '💥 Реальный парадокс', hook: `Официальные заявления о «${shortTitle}»${extraWord} полностью противоречат реальной картине на земле.` },
    { id: 'stakes', type: '🧠 Ставки и цена', hook: `Цена решений вокруг сюжета с «${shortTitle}»${extraWord} оказалась несоизмеримо выше первоначальных расчетов.` },
    { id: 'turning_point', type: '⚡ Точка невозврата', hook: `События вокруг «${shortTitle}»${extraWord} запустили цепную реакцию, которую уже невозможно остановить.` },
    { id: 'fact', type: '🔍 Неудобный факт', hook: `Главная деталь в истории с «${shortTitle}»${extraWord}, которую тщательно обходят кремлевские спикеры.` },
  ] : [
    { id: 'paradox', type: '💥 Парадокс реальности', hook: `Грандиозная спецоперация вокруг «${shortTitle}»${extraWord} разбилась о суровую реальность и законы логики.` },
    { id: 'satire', type: '🎭 Едкая ирония', hook: `Очередной кремлевский «хитрый план» с «${shortTitle}»${extraWord} вновь обернулся публичным конфузом.` },
    { id: 'scene', type: '🎬 Меткий образ', hook: `Пока пропаганда празднует величие, ситуация вокруг «${shortTitle}»${extraWord} стремительно выходит из-под контроля.` },
    { id: 'diagnosis', type: '⚡ Политический диагноз', hook: `История с «${shortTitle}»${extraWord} наглядно обнажает фатальную системную ошибку всей властной вертикали.` },
    { id: 'punch', type: '🎯 Точный панчлайн', hook: `Попытка спасти лицо в сюжете с «${shortTitle}»${extraWord} лишь быстрее приближает закономерный финал.` },
  ];
}

router.post('/api/generate-hooks', async (req, res) => {
  try {
    const { title = '', summary = '', text = '', style = 'golubuzki', tone = 'grotesque', requiredWords = '' } = req.body;
    if (!title && !text) {
      return res.status(400).json({ success: false, error: 'Title or text required' });
    }
    const hooks = await generateYouTubeHooks(title, summary, text, style, tone, requiredWords);
    res.json({ success: true, hooks });
  } catch (err) {
    console.error('Hooks generation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
