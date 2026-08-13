import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync, execFileSync } from 'child_process';
import { newsCache, cleanText } from './news.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// ── Web-Scraper für Fotos ────
async function scrapeArticlePhotos(articleUrl, articlePubDate = null) {
  if (!articleUrl || !/^https?:\/\//i.test(articleUrl)) return [];

  if (articlePubDate) {
    const pubTime = new Date(articlePubDate).getTime();
    if (!isNaN(pubTime)) {
      const ageHours = (Date.now() - pubTime) / (1000 * 60 * 60);
      if (ageHours > 24) {
        console.log(`⏳ Artikel zu alt für 24h-Filter (${Math.round(ageHours)} Std): ${articleUrl}`);
        return [];
      }
    }
  }

  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return [];
    const html = await res.text();

    const timeMatch = html.match(/<meta[^>]+(?:article:published_time|date|pubdate)[^>]+content=["']([^"']+)["']/i);
    if (timeMatch && timeMatch[1]) {
      const pageTime = new Date(timeMatch[1]).getTime();
      if (!isNaN(pageTime)) {
        const ageHours = (Date.now() - pageTime) / (1000 * 60 * 60);
        if (ageHours > 24) {
          console.log(`⏳ Webseiten-Artikel zu alt für 24h-Filter (${Math.round(ageHours)} Std): ${articleUrl}`);
          return [];
        }
      }
    }

    const photos = [];
    const baseUrl = new URL(articleUrl).origin;

    const toAbs = (src) => {
      if (!src) return null;
      try {
        let abs = src;
        if (src.startsWith('//')) abs = 'https:' + src;
        else if (!src.startsWith('http')) abs = new URL(src, baseUrl).href;

        const oldYearsRegex = /\/(201\d|202[0-5])\//;
        if (oldYearsRegex.test(abs)) {
          return null;
        }
        return abs;
      } catch {
        return null;
      }
    };

    const metaMatches = html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/gi);
    for (const m of metaMatches) {
      const abs = toAbs(m[1]);
      if (abs) photos.push(abs);
    }

    const metaMatches2 = html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi);
    for (const m of metaMatches2) {
      const abs = toAbs(m[1]);
      if (abs) photos.push(abs);
    }

    const imgMatches = html.matchAll(/<img[^>]+(?:src|data-src|srcset)=["']([^"'\s,]+)["']/gi);
    for (const m of imgMatches) {
      const abs = toAbs(m[1]);
      if (abs && /\.(jpg|jpeg|png|webp|gif)/i.test(abs)) {
        if (!/avatar|logo|pixel|tracker|icon|svg|share|button|banner-ad/i.test(abs)) {
          photos.push(abs);
        }
      }
    }

    return [...new Set(photos)];
  } catch (err) {
    console.error(`Scraper error (${articleUrl}):`, err.message);
    return [];
  }
}

// ── Active Live News Photo Search (DuckDuckGo) ──
async function fetchDDGPhotos(query) {
  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&df=d&iar=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!tokenRes.ok) return [];
    const text = await tokenRes.text();
    const vqdMatch = text.match(/vqd=([0-9-]+)/);
    if (!vqdMatch || !vqdMatch[1]) return [];

    const imgRes = await fetch(`https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqdMatch[1]}&df=d&f=,,,d`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!imgRes.ok) return [];
    const data = await imgRes.json();
    return data.results || [];
  } catch {
    return [];
  }
}

