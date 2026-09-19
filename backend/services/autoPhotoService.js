import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchBingPhotos, fetchDDGPhotos, fetchYandexPhotos } from './imageSearchService.js';
import { saveNewsPhotos } from './photoStorageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

// Generates photographic English search queries based on script/article text
export async function generate30VisualQueries(scriptText = '', title = '', count = 100) {
  return generateVisualQueries(scriptText, title, count);
}

export async function generateVisualQueries(scriptText = '', title = '', count = 100) {
  const targetCount = Math.max(5, Math.min(120, Number(count) || 100));
  // Ask AI for 40-50 thematic anchor queries if 100 requested, or up to targetCount
  const aiQueryCount = Math.min(60, targetCount);

  const systemPrompt = `You are an elite visual director and image researcher for documentary and news video production.
Your job: Analyze the provided script and generate EXACTLY ${aiQueryCount} distinct, highly specific, photographic image search queries in English (one per line).
These queries will be used to search for real photographs on Bing and DuckDuckGo to illustrate the video chronologically.

CRITICAL RULES:
1. Use English only (search engines return much higher quality photos for English terms).
2. Each query must be a realistic, specific photographic scene, action, scientific visual, location, or subject matching the text progression.
3. Keep queries concise (3 to 7 words). Examples: "human brain sleep eeg medical scan", "tired man look at alarm clock bedside", "pineal gland melatonin molecular diagram", "smartphone blue light bedroom dark bed", "morning sun light waking up bed".
4. DO NOT include generic buzzwords like "HD", "4K", "wallpaper", "stock photo", "concept", "illustration", "image", "photo".
5. Return EXACTLY ${aiQueryCount} lines. One query per line. NO numbers, NO bullets, NO quotes, NO introductory text.`;

  const userPrompt = `Headline: ${title}\n\nFull Script/Text:\n${(scriptText || title).slice(0, 4500)}`;

  let rawOutput = '';

  // 1. Direct Gemini 3.8 Flash
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.includes('HIER')) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const ans = parts.find(p => !p.thought && p.text) || parts[parts.length - 1];
        if (ans?.text) rawOutput = ans.text.trim();
      }
    } catch (e) {
      console.warn('Gemini direct visual queries generation error:', e.message);
    }
  }

  // 2. Fallback OpenRouter
  if (!rawOutput) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey && !apiKey.includes('HIER')) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 3000,
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(25000),
        });
        if (res.ok) {
          const data = await res.json();
          rawOutput = data.choices?.[0]?.message?.content?.trim() || '';
        }
      } catch (e) {
        console.warn('OpenRouter visual queries generation error:', e.message);
      }
    }
  }

  // Parse lines
  let queries = [];
  if (rawOutput) {
    queries = rawOutput
      .split('\n')
      .map(line => line.replace(/^[\d\s.\-*#•)"]+/, '').replace(/["]+$/g, '').trim())
      .filter(line => line.length >= 4 && !line.toLowerCase().startsWith('here are') && !line.toLowerCase().startsWith('sure'));
  }

  // Fallback if AI produced too few or failed
  if (queries.length < aiQueryCount) {
    const cleanTitle = title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, ' ').trim();
    const fallbackSentences = (scriptText || title)
      .split(/[.!?;\n]+/)
      .map(s => s.trim().replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, ''))
      .filter(s => s.split(/\s+/).length >= 3);

    for (const s of fallbackSentences) {
      if (queries.length >= aiQueryCount) break;
      const words = s.split(/\s+/).slice(0, 5).join(' ');
      if (!queries.includes(words)) queries.push(words);
    }

    while (queries.length < aiQueryCount) {
      queries.push(`${cleanTitle} scene ${queries.length + 1}`);
    }
  }

  return queries;
}

