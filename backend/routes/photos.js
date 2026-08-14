import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { newsCache } from './news.js';
import { generateGolubuzkiTitle } from './feuilleton.js';
import { cleanText, scrapeArticlePhotos, searchLiveNewsPhotos } from '../services/imageSearchService.js';
import { customFontsDir, overlayRussianHeadlineOnThumbnail } from '../services/thumbnailOverlayService.js';
import { processSetThumbnail } from '../services/thumbnailService.js';
import { saveNewsPhotos, deleteNewsPhoto } from '../services/photoStorageService.js';

export { overlayRussianHeadlineOnThumbnail };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// GET /api/custom-fonts/:filename
router.get('/api/custom-fonts/:filename', (req, res) => {
  const filePath = path.join(customFontsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Font not found');
  }
});

// GET /api/custom-fonts
router.get('/api/custom-fonts', (req, res) => {
  try {
    const files = fs.readdirSync(customFontsDir)
      .filter(f => /\.(ttf|otf|woff|woff2)$/i.test(f))
      .map(f => ({
        id: f,
        name: f.replace(/\.[^.]+$/, ''),
        filename: f,
        url: `/api/custom-fonts/${f}`,
      }));
    res.json({ success: true, fonts: files });
  } catch (err) {
    res.json({ success: true, fonts: [] });
  }
});

// POST /api/upload-font
router.post('/api/upload-font', async (req, res) => {
  try {
    const { filename, base64Data, fontName } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ success: false, error: 'Файл шрифта не передан' });
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = path.join(customFontsDir, safeFilename);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(targetPath, buffer);

    console.log(`🔤 Пользовательский шрифт сохранен: ${targetPath} (${buffer.length} байт)`);

    res.json({
      success: true,
      font: {
        id: safeFilename,
        name: fontName || safeFilename.replace(/\.[^.]+$/, ''),
        filename: safeFilename,
        url: `/api/custom-fonts/${safeFilename}`,
      }
    });
  } catch (err) {
    console.error('Upload font error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/news-photos
router.get('/api/news-photos', async (req, res) => {
  try {
    const { title = '', articleId = '', url = '', forceLive = 'false' } = req.query;
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
        if (!seen.has(p.url)) {
          seen.add(p.url);
          photos.push(p);
        }
      });
    }

    res.json({
      success: true,
      count: photos.length,
      isLocal: false,
      photos,
    });
  } catch (err) {
    console.error('Fetch photos error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-news-photos
router.post('/api/save-news-photos', async (req, res) => {
  try {
    const result = await saveNewsPhotos(req.body);
    res.json(result);
  } catch (err) {
    console.error('Save photos error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/delete-photo
router.post('/api/delete-photo', async (req, res) => {
  try {
    const result = deleteNewsPhoto(req.body);
    res.json(result);
  } catch (err) {
    console.error('Delete photo error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/generate-punchy-title
router.post('/api/generate-punchy-title', async (req, res) => {
  try {
    const { title = '', summary = '' } = req.body;
    const punchy = await generateGolubuzkiTitle(title, summary);
    res.json({ success: true, title: punchy });
  } catch (err) {
    console.error('Error generating punchy title:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/thumbnail-style
router.get('/api/thumbnail-style', (req, res) => {
  try {
    const { folderName } = req.query;
    if (!folderName) {
      return res.status(400).json({ success: false, error: 'folderName required' });
    }
    const newsDir = path.resolve(__dirname, '../../news');
    const stylePath = path.join(newsDir, folderName, 'thumbnail', 'style.json');
    if (fs.existsSync(stylePath)) {
      const style = JSON.parse(fs.readFileSync(stylePath, 'utf-8'));
      return res.json({ success: true, style });
    }
    const projectPath = path.join(newsDir, folderName, 'project.json');
    if (fs.existsSync(projectPath)) {
      const manifest = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
      if (manifest.headlineConfig) {
        return res.json({ success: true, style: manifest.headlineConfig });
      }
    }
    res.json({ success: false, style: null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/set-thumbnail
router.post('/api/set-thumbnail', async (req, res) => {
  try {
    const result = await processSetThumbnail(req.body);
    res.json(result);
  } catch (err) {
    console.error('Set thumbnail error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
