import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function callGeminiDirect(systemInstruction, userInstruction, maxTokens = 6000) {
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
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch {
    return null;
  }
}

async function callOpenRouterFallback(systemInstruction, userInstruction) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey || openRouterKey.includes('HIER')) return null;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://chaoschronicle.local',
        'X-Title': 'ChaosChronicle YouTube Facts',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userInstruction },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return null;
  }
}

export async function extractTwentyFactsFromTranscript(transcriptText = '', title = '') {
  if (!transcriptText || transcriptText.trim().length < 50) {
    throw new Error('Текст транскрипта слишком короткий для анализа фактов');
  }

  const cleanText = transcriptText.slice(0, 65000);
  const sysPrompt = `Ты — ведущий шеф-редактор и продюсер YouTube-канала Chaos Chronicle.
Твоя задача — внимательно изучить транскрипт длинного разговора/интервью и извлечь РОВНО 20 САМЫХ ИНТЕРЕСНЫХ, ШОКИРУЮЩИХ, НАУЧНЫХ ИЛИ ПАРАДОКСАЛЬНЫХ ФАКТОВ/ТЕМ.
Каждый факт должен быть самостоятельным и понятным зрителю.
СТРОЖАЙШЕ ЗАПРЕЩЕНО:
- Упоминать имена ведущих, интервьюеров и гостей (никаких "доктор", "гость сказал", "ведущий спросил").
- Писать пустые общие фразы. Пиши суть факта, парадокса, механизма или исторического события!

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "facts": [
    {
      "id": 1,
      "title": "Короткий хлесткий заголовок (3-6 слов)",
      "text": "Суть факта в 1-2 емких предложениях с конкретными деталями и парадоксом."
    }
  ]
}`;

  const userPrompt = `ВИДЕО: "${title || 'Запись разговора'}"

ТРАНСКРИПТ РАЗГОВОРА:
"""
${cleanText}
"""

Найди и сформулируй РОВНО 20 самых сильных фактов/тем в формате JSON:`;

  let rawJson = await callGeminiDirect(sysPrompt, userPrompt, 7000);
  if (!rawJson) {
    rawJson = await callOpenRouterFallback(sysPrompt, userPrompt);
  }

  if (!rawJson) {
    throw new Error('Не удалось получить ответ от ИИ для извлечения фактов');
  }

  try {
    const cleaned = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    let facts = Array.isArray(parsed?.facts) ? parsed.facts : (Array.isArray(parsed) ? parsed : []);

    facts = facts.map((f, idx) => ({
      id: f.id || idx + 1,
      title: String(f.title || `Факт #${idx + 1}`).trim(),
      text: String(f.text || '').trim(),
    })).filter(f => f.title && f.text);

    return facts.slice(0, 20);
  } catch (err) {
    throw new Error(`Ошибка разбора JSON фактов: ${err.message}`);
  }
}
