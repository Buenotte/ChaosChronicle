import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTitleVariants, updatePackageTitle } from '../services/packageTitleService.js';
import { generateYouTubeMetadata, saveYouTubeMetadataJson } from '../services/youtubeMetadataService.js';
import { processSetThumbnail } from '../services/thumbnailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// POST /api/save-package & /api/save-news-package
const handleSavePackage = async (req, res) => {
  try {
    const {
      title,
      url,
      original_url,
      link,
      text,
      summary = '',
      date,
      model = 'gemini',
      style = 'clickbait',
      source = '',
      photos = [],
      images = [],
      imageUrl,
      folderName: requestedFolderName,
    } = req.body;

    const inputPhotos = Array.isArray(photos) && photos.length > 0
      ? photos
      : (Array.isArray(images) && images.length > 0 ? images : (imageUrl ? [imageUrl] : []));

    const newsDir = path.resolve(__dirname, '../../news');
    if (!fs.existsSync(newsDir)) {
      fs.mkdirSync(newsDir, { recursive: true });
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = (title || 'Feuilleton')
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80);

    const bundleDir = requestedFolderName
      ? path.join(newsDir, requestedFolderName)
      : path.join(newsDir, `${dateStr}_${safeTitle}`);

    const photosDir = path.join(bundleDir, 'photos');
    fs.mkdirSync(photosDir, { recursive: true });

    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const manifest = {
      title: title || 'Ohne Titel',
      original_title: title || 'Ohne Titel',
      url: url || original_url || link || '',
      date: date || now.toISOString(),
      model,
      style: req.body.style || style || 'clickbait',
      source,
      word_count: words,
      created_at: now.toISOString(),
      photos: [],
      audio: 'audio.mp3',
      video: 'video.mp4',
    };

    if (text) {
      fs.writeFileSync(path.join(bundleDir, 'script.txt'), text, 'utf-8');
      const mdContent = `# 🎭 ${title}\n\n**Quelle:** ${source} | **Datum:** ${date || now.toLocaleDateString()}\n**Modell:** ${model} | **Wortanzahl:** ${words}\n\n---\n\n${text}\n`;
      fs.writeFileSync(path.join(bundleDir, 'script.md'), mdContent, 'utf-8');
    }

    const savedPhotos = [];
    if (Array.isArray(inputPhotos) && inputPhotos.length > 0) {
      for (let i = 0; i < inputPhotos.length; i++) {
        const imgUrl = typeof inputPhotos[i] === 'string' ? inputPhotos[i] : inputPhotos[i]?.url;
        if (!imgUrl) continue;

        try {
          if (imgUrl.startsWith('/news-static/')) {
            const rel = imgUrl.replace(/^\/news-static\//, '');
            const localSrc = path.resolve(__dirname, '../../news', rel);
            if (fs.existsSync(localSrc)) {
              const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
              const imgFileName = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
              const target = path.join(photosDir, imgFileName);
              if (localSrc !== target) fs.copyFileSync(localSrc, target);
              savedPhotos.push(`photos/${imgFileName}`);
              continue;
            }
          }

          const imgRes = await fetch(imgUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(6000),
          });
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
            const imgFileName = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
            fs.writeFileSync(path.join(photosDir, imgFileName), buffer);
            savedPhotos.push(`photos/${imgFileName}`);
          }
        } catch {}
      }
    }

    manifest.photos = savedPhotos;
    fs.writeFileSync(path.join(bundleDir, 'project.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    if (savedPhotos.length > 0) {
      try {
        const firstPhotoUrl = `/news-static/${path.basename(bundleDir)}/${savedPhotos[0]}`;
        await processSetThumbnail({
          bundleDir,
          folderName: path.basename(bundleDir),
          photoUrl: firstPhotoUrl,
          headlineConfig: { text: title || manifest.title }
        });
      } catch (thumbErr) {
        console.warn('Initial thumbnail creation warning:', thumbErr.message);
      }
    }

    res.json({
      success: true,
      bundleDir,
      folderName: path.basename(bundleDir),
      savedPhotosCount: savedPhotos.length,
    });
  } catch (err) {
    console.error('Save package error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/api/save-package', handleSavePackage);
router.post('/api/save-news-package', handleSavePackage);

// GET /api/saved-packages
router.get('/api/saved-packages', async (req, res) => {
  try {
    const newsDir = path.resolve(__dirname, '../../news');
    if (!fs.existsSync(newsDir)) {
      return res.json({ success: true, packages: [] });
    }

    const entries = fs.readdirSync(newsDir, { withFileTypes: true });
    const packages = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const bundleDir = path.join(newsDir, entry.name);
        const jsonPath = path.join(bundleDir, 'project.json');
        const audioPath = path.join(bundleDir, 'audio.mp3');
        const txtPath = path.join(bundleDir, 'script.txt');
        const mdPath = path.join(bundleDir, 'script.md');
        const photosDir = path.join(bundleDir, 'photos');

        let manifest = {};
        if (fs.existsSync(jsonPath)) {
          try {
            manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          } catch {}
        }

        let photoFiles = [];
        if (fs.existsSync(photosDir)) {
          photoFiles = fs.readdirSync(photosDir).map(f => `/news-static/${entry.name}/photos/${f}`);
        }

        const videoDir = path.join(bundleDir, 'video');
        let latestVideoFile = null;
        if (fs.existsSync(videoDir)) {
          const videoFiles = fs.readdirSync(videoDir)
            .filter(f => f.endsWith('.mp4'))
            .map(f => ({ name: f, time: fs.statSync(path.join(videoDir, f)).mtimeMs }))
            .sort((a, b) => b.time - a.time);
          if (videoFiles.length > 0) {
            latestVideoFile = videoFiles[0].name;
          }
        }
        const hasVideo = !!latestVideoFile;
        const videoUrl = latestVideoFile ? `/news-static/${entry.name}/video/${latestVideoFile}` : null;

        let packageTitle = manifest.title || '';
        if (!packageTitle && fs.existsSync(mdPath)) {
          try {
            const firstLine = fs.readFileSync(mdPath, 'utf-8').split('\n')[0];
            packageTitle = firstLine.replace(/^[#\s🎭\s*]+/, '').trim();
          } catch {}
        }
        if (!packageTitle) {
          packageTitle = entry.name.replace(/^[0-9T-]{16}_/, '').replace(/_/g, ' ');
        }

        const thumbSub = path.join(bundleDir, 'thumbnail', 'thumbnail.jpg');
        const thumbRoot = path.join(bundleDir, 'thumbnail.jpg');
        const hasThumbnail = fs.existsSync(thumbSub) || fs.existsSync(thumbRoot);
        let thumbnailUpdatedAt = manifest.thumbnail_updated_at || null;
        if (hasThumbnail && !thumbnailUpdatedAt) {
          try {
            const actualThumb = fs.existsSync(thumbSub) ? thumbSub : thumbRoot;
            thumbnailUpdatedAt = fs.statSync(actualThumb).mtime.toISOString();
          } catch {}
        }
        const thumbnailUrl = hasThumbnail
          ? `/news-static/${entry.name}/thumbnail/thumbnail.jpg?t=${thumbnailUpdatedAt ? new Date(thumbnailUpdatedAt).getTime() : Date.now()}`
          : null;

        const hasScriptTxt = fs.existsSync(txtPath);
        const hasScriptMd = fs.existsSync(mdPath);
        const hasAudio = fs.existsSync(audioPath);
        const shortPath = path.join(bundleDir, 'short.mp4');
        const hasShort = fs.existsSync(shortPath);
        const shortUrl = hasShort ? `/news-static/${entry.name}/short.mp4?t=${fs.statSync(shortPath).mtimeMs}` : null;
        const photosCount = photoFiles.length;

        const styleJsonPath = path.join(bundleDir, 'thumbnail', 'style.json');
        let thumbnailStyle = null;
        if (fs.existsSync(styleJsonPath)) {
          try { thumbnailStyle = JSON.parse(fs.readFileSync(styleJsonPath, 'utf-8')); } catch {}
        }
        if (!thumbnailStyle && manifest.headlineConfig) thumbnailStyle = manifest.headlineConfig;

        const ytMeta = manifest.youtubeMetadata;
        const hasYouTubeMetadata = Boolean(ytMeta && (ytMeta.description || (ytMeta.clickbait && ytMeta.clickbait.description) || (ytMeta.golubuzki && ytMeta.golubuzki.description)));
        const hasFacebookPost = Boolean((manifest.facebookPosts && Object.keys(manifest.facebookPosts).length > 0) || (ytMeta && (ytMeta.facebookPost || (ytMeta.clickbait && ytMeta.clickbait.facebookPost) || (ytMeta.golubuzki && ytMeta.golubuzki.facebookPost))));

        const artifactCount = (hasScriptTxt ? 1 : 0) + (hasScriptMd ? 1 : 0) + (hasAudio ? 1 : 0) + (hasVideo ? 1 : 0) + (hasShort ? 1 : 0) + (photosCount > 0 ? 1 : 0) + (hasThumbnail ? 1 : 0) + (hasYouTubeMetadata ? 1 : 0) + (hasFacebookPost ? 1 : 0);
        packages.push({
          folderName: entry.name, bundleDir, title: packageTitle, original_title: manifest.original_title || packageTitle,
          url: manifest.url || manifest.original_url || manifest.link || null, date: manifest.date || null,
          model: manifest.model || 'gemini', style: manifest.style || manifest.feuilletonStyle || 'clickbait',
          source: manifest.source || '', hasAudio, hasVideo, hasShort, shortUrl, hasScriptTxt, hasScriptMd,
          photosCount, photoUrls: photoFiles, hasThumbnail, thumbnailUrl, thumbnail_updated_at: thumbnailUpdatedAt,
          hasYouTubeMetadata, hasFacebookPost, youtubeMetadata: ytMeta || null, facebookPosts: manifest.facebookPosts || null,
          artifactCount, hasAnyArtifact: artifactCount > 0, headlineConfig: thumbnailStyle,
          title_variants: manifest.title_variants || [], audioUrl: hasAudio ? `/news-static/${entry.name}/audio.mp3` : null, videoUrl,
          shortsConfig: manifest.shortsConfig || null,
          scriptTxt: hasScriptTxt ? fs.readFileSync(txtPath, 'utf-8') : '', scriptMd: hasScriptMd ? fs.readFileSync(mdPath, 'utf-8') : '',
        });
      }
    }

    res.json({ success: true, packages });
  } catch (err) {
    console.error('List packages error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/delete-package
router.post('/api/delete-package', (req, res) => {
  try {
    const newsDir = path.resolve(__dirname, '../../news');
    const bundleDir = req.body.bundleDir || (req.body.folderName ? path.join(newsDir, req.body.folderName) : null);
    if (!bundleDir || !fs.existsSync(bundleDir)) return res.status(404).json({ success: false, error: 'Папка не найдена' });
    fs.rmSync(bundleDir, { recursive: true, force: true });
    res.json({ success: true, deleted: path.basename(bundleDir) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/package-script-text
router.get('/api/package-script-text', (req, res) => {
  try {
    const newsDir = path.resolve(__dirname, '../../news');
    const targetDir = req.query.bundleDir || (req.query.folderName ? path.join(newsDir, req.query.folderName) : null);
    if (!targetDir || !fs.existsSync(targetDir)) return res.status(404).json({ success: false, error: 'Папка не найдена' });
    const txtPath = path.join(targetDir, 'script.txt'), mdPath = path.join(targetDir, 'script.md');
    const text = fs.existsSync(txtPath) ? fs.readFileSync(txtPath, 'utf-8') : (fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : '');
    res.json({ success: true, text, folderName: path.basename(targetDir) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/save-script-text
router.post('/api/save-script-text', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, text } = req.body;
    const newsDir = path.resolve(__dirname, '../../news');
    let targetDir = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
    if (!targetDir || !fs.existsSync(targetDir)) {
      if (folderName && fs.existsSync(newsDir)) {
        const candidate = path.join(newsDir, folderName);
        if (fs.existsSync(candidate)) targetDir = candidate;
      }
    }
    if (!targetDir || !fs.existsSync(targetDir)) return res.status(404).json({ success: false, error: 'Папка пакета не найдена на диске' });
    fs.writeFileSync(path.join(targetDir, 'script.txt'), text, 'utf-8');
    const jsonPath = path.join(targetDir, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        manifest.word_count = text.split(/\s+/).filter(Boolean).length;
        manifest.text_updated_at = new Date().toISOString();
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {}
    }
    res.json({ success: true, bundleDir: targetDir, folderName: path.basename(targetDir), text });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/generate-title-variants
router.post('/api/generate-title-variants', async (req, res) => {
  try {
    const { title = '', summary = '', text = '', bundleDir, folderName, forceRegenerate = false, style = 'golubuzki' } = req.body;
    const result = await generateTitleVariants(title, summary, bundleDir, folderName, forceRegenerate, style, text);
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/update-package-title
router.post('/api/update-package-title', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, newTitle, updateThumbnail = true, lineSpacing, lineColors, fontSize, fontColor, font } = req.body;
    const newsDir = path.resolve(__dirname, '../../news');
    let targetFolder = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);

    if (!targetFolder && fs.existsSync(newsDir)) {
      const matchTitle = (req.body.title || req.body.originalTitle || newTitle || '').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
      if (matchTitle) {
        const dirs = fs.readdirSync(newsDir, { withFileTypes: true });
        for (const d of dirs) {
          if (!d.isDirectory()) continue;
          const pDir = path.join(newsDir, d.name), jsonPath = path.join(pDir, 'project.json');
          if (fs.existsSync(jsonPath)) {
            try {
              const m = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
              const mT = (m.title || '').toLowerCase().replace(/[^a-z0-9а-яё]/gi, ''), mO = (m.original_title || '').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
              if ((mO && matchTitle.includes(mO.slice(0, 12))) || (mT && matchTitle.includes(mT.slice(0, 12)))) { targetFolder = pDir; break; }
            } catch {}
          }
        }
      }
    }
    if (!targetFolder) {
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const safeTitle = (newTitle || 'News').replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').slice(0, 60);
      targetFolder = path.join(newsDir, `${dateStr}_${safeTitle}`);
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    if (!newTitle || !newTitle.trim()) return res.status(400).json({ success: false, error: 'Заголовок не может быть пустым' });

    const titleOptions = {};
    if (lineSpacing !== undefined) titleOptions.lineSpacing = Number(lineSpacing);
    if (lineColors !== undefined) titleOptions.lineColors = lineColors;
    if (fontSize !== undefined) titleOptions.fontSize = fontSize;
    if (fontColor !== undefined) titleOptions.fontColor = fontColor;
    if (font !== undefined) titleOptions.font = font;

    res.json(updatePackageTitle(targetFolder, newTitle, updateThumbnail, titleOptions));
  } catch (err) {
    console.error('Update package title error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/youtube-metadata
router.post('/api/youtube-metadata', async (req, res) => {
  try {
    const result = await generateYouTubeMetadata(req.body);
    res.json(result);
  } catch (err) {
    console.error('YouTube metadata error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-youtube-metadata
router.post('/api/save-youtube-metadata', (req, res) => {
  try {
    const result = saveYouTubeMetadataJson(req.body);
    res.json(result);
  } catch (err) {
    console.error('Save YouTube metadata error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