async function searchLiveNewsPhotos(queryTitle) {
  if (!queryTitle) return [];

  try {
    const titleClean = cleanText(queryTitle);
    const stopWords = new Set(['в', 'на', 'и', 'с', 'по', 'за', 'из', 'от', 'для', 'что', 'как', 'это', 'был', 'были', 'над', 'под', 'об', 'или', 'но', 'после', 'около']);
    const rawWords = titleClean
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));

    const keyNouns = rawWords.slice(0, 4);
    const keywords = keyNouns.join(' ');

    if (!keywords) return [];

    const [mainResults, agencyResults] = await Promise.all([
      fetchDDGPhotos(`"${keywords}"`),
      fetchDDGPhotos(`${keywords} фото репортаж`),
    ]);

    const combined = [...mainResults, ...agencyResults];
    const photos = [];
    const seen = new Set();

    const junkWords = ['инструкция', 'памятка', 'обучающих', 'учащих', 'школ', 'урок', 'плакат', 'схема', 'вектор', 'vector', 'stock', 'drawing', 'illustration', 'логотип', 'правила', 'методичка', 'avatar', 'author', 'banner', 'shutterstock'];
    const lowerKeyNouns = keyNouns.map(w => w.toLowerCase());
    const primarySubject = lowerKeyNouns[0] ? lowerKeyNouns[0].slice(0, 5) : '';

    combined.forEach(item => {
      const imgUrl = item.image;
      if (!imgUrl || !/^https?:\/\//i.test(imgUrl) || !/\.(jpg|jpeg|png|webp)/i.test(imgUrl)) return;
      if (seen.has(imgUrl) || imgUrl.includes('pixel') || imgUrl.includes('tracker') || imgUrl.includes('logo') || imgUrl.includes('avatar') || imgUrl.includes('ytimg') || imgUrl.includes('youtube') || imgUrl.includes('vimeo') || imgUrl.includes('rutube')) return;

      const itemTitleLower = (item.title || '').toLowerCase();
      const imgUrlLower = imgUrl.toLowerCase();

      const isJunk = junkWords.some(j => itemTitleLower.includes(j) || imgUrlLower.includes(j));
      if (isJunk) return;

      const oldYearMatch = /(201\d|202[0-5])/.test(itemTitleLower) || /(201\d|202[0-5])/.test(imgUrlLower);
      if (oldYearMatch) return;

      const hasMonthName = /(января|февраля|марта|апреля|мая|июня|июля|сентября|октября|ноября|декабря)/i.test(itemTitleLower);
      const hasDotDate = /(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])/.test(itemTitleLower) || /(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])/.test(imgUrlLower);
      const isAugust = /августа/i.test(itemTitleLower);

      if (hasMonthName || hasDotDate) return;
      if (isAugust && !/1[23]\s*августа/i.test(itemTitleLower)) return;

      const matchesCount = lowerKeyNouns.filter(noun => itemTitleLower.includes(noun) || imgUrlLower.includes(noun)).length;
      const matchesPrimary = primarySubject && (itemTitleLower.includes(primarySubject) || imgUrlLower.includes(primarySubject));

      if (!matchesPrimary && matchesCount < 2) return;

      seen.add(imgUrl);

      let providerName = 'Информагентство';
      try {
        const hostname = new URL(imgUrl).hostname.replace(/^www\./, '');
        if (hostname.includes('unian.')) providerName = 'УНИАН (UNIAN)';
        else if (hostname.includes('suspilne.')) providerName = 'Суспільне (Suspilne)';
        else if (hostname.includes('ukrinform.')) providerName = 'Укринформ (Ukrinform)';
        else if (hostname.includes('24tv.ua')) providerName = '24 Канал';
        else if (hostname.includes('obozrevatel.')) providerName = 'Обозреватель';
        else if (hostname.includes('liga.net')) providerName = 'ЛІГА.net';
        else if (hostname.includes('lb.ua')) providerName = 'Левый Берег (LB.ua)';
        else if (hostname.includes('dw.com')) providerName = 'Deutsche Welle';
        else if (hostname.includes('meduza.io')) providerName = 'Meduza';
        else if (hostname.includes('bbc.com') || hostname.includes('bbc.co.uk')) providerName = 'BBC News';
        else if (hostname.includes('reuters.com')) providerName = 'Reuters';
        else if (hostname.includes('apnews.com')) providerName = 'Associated Press (AP)';
        else if (hostname.includes('svoboda.org')) providerName = 'Радио Свобода';
        else if (hostname.includes('novayagazeta')) providerName = 'Новая газета';
        else providerName = hostname;
      } catch {}

      photos.push({
        url: imgUrl,
        source: providerName,
        articleTitle: item.title || queryTitle,
        isExactArticle: false,
        quality: 'search',
      });
    });

    return photos.slice(0, 35);
  } catch (err) {
    console.error('Live photo search error:', err.message);
    return [];
  }
}

