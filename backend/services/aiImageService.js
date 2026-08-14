import fs from 'fs';
import path from 'path';

export async function generate4CornerAiPrompt(title, scriptText, availablePhotos = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) {
    return `Dark cinematic editorial news photo representing ${title}, dramatic atmospheric smoke, high resolution photorealism 8k, edge to edge continuous composition.`;
  }

  const systemPrompt = `You are an elite visual art director for 16:9 cinematic news editorial thumbnails.
Your task: Create a detailed English image prompt for Google Gemini / FLUX image generation.
KEY REQUIREMENTS:
1. The image must be ONE single unified dark cinematic photo capturing the emotional weight and key subject of the news story. A single powerful, atmospheric scene.
2. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS, NO HEADLINES, NO CAPTIONS, NO WATERMARKS, NO LOGOS.
3. ABSOLUTELY NO WHITE SPACES, NO EMPTY GAPS, NO BORDERS, NO MARGINS, NO FRAMES, NO GRID LINES, NO WHITE DIVIDERS, NO SPLIT COLLAGES. The entire 16:9 canvas must be 100% filled edge-to-edge with continuous rich cinematic photography, smoke, dark moody lighting, and environmental atmosphere.
Output ONLY the raw prompt in English, with dramatic lighting, 8k resolution, photorealistic news reportage style. No quotes or explanations.`;

  const userPrompt = `News headline: ${title}
Context/Story summary: ${scriptText.slice(0, 500)}
Key real photo elements: ${availablePhotos.join(', ')}

Create ONE single unified dark cinematic editorial photo prompt in English:`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const data = await res.json();
      const prompt = data.choices?.[0]?.message?.content?.trim();
      if (prompt && prompt.length > 20) {
        console.log(`🎨 Single Dark Cinematic Prompt erstellt:\n${prompt}`);
        return prompt;
      }
    }
  } catch (err) {
    console.warn('AI Prompt Generierung fehlgeschlagen:', err.message);
  }

  return `Dark dramatic cinematic editorial news photography of ${title}, atmospheric smoke, volumetric lighting, photorealistic 8k, edge to edge composition.`;
}

export async function generateGeminiImage(promptEn) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) return null;

  const models = [
    'google/gemini-2.5-flash-image',
    'google/gemini-2.0-flash-exp:free',
    'google/imagen-3',
  ];

  for (const model of models) {
    try {
      console.log(`🤖 Versuche Google Image Generierung via ${model}...`);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: `Generate a 16:9 widescreen cinematic editorial photo: ${promptEn}. Edge to edge, completely filled, no borders, no text.`
            }
          ],
          modalities: ['image', 'text'],
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const data = await res.json();
        const choice = data.choices?.[0];
        const images = choice?.message?.images;
        if (Array.isArray(images) && images.length > 0) {
          const imgUrl = images[0]?.image_url?.url || images[0]?.url || images[0];
          if (imgUrl && imgUrl.startsWith('data:image')) {
            const base64Str = imgUrl.split(',')[1];
            return Buffer.from(base64Str, 'base64');
          }
        }
      }
    } catch (err) {
      console.warn(`Gemini Image (${model}) Fehler:`, err.message);
    }
  }
  return null;
}