// Executes search for a single query across Bing and DDG
async function searchSingleQuery(query, engine = 'all') {
  try {
    if (engine === 'bing') {
      const b = await fetchBingPhotos(query);
      if (b?.length) return b;
    } else if (engine === 'ddg') {
      const d = await fetchDDGPhotos(query);
      if (d?.length) return d;
    } else if (engine === 'yandex') {
      const y = await fetchYandexPhotos(query);
      if (y?.length) return y;
    }

    const bingRes = await fetchBingPhotos(query);
    if (bingRes?.length) return bingRes;

    const ddgRes = await fetchDDGPhotos(query);
    if (ddgRes?.length) return ddgRes;

    const yanRes = await fetchYandexPhotos(query);
    if (yanRes?.length) return yanRes;

    return [];
  } catch {
    return [];
  }
}

// Helper to filter valid image URLs
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!/^https?:\/\//i.test(url)) return false;
  const lower = url.toLowerCase();
  if (lower.includes('avatar') || lower.includes('pixel') || lower.includes('tracker') || lower.includes('logo') || lower.includes('icon')) return false;
  if (lower.includes('youtube') || lower.includes('ytimg') || lower.includes('vimeo') || lower.includes('doubleclick')) return false;
  return /\.(jpg|jpeg|png|webp)/i.test(url);
}

// Downloads single image and converts to base64 Data URL with MD5 content hash
async function downloadImageAsDataUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 4000) return null; // Skip tiny pixels / icons
    let ext = url.match(/\.(jpg|jpeg|png|webp)/i)?.[1]?.toLowerCase() || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    return { dataUrl: `data:image/${ext};base64,${buf.toString('base64')}`, hash, size: buf.length };
  } catch {
    return null;
  }
}

// Downloads images concurrently in batches of 10 and rejects duplicate content by hash
async function downloadImagesInBatches(urls, targetCount = 100) {
  const downloaded = [];
  const seenHashes = new Set();
  const batchSize = 10;
  for (let i = 0; i < urls.length && downloaded.length < targetCount; i += batchSize) {
    const chunk = urls.slice(i, i + batchSize);
    const results = await Promise.all(chunk.map(u => downloadImageAsDataUrl(u)));
    for (const item of results) {
      if (item?.hash && !seenHashes.has(item.hash)) {
        seenHashes.add(item.hash);
        downloaded.push(item.dataUrl);
        if (downloaded.length >= targetCount) break;
      }
    }
  }
  return downloaded;
}

// Search and collect up to targetCount distinct photos
export async function searchPhotosForQueries(queries = [], targetCount = 100, engine = 'all') {
  const candidateUrls = [];
  const seenUrls = new Set();
  const pool = [];

  // Concurrency chunking (batches of 8)
  const batchSize = 8;
  for (let i = 0; i < queries.length; i += batchSize) {
    const chunk = queries.slice(i, i + batchSize);
    const chunkResults = await Promise.all(chunk.map(q => searchSingleQuery(q, engine)));

    const maxPerQuery = Math.max(3, Math.ceil(targetCount / Math.max(1, queries.length)));
    for (let j = 0; j < chunkResults.length; j++) {
      const results = chunkResults[j] || [];
      let queryHits = 0;

      for (const item of results) {
        const u = item?.image || item?.url;
        if (isValidImageUrl(u) && !seenUrls.has(u)) {
          seenUrls.add(u);
          pool.push(u);
          if (queryHits < maxPerQuery) {
            candidateUrls.push(u);
            queryHits++;
          }
        }
      }
    }
  }

  // Backfill from remaining pool if needed (extra buffer to compensate for duplicates discarded by hash)
  const maxCandidates = Math.max(targetCount + 50, Math.ceil(targetCount * 1.5));
  for (const u of pool) {
    if (candidateUrls.length >= maxCandidates) break;
    if (!candidateUrls.includes(u)) candidateUrls.push(u);
  }

  // Download concurrently up to targetCount valid image buffers
  console.log(`🖼️ [AutoPhotos] Lade bis zu ${targetCount} distinkte Bilder aus ${candidateUrls.length} Kandidaten...`);
  const readyDataUrls = await downloadImagesInBatches(candidateUrls, targetCount);

  return readyDataUrls;
}