// GET /api/news-photos
router.get('/api/news-photos', async (req, res) => {
  try {
    const { title = '', articleId = '', url = '', category = 'alle', forceLive = 'false' } = req.query;
    const isForceLive = forceLive === 'true' || forceLive === '1';

    const newsDir = path.resolve(__dirname, '../../news');
    if (!isForceLive && fs.existsSync(newsDir) && title) {
      const safeTitlePart = title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').slice(0, 20);
      const dirs = fs.readdirSync(newsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory() && d.name.includes(safeTitlePart)) {
          const existingPhotosDir = path.join(newsDir, d.name, 'photos');
          if (fs.existsSync(existingPhotosDir)) {
            const existingFiles = fs.readdirSync(existingPhotosDir).filter(f => /\.(jpg|jpeg|png|webp)/i.test(f));
            if (existingFiles.length > 0) {
              console.log(`⚡ Nutze ${existingFiles.length} bereits gespeicherte Fotos aus news/${d.name}/photos/`);
              const localPhotos = existingFiles.map((f) => ({
                url: `/news-static/${d.name}/photos/${f}`,
                source: `Сохранено: ${d.name}/photos/${f}`,
                articleTitle: title,
                isSavedLocal: true,
                quality: 'local',
              }));
              return res.json({
                success: true,
                count: localPhotos.length,
                isLocal: true,
                bundleDir: path.join(newsDir, d.name),
                photos: localPhotos,
              });
            }
          }
        }
      }
    }

    const seen = new Set();
    const photos = [];

    const titleClean = cleanText(title);
    const stopWords = new Set(['в', 'на', 'и', 'с', 'по', 'за', 'из', 'от', 'для', 'что', 'как', 'это', 'был', 'были', 'над', 'под', 'об', 'или', 'но', 'после', 'около']);
    const rawWords = titleClean
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
    const keyNouns = rawWords.slice(0, 3).map(w => w.toLowerCase());
    const primaryNoun = keyNouns[0] || '';

    const matchingArticles = (newsCache || []).filter(a => {
      if (a.id === articleId || (a.url && url && a.url === url)) return true;
      if (!a.title) return false;
      const aTitleLower = a.title.toLowerCase();
      const matchesPrimary = primaryNoun && aTitleLower.includes(primaryNoun);
      const matchesCount = keyNouns.filter(noun => aTitleLower.includes(noun)).length;
      return matchesPrimary || matchesCount >= 2;
    });

    for (const art of matchingArticles) {
      if (art.images) {
        art.images.forEach(imgUrl => {
          if (!seen.has(imgUrl) && /^https?:\/\//i.test(imgUrl)) {
            seen.add(imgUrl);
            photos.push({
              url: imgUrl,
              source: art.source || 'RSS Feed',
              articleTitle: art.title,
              isExactArticle: true,
              quality: 'rss',
            });
          }
        });
      }
    }

    const urlsToScrape = matchingArticles
      .map(a => ({ url: a.url, source: a.source, title: a.title, pubDate: a.pubDate }))
      .filter(a => a.url)
      .slice(0, 8);

    await Promise.all(urlsToScrape.map(async (art) => {
      try {
        const scrapedImages = await scrapeArticlePhotos(art.url, art.pubDate);
        scrapedImages.forEach(imgUrl => {
          if (!seen.has(imgUrl) && /^https?:\/\//i.test(imgUrl)) {
            seen.add(imgUrl);
            photos.push({
              url: imgUrl,
              source: art.source || new URL(art.url).hostname.replace('www.', ''),
              articleTitle: art.title,
              isExactArticle: true,
              quality: 'article',
            });
          }
        });
      } catch {}
    }));

    if ((isForceLive || photos.length < 30) && title) {
      const livePhotos = await searchLiveNewsPhotos(title);
      livePhotos.forEach(p => {
        if (photos.length < 35 && !seen.has(p.url)) {
          seen.add(p.url);
          photos.push({ ...p, quality: 'search' });
        }
      });
    }

    const targetUrl = url || (matchingArticles[0] ? matchingArticles[0].url : null);
    const resultPhotos = photos.slice(0, 30);
    res.json({
      success: true,
      count: resultPhotos.length,
      maxAgeHours: 24,
      scrapedUrl: targetUrl || null,
      photos: resultPhotos,
    });
  } catch (err) {
    console.error('News photos error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-news-photos
router.post('/api/save-news-photos', async (req, res) => {
  try {
    const { title = '', bundleDir: inputBundleDir, photos = [] } = req.body;

    const newsDir = path.resolve(__dirname, '../../news');
    if (!fs.existsSync(newsDir)) {
      fs.mkdirSync(newsDir, { recursive: true });
    }

    let bundleDir = inputBundleDir;
    if (!bundleDir || !fs.existsSync(bundleDir)) {
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const safeTitle = (title || 'Feuilleton')
        .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')
        .slice(0, 40);
      bundleDir = path.join(newsDir, `${dateStr}_${safeTitle}`);
    }

    const photosDir = path.join(bundleDir, 'photos');
    fs.mkdirSync(photosDir, { recursive: true });

    const existing = fs.readdirSync(photosDir);
    existing.forEach(f => {
      try { fs.unlinkSync(path.join(photosDir, f)); } catch {}
    });

    const savedPhotos = [];
    for (let i = 0; i < photos.length; i++) {
      const imgUrl = typeof photos[i] === 'string' ? photos[i] : photos[i]?.url;
      if (!imgUrl) continue;

      if (imgUrl.startsWith('/news-static/')) {
        const relativePath = imgUrl.replace(/^\/news-static\//, '');
        const fullLocalPath = path.resolve(__dirname, '../../news', relativePath);
        if (fs.existsSync(fullLocalPath)) {
          const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
          const imgFileName = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
          const targetPath = path.join(photosDir, imgFileName);
          if (fullLocalPath !== targetPath && fs.existsSync(fullLocalPath)) {
            fs.copyFileSync(fullLocalPath, targetPath);
          }
          savedPhotos.push(`photos/${imgFileName}`);
          continue;
        }
      }

      try {
        const imgRes = await fetch(imgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
          const imgFileName = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
          const imgPath = path.join(photosDir, imgFileName);
          fs.writeFileSync(imgPath, buffer);
          savedPhotos.push(`photos/${imgFileName}`);
        }
      } catch (err) {
        console.error(`Fehler beim Download von Bild ${imgUrl}:`, err.message);
      }
    }

    const jsonPath = path.join(bundleDir, 'project.json');
    let manifest = {};
    if (fs.existsSync(jsonPath)) {
      try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
    }
    manifest.photos = savedPhotos;
    manifest.photos_saved_at = new Date().toISOString();
    fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

    console.log(`📸 ${savedPhotos.length} Fotos erfolgreich in ${photosDir} gespeichert.`);

    res.json({
      success: true,
      bundleDir,
      folderName: path.basename(bundleDir),
      savedPhotosCount: savedPhotos.length,
      photos: savedPhotos,
    });
  } catch (err) {
    console.error('Save photos error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/delete-photo
router.post('/api/delete-photo', async (req, res) => {
  try {
    const { photoUrl, bundleDir } = req.body;
    let targetFile = null;

    const newsDir = path.resolve(__dirname, '../../news');

    if (photoUrl && photoUrl.startsWith('/news-static/')) {
      const subPath = photoUrl.replace('/news-static/', '');
      targetFile = path.join(newsDir, decodeURIComponent(subPath));
    } else if (bundleDir && photoUrl) {
      const fileName = path.basename(photoUrl);
      targetFile = path.join(bundleDir, 'photos', fileName);
    }

    if (targetFile && fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
      console.log(`🗑️ Foto physikalisch von Festplatte gelöscht: ${targetFile}`);

      const photoDir = path.dirname(targetFile);
      const pkgDir = path.dirname(photoDir);
      const jsonPath = path.join(pkgDir, 'project.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          const relName = `photos/${path.basename(targetFile)}`;
          manifest.photos = (manifest.photos || []).filter(p => p !== relName);
          fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
        } catch {}
      }

      return res.json({ success: true, deleted: true, targetFile });
    }

    res.json({ success: true, deleted: false, message: 'Datei war nicht auf Festplatte gespeichert' });
  } catch (err) {
    console.error('Delete photo error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 4-Corner AI Prompt Generator & Photo Analyzer ────────────────────────────
async function generate4CornerAiPrompt(title, textExcerpt, photosList = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey && !apiKey.includes('HIER')) {
    try {
      const systemPrompt = `You are an elite visual art director for 16:9 cinematic news editorial thumbnails.
Your task: Create a detailed English image prompt for Google Gemini / FLUX image generation.
KEY REQUIREMENTS:
1. The image must be a unified 16:9 cinematic photo where FOUR distinct perspectives/elements from the news story originate from the four corners (top-left, top-right, bottom-left, bottom-right) and seamlessly merge, dissolve, and blend into a powerful, dramatic center focal point.
2. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WORDS, NO HEADLINES, NO CAPTIONS, NO WATERMARKS, NO LOGOS.
3. ABSOLUTELY NO WHITE SPACES, NO EMPTY GAPS, NO BORDERS, NO MARGINS, NO FRAMES, NO GRID LINES, NO WHITE DIVIDERS. The entire 16:9 canvas must be 100% filled edge-to-edge with continuous rich cinematic photography, smoke, lighting, and environmental atmosphere.
Output ONLY the raw prompt in English, with dramatic lighting, 8k resolution, photorealistic news reportage style. No quotes or explanations.`;

      const userMsg = `News Story: ${title}\nContext: ${textExcerpt.slice(0, 450)}\nPhotos available: ${photosList.length} items (${photosList.slice(0, 5).join(', ')})`;

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
            { role: 'user', content: userMsg }
          ],
          max_tokens: 220,
          temperature: 0.85,
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (aiRes.ok) {
        const data = await aiRes.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 25) {
          const cleanPrompt = text.replace(/text|letters|words|typography|border|frame/gi, '').trim();
          console.log(`🧠 AI 4-Corner Prompt generiert: ${cleanPrompt.slice(0, 100)}...`);
          return `${cleanPrompt}, full bleed edge-to-edge cinematic composition, zero white spaces, zero borders, zero grid lines, no text, no watermark, seamless atmospheric blending, rich cinematic color palette`;
        }
      }
    } catch (e) {
      console.warn('AI Prompt Builder Fallback:', e.message);
    }
  }

  const cleanTitle = (title || 'Breaking News').replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, '').slice(0, 90);
  return `16:9 cinematic photojournalism composite, ${cleanTitle}, four distinct dramatic perspectives from top-left, top-right, bottom-left, and bottom-right corners seamlessly blending and melting towards a central focal point, smoke and emergency lighting, intense atmospheric depth, hyper-detailed, 8k resolution, full bleed edge-to-edge, no white spaces, no borders, no grid lines, no text, no letters, no words, no watermark`;
}

// ── Google Gemini Image Generator ────────────────────────────────────────────
async function generateGeminiImage(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('HIER')) return null;

  const models = ['google/gemini-2.5-flash-image', 'google/gemini-3.1-flash-image'];

  for (const model of models) {
    try {
      console.log(`🤖 Generiere 16:9 Bild via Google Gemini (${model})...`);
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
              content: `Generate a 16:9 cinematic photojournalism editorial cover image. Full bleed edge-to-edge composition with ZERO WHITE SPACES, ZERO BORDERS, ZERO MARGINS, ZERO FRAMES, ZERO GRID LINES. Strictly NO TEXT, NO LETTERS, NO WORDS, NO CAPTIONS, NO WATERMARKS. Aspect ratio 16:9 widescreen. Pure clean photographic composition with rich continuous atmospheric scene filling the entire frame. Prompt: ${prompt}`
            }
          ],
          modalities: ['image', 'text']
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Gemini Image (${model}) Status ${res.status}:`, errText.slice(0, 150));
        continue;
      }

      const data = await res.json();
      const imgObj = data.choices?.[0]?.message?.images?.[0];
      const imgUrl = imgObj?.image_url?.url || imgObj?.url;

      if (imgUrl) {
        if (imgUrl.startsWith('data:image/')) {
          const base64Data = imgUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          console.log(`✨ Google Gemini (${model}) hat ${buffer.length} Bytes Bilddaten geliefert!`);
          return buffer;
        } else if (imgUrl.startsWith('http')) {
          const downloadRes = await fetch(imgUrl);
          if (downloadRes.ok) {
            const buffer = Buffer.from(await downloadRes.arrayBuffer());
            console.log(`✨ Google Gemini (${model}) Download erfolgreich: ${buffer.length} Bytes`);
            return buffer;
          }
        }
      }
    } catch (err) {
      console.warn(`Gemini Image (${model}) Fehler:`, err.message);
    }
  }
  return null;
}

// ── Russian Large Uppercase Headline Overlay (Top Positioned, 100% Transparent) ──
function overlayRussianHeadlineOnThumbnail(imagePath, russianTitle) {
  if (!imagePath || !fs.existsSync(imagePath) || !russianTitle) return;

  try {
    // 1. Bereinige den Text: KEINE Sonderzeichen, keine Steuerzeichen
    const clean = String(russianTitle)
      .replace(/\r/g, '')
      .replace(/[\n\t]/g, ' ')
      .replace(/["'«»`]/g, '')
      .replace(/[^\p{L}\p{N}\s:!?-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    const words = clean.split(' ');
    let lines = [];
    let curLine = '';

    // Max 22 Zeichen pro Zeile für optimale Ausnutzung der Breite
    const targetCharsPerLine = 22;

    for (const w of words) {
      if ((curLine + ' ' + w).trim().length <= targetCharsPerLine) {
        curLine = (curLine + ' ' + w).trim();
      } else {
        if (curLine) lines.push(curLine);
        curLine = w;
        if (lines.length >= 3) break;
      }
    }
    if (curLine && lines.length < 3) lines.push(curLine);

    const cleanLines = lines.map(l => l.trim().toUpperCase()).filter(Boolean);
    if (cleanLines.length === 0) return;

    // Dynamische Schriftgröße: 60px bis 86px (RIESIG & vollflächig)
    const longestLineLen = Math.max(...cleanLines.map(l => l.length), 10);
    let dynamicFontSize = Math.floor(1200 / (longestLineLen * 0.62));
    if (dynamicFontSize > 84) dynamicFontSize = 84;
    if (dynamicFontSize < 56) dynamicFontSize = 56;

    const lineHeight = Math.round(dynamicFontSize * 1.16);
    const startY = 40; // Startet ganz OBEN im Bild!
    const safeFontPath = 'C\\:/Windows/Fonts/arialbd.ttf';

    // Generiere für jede Zeile einen separaten drawtext-Filter (OHNE Textdatei = 100% KEINE Quadrate am Ende!)
    const drawtextFilters = cleanLines.map((line, idx) => {
      const safeText = line
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "'\\''")
        .replace(/:/g, '\\:')
        .replace(/%/g, '\\%');
      const yPos = startY + (idx * lineHeight);
      return `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontsize=${dynamicFontSize}:fontcolor=yellow:bordercolor=black:borderw=9:shadowcolor=black@0.92:shadowx=4:shadowy=4:box=0:x=(w-text_w)/2:y=${yPos}`;
    });

    const fullFilter = `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,${drawtextFilters.join(',')}`;
    const tempOut = path.join(path.dirname(imagePath), 'temp_rendered_thumb.jpg');

    execFileSync('ffmpeg', ['-y', '-i', imagePath, '-vf', fullFilter, '-q:v', '2', tempOut]);

    if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 5000) {
      fs.copyFileSync(tempOut, imagePath);
      try { fs.unlinkSync(tempOut); } catch {}
    }

    console.log(`🏷️ Russische Headline oben platziert (${dynamicFontSize}px, KEIN Hintergrund, KEINE Quadrate):\n${cleanLines.join('\n')}`);
  } catch (err) {
    console.warn('Fehler beim Rendern der russischen Headline auf Thumbnail:', err.message);
  }
}

// POST /api/set-thumbnail
router.post('/api/set-thumbnail', async (req, res) => {
  try {
    const { photoUrl, bundleDir, folderName, mode = 'select' } = req.body;
    const newsDir = path.resolve(__dirname, '../../news');
    let targetFolder = bundleDir;
    if (!targetFolder || !fs.existsSync(targetFolder)) {
      if (folderName) {
        targetFolder = path.join(newsDir, folderName);
      }
      if (!targetFolder || !fs.existsSync(targetFolder)) {
        const timePrefix = (folderName || '').slice(0, 16);
        if (timePrefix && fs.existsSync(newsDir)) {
          const entries = fs.readdirSync(newsDir, { withFileTypes: true });
          for (const e of entries) {
            if (e.isDirectory() && e.name.startsWith(timePrefix)) {
              targetFolder = path.join(newsDir, e.name);
              break;
            }
          }
        }
      }
    }

    if (!targetFolder || !fs.existsSync(targetFolder)) {
      return res.status(400).json({ success: false, error: 'Paketordner nicht gefunden' });
    }

    const thumbnailDir = path.join(targetFolder, 'thumbnail');
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    const destSub = path.join(thumbnailDir, 'thumbnail.jpg');
    const destRoot = path.join(targetFolder, 'thumbnail.jpg');
    const tempRaw = path.join(thumbnailDir, 'raw_temp.png');

    // 0. VOLLEN ECHTEN TITEL ermitteln (aus project.json oder script.md)
    let fullNewsTitle = '';
    const jsonPath = path.join(targetFolder, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        fullNewsTitle = manifest.title || '';
      } catch {}
    }
    if (!fullNewsTitle) {
      const mdPath = path.join(targetFolder, 'script.md');
      if (fs.existsSync(mdPath)) {
        try {
          const firstLine = fs.readFileSync(mdPath, 'utf-8').split('\n')[0];
          fullNewsTitle = firstLine.replace(/^[#\s🎭\s*]+/, '').trim();
        } catch {}
      }
    }
    if (!fullNewsTitle) {
      fullNewsTitle = path.basename(targetFolder).replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, '').replace(/_/g, ' ');
    }

    if (mode === 'generate_ai' || mode === 'auto') {
      // 1. Fotos & Text im Ordner analysieren
      const photosDir = path.join(targetFolder, 'photos');
      let availablePhotos = [];
      if (fs.existsSync(photosDir)) {
        availablePhotos = fs.readdirSync(photosDir)
          .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
          .map(f => path.join(photosDir, f));
      }

      let scriptText = '';
      const txtPath = path.join(targetFolder, 'script.txt');
      const mdPath = path.join(targetFolder, 'script.md');
      if (fs.existsSync(txtPath)) {
        try { scriptText = fs.readFileSync(txtPath, 'utf-8'); } catch {}
      } else if (fs.existsSync(mdPath)) {
        try { scriptText = fs.readFileSync(mdPath, 'utf-8'); } catch {}
      }

      console.log(`🔍 Analysiere ${availablePhotos.length} Fotos und Skript für 4-Corner AI Thumbnail...`);

      // 2. Prompt erstellen: 4 verschiedene Szenen aus den Ecken ins Zentrum verschmolzen (Full Bleed)
      const promptEn = await generate4CornerAiPrompt(
        fullNewsTitle,
        scriptText,
        availablePhotos.map(p => path.basename(p))
      );

      let aiSuccess = false;

      // 3. Primär: Google Gemini Image Generator verwenden
      const geminiBuffer = await generateGeminiImage(promptEn);
      if (geminiBuffer && geminiBuffer.length > 5000) {
        fs.writeFileSync(tempRaw, geminiBuffer);
        
        // Exakter 16:9 Zuschnitt (1280x720) ohne jegliche Ränder mit FFmpeg
        try {
          execSync(`ffmpeg -y -i "${tempRaw}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -q:v 2 "${destSub}"`, { timeout: 10000 });
          try { fs.unlinkSync(tempRaw); } catch {}
        } catch {
          fs.writeFileSync(destSub, geminiBuffer);
        }
        aiSuccess = true;
        console.log(`✨ GOOGLE GEMINI 16:9 Thumbnail (Full Bleed) erfolgreich erstellt`);
      }

      // 4. Sekundär: FLUX AI Engine Fallback
      if (!aiSuccess) {
        console.log(`🤖 Fallback auf FLUX 16:9 gestartet...`);
        const aiApiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptEn)}?width=1280&height=720&nologo=true&model=flux&seed=${Date.now()}`;

        try {
          const aiRes = await fetch(aiApiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(25000),
          });
          if (aiRes.ok) {
            const buffer = Buffer.from(await aiRes.arrayBuffer());
            if (buffer.length > 6000) {
              fs.writeFileSync(destSub, buffer);
              aiSuccess = true;
              console.log(`✨ FLUX 16:9 Thumbnail ERFOLGREICH`);
            }
          }
        } catch (err) {
          console.warn('FLUX API Timeout/Fehler:', err.message);
        }
      }

      // 5. Tertiär: 4 Ecken aus den echten Fotos im Ordner ins Zentrum verschmelzen via FFmpeg
      if (!aiSuccess && availablePhotos.length > 0) {
        console.log(`🎨 Erstelle 4-Ecken-Verschmelzung aus ${availablePhotos.length} Fotos via FFmpeg...`);

        const shuffled = [...availablePhotos].sort(() => 0.5 - Math.random());
        const p1 = shuffled[0] || availablePhotos[0];
        const p2 = shuffled[1] || availablePhotos[0];
        const p3 = shuffled[2] || availablePhotos[0];
        const p4 = shuffled[3] || availablePhotos[0];

        const ffmpeg4CornerCmd = `ffmpeg -y -i "${p1}" -i "${p2}" -i "${p3}" -i "${p4}" -filter_complex "[0:v]scale=640:360:force_original_aspect_ratio=increase,crop=640:360[tl];[1:v]scale=640:360:force_original_aspect_ratio=increase,crop=640:360[tr];[2:v]scale=640:360:force_original_aspect_ratio=increase,crop=640:360[bl];[3:v]scale=640:360:force_original_aspect_ratio=increase,crop=640:360[br];[tl][tr]hstack[top];[bl][br]hstack[bot];[top][bot]vstack[grid];[grid]gblur=sigma=15[bg];[grid]scale=1280:720[sharp];[bg][sharp]blend=all_mode='overlay':all_opacity=0.3,eq=contrast=1.18:brightness=-0.04:saturation=1.15,vignette=PI/4[out]" -map "[out]" -q:v 2 "${destSub}"`;

        try {
          execSync(ffmpeg4CornerCmd, { timeout: 18000 });
        } catch (ffmpegErr) {
          console.warn('4-Corner FFmpeg Fehler, Fallback auf Single-Photo Blur:', ffmpegErr.message);
          const singlePhoto = availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
          const ffmpegCmd = `ffmpeg -y -i "${singlePhoto}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,gblur=sigma=40,eq=brightness=-0.05:contrast=1.15[bg];[0:v]scale=1280:720:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -q:v 2 "${destSub}"`;
          try {
            execSync(ffmpegCmd, { timeout: 15000 });
          } catch {
            fs.copyFileSync(singlePhoto, destSub);
          }
        }
      }

      // 6. Große, vollständige russische Headline ohne Quadrate rendern
      overlayRussianHeadlineOnThumbnail(destSub, fullNewsTitle);
      fs.copyFileSync(destSub, destRoot);
    } else {
      let sourceFile = null;
      if (photoUrl && photoUrl.startsWith('/news-static/')) {
        const subPath = photoUrl.replace('/news-static/', '');
        sourceFile = path.join(newsDir, decodeURIComponent(subPath));
      }

      if (sourceFile && fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destSub);
      } else if (photoUrl && photoUrl.startsWith('http')) {
        const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(6000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          fs.writeFileSync(destSub, buffer);
        }
      }

      // Auch bei manuellem Foto: Vollständige russische Headline rendern
      overlayRussianHeadlineOnThumbnail(destSub, fullNewsTitle);
      fs.copyFileSync(destSub, destRoot);
    }

    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        manifest.thumbnail = 'thumbnail/thumbnail.jpg';
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {}
    }

    res.json({
      success: true,
      thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
      folderName: path.basename(targetFolder),
    });
  } catch (err) {
    console.error('Set thumbnail error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
