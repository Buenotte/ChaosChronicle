import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
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

// POST /api/set-thumbnail
router.post('/api/set-thumbnail', async (req, res) => {
  try {
    const { photoUrl, bundleDir, folderName, mode = 'select' } = req.body;
    const newsDir = path.resolve(__dirname, '../../news');
    let targetFolder = bundleDir;

    if (!targetFolder && folderName) {
      targetFolder = path.join(newsDir, folderName);
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

    if (mode === 'generate_ai' || mode === 'auto') {
      const folderTitle = path.basename(targetFolder).replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, '').replace(/_/g, ' ');
      console.log(`🤖 Echte KI-Bildgenerierung (FLUX 16:9) gestartet für Thema: «${folderTitle}»...`);

      const promptEn = `photorealistic news reportage photo 16:9, ${folderTitle.slice(0, 90)}, dramatic lighting, night emergency scene, hyper detailed photojournalism style, 8k resolution`;
      const aiApiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptEn)}?width=1280&height=720&nologo=true&model=flux&seed=${Date.now()}`;

      let aiSuccess = false;
      try {
        const aiRes = await fetch(aiApiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(25000),
        });
        if (aiRes.ok) {
          const buffer = Buffer.from(await aiRes.arrayBuffer());
          if (buffer.length > 5000) {
            fs.writeFileSync(destSub, buffer);
            fs.writeFileSync(destRoot, buffer);
            aiSuccess = true;
            console.log(`✨ Echte KI-Bildgenerierung (FLUX 16:9) ERFOLGREICH (${buffer.length} Bytes) -> news/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg`);
          }
        }
      } catch (err) {
        console.warn('AI API Online-Generierung Timeout/Fehler:', err.message);
      }

      if (!aiSuccess) {
        const photosDir = path.join(targetFolder, 'photos');
        let availablePhotos = [];
        if (fs.existsSync(photosDir)) {
          availablePhotos = fs.readdirSync(photosDir)
            .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
            .map(f => path.join(photosDir, f));
        }

        if (availablePhotos.length > 0) {
          const randomIndex = Math.floor(Math.random() * availablePhotos.length);
          const chosenPhoto = (photoUrl && photoUrl.startsWith('/news-static/'))
            ? path.join(newsDir, decodeURIComponent(photoUrl.replace('/news-static/', '')))
            : availablePhotos[randomIndex];

          console.log(`🎲 ZUFÄLLIGES Foto für 16:9 Thumbnail gewählt (Index ${randomIndex + 1}/${availablePhotos.length}): ${path.basename(chosenPhoto)}`);

          const ffmpegCmd = `ffmpeg -y -i "${chosenPhoto}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,gblur=sigma=40,eq=brightness=-0.05:contrast=1.15[bg];[0:v]scale=1280:720:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -q:v 2 "${destSub}"`;

          try {
            execSync(ffmpegCmd, { timeout: 15000 });
            console.log(`✨ Kinematische 16:9 Bildkomposition aus ${path.basename(chosenPhoto)} erfolgreich gerendert!`);
          } catch {
            fs.copyFileSync(chosenPhoto, destSub);
          }
          fs.copyFileSync(destSub, destRoot);
        }
      }
    } else {
      let sourceFile = null;
      if (photoUrl && photoUrl.startsWith('/news-static/')) {
        const subPath = photoUrl.replace('/news-static/', '');
        sourceFile = path.join(newsDir, decodeURIComponent(subPath));
      }

      if (sourceFile && fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destSub);
        fs.copyFileSync(sourceFile, destRoot);
        console.log(`🖼️ Thumbnail gesetzt aus ${sourceFile}`);
      } else if (photoUrl && photoUrl.startsWith('http')) {
        const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(6000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          fs.writeFileSync(destSub, buffer);
          fs.writeFileSync(destRoot, buffer);
          console.log(`🖼️ Thumbnail heruntergeladen: ${destSub}`);
        }
      }
    }

    const jsonPath = path.join(targetFolder, 'project.json');
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