// Main function: auto-fetch 100 photos for a package
export async function autoFetchPackagePhotos({
  folderName,
  bundleDir: inputBundleDir,
  title = '',
  scriptText = '',
  count = 100,
  engine = 'all',
  customQueries = null,
}) {
  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) {
    bundleDir = path.join(newsDir, folderName);
  }

  if (!bundleDir || !fs.existsSync(bundleDir)) {
    throw new Error(`Папка пакета не найдена: ${folderName || bundleDir}`);
  }

  let effectiveScript = scriptText;
  if (!effectiveScript) {
    const scriptPath = path.join(bundleDir, 'script.txt');
    const sourcePath = path.join(bundleDir, 'source.txt');
    if (fs.existsSync(scriptPath)) {
      effectiveScript = fs.readFileSync(scriptPath, 'utf-8');
    } else if (fs.existsSync(sourcePath)) {
      effectiveScript = fs.readFileSync(sourcePath, 'utf-8');
    }
  }

  let effectiveTitle = title;
  const projectJsonPath = path.join(bundleDir, 'project.json');
  if (fs.existsSync(projectJsonPath)) {
    try {
      const m = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
      if (!effectiveTitle) effectiveTitle = m.title || m.original_title || '';
    } catch {}
  }

  const desiredCount = Math.max(1, Math.min(200, Number(count) || 100));
  console.log(`🖼️ [AutoPhotos] Starte Auto-Laden von ${desiredCount} Fotos für "${effectiveTitle.slice(0, 50)}"...`);

  // 1. Generate queries or use provided custom queries
  let queries = Array.isArray(customQueries) && customQueries.length > 0 ? customQueries : null;
  if (!queries) {
    queries = await generateVisualQueries(effectiveScript, effectiveTitle, desiredCount);
  }
  console.log(`🖼️ [AutoPhotos] ${queries.length} visuelle Suchbegriffe bereit.`);

  // Save queries to disk so user can inspect anytime
  savePackagePhotoQueries(null, bundleDir, queries);

  // 2. Search & Download images concurrently
  const dataUrls = await searchPhotosForQueries(queries, desiredCount, engine);
  console.log(`🖼️ [AutoPhotos] ${dataUrls.length} Fotos erfolgreich heruntergeladen.`);

  if (dataUrls.length === 0) {
    throw new Error('Не удалось загрузить изображения по сгенерированным запросам');
  }

  // 3. Save photos into package
  const saved = await saveNewsPhotos({
    bundleDir,
    folderName: path.basename(bundleDir),
    title: effectiveTitle,
    photos: dataUrls,
  });

  console.log(`✅ [AutoPhotos] ${saved.savedPhotosCount} Fotos in ${saved.folderName}/photos/ gespeichert.`);

  return {
    success: true,
    count: saved.savedPhotosCount,
    photos: saved.photos,
    folderName: saved.folderName,
    bundleDir: saved.bundleDir,
    queries,
  };
}

export function savePackagePhotoQueries(folderName, inputBundleDir, queries) {
  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) bundleDir = path.join(newsDir, folderName);
  if (!bundleDir || !fs.existsSync(bundleDir) || !Array.isArray(queries)) return false;
  try {
    fs.writeFileSync(path.join(bundleDir, 'photo_queries.json'), JSON.stringify(queries, null, 2), 'utf-8');
    fs.writeFileSync(path.join(bundleDir, 'photo_queries.txt'), queries.map((q, idx) => `${idx + 1}. ${q}`).join('\n'), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function getPackagePhotoQueries(folderName, inputBundleDir) {
  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) bundleDir = path.join(newsDir, folderName);
  if (!bundleDir || !fs.existsSync(bundleDir)) return [];
  const qPath = path.join(bundleDir, 'photo_queries.json');
  if (fs.existsSync(qPath)) {
    try { return JSON.parse(fs.readFileSync(qPath, 'utf-8')); } catch {}
  }
  return [];
}

