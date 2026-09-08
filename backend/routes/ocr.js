import express from 'express';

const router = express.Router();

function extractJson(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// POST /api/news/ocr - Распознавание новости со скриншота через Gemini Vision
router.post('/api/news/ocr', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Изображение не передано' });
    }

    let mimeType = 'image/jpeg';
    let base64Data = imageBase64;
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      base64Data = parts[1];
    }

    const systemPrompt = `Ты — ведущий редактор новостей и OCR-аналитик.
Посмотри на скриншот (YouTube, Telegram, Twitter/X, веб-сайт, новостная лента).
Твоя задача — извлечь новостной сюжет в формате строгого JSON:
{
  "title": "Хлесткий и емкий заголовок новости на русском языке (6-10 слов)",
  "summary": "Полный текст новости, цитата или факты со скриншота на русском языке",
  "source": "Имя автора, канала или издания (например: varlamov, The Breakfast Show, Meduza и т.п.)",
  "category": "одна из рубрик: absurd, rossija, politika, mir, ekonomika, tekh, kultura"
}

КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать от первого лица ("мы", "я").
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать слова: "Разбираем", "Анализируем", "Разбор", "Глубокая аналитика", "Без гротеска".
Отвечай ТОЛЬКО чистым валидным JSON без markdown-блоков!`;

    const userPrompt = 'Извлеки новость, текст и источник из этого скриншота в JSON:';

    let rawText = '';
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Прямой вызов Google Gemini 2.5 Flash Vision
    if (geminiKey && !geminiKey.includes('HIER')) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const gRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: userPrompt }
              ]
            }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1200 }
          }),
          signal: AbortSignal.timeout(20000)
        });

        if (gRes.ok) {
          const gData = await gRes.json();
          rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.warn('Gemini Vision direct error:', await gRes.text());
        }
      } catch (gErr) {
        console.warn('Gemini Vision direct error:', gErr.message);
      }
    }

    // 2. Fallback через OpenRouter
    if (!rawText) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (apiKey && !apiKey.includes('HIER')) {
        try {
          const oRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: systemPrompt },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: userPrompt },
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
                  ]
                }
              ],
              max_tokens: 1200,
              temperature: 0.2
            }),
            signal: AbortSignal.timeout(25000)
          });

          if (oRes.ok) {
            const oData = await oRes.json();
            rawText = oData.choices?.[0]?.message?.content || '';
          }
        } catch (oErr) {
          console.warn('OpenRouter Vision error:', oErr.message);
        }
      }
    }

    const parsed = extractJson(rawText);
    if (!parsed || !parsed.title) {
      return res.status(422).json({
        success: false,
        error: 'Не удалось распознать текст новости со скриншота. Попробуйте ввести вручную.',
        raw: rawText
      });
    }

    return res.json({
      success: true,
      data: {
        title: parsed.title.trim(),
        summary: (parsed.summary || '').trim(),
        source: (parsed.source || 'Скриншот').trim(),
        category: parsed.category || 'absurd'
      }
    });
  } catch (err) {
    console.error('OCR Controller error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
