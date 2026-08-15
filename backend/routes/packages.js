import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTitleVariants, updatePackageTitle } from '../services/packageTitleService.js';
import { generateYouTubeMetadata } from '../services/youtubeMetadataService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// POST /api/save-package & /api/save-news-package
const handleSavePackage = async (req, res) => {
  try {
    const {
      title,
      text,
      summary = '',
      date,
      model = 'gemini',
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
      date: date || now.toISOString(),
      model,
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
        const photosCount = photoFiles.length;

        const artifactCount = (hasScriptTxt ? 1 : 0) +
          (hasScriptMd ? 1 : 0) +
          (hasAudio ? 1 : 0) +
          (hasVideo ? 1 : 0) +
          (photosCount > 0 ? 1 : 0) +
          (hasThumbnail ? 1 : 0);

        const styleJsonPath = path.join(bundleDir, 'thumbnail', 'style.json');
        let thumbnailStyle = null;
        if (fs.existsSync(styleJsonPath)) {
          try {
            thumbnailStyle = JSON.parse(fs.readFileSync(styleJsonPath, 'utf-8'));
          } catch {}
        }
        if (!thumbnailStyle && manifest.headlineConfig) {
          thumbnailStyle = manifest.headlineConfig;
        }

        packages.push({
          folderName: entry.name,
          bundleDir,
          title: packageTitle,
          original_title: manifest.original_title || packageTitle,
          date: manifest.date || null,
          model: manifest.model || 'gemini',
          source: manifest.source || '',
          hasAudio,
          hasVideo,
          hasScriptTxt,
          hasScriptMd,
          photosCount,
          photoUrls: photoFiles,
          hasThumbnail,
          thumbnailUrl,
          thumbnail_updated_at: thumbnailUpdatedAt,
          artifactCount,
          hasAnyArtifact: artifactCount > 0,
          headlineConfig: thumbnailStyle,
          title_variants: manifest.title_variants || [],
          audioUrl: hasAudio ? `/news-static/${entry.name}/audio.mp3` : null,
          videoUrl,
          scriptTxt: hasScriptTxt ? fs.readFileSync(txtPath, 'utf-8') : '',
          scriptMd: hasScriptMd ? fs.readFileSync(mdPath, 'utf-8') : '',
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
    const { bundleDir: inputBundleDir, folderName } = req.body;
    const newsDir = path.resolve(__dirname, '../../news');
    let bundleDir = inputBundleDir;
    if (!bundleDir && folderName) {
      bundleDir = path.join(newsDir, folderName);
    }
    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(404).json({ success: false, error: 'Папка пакета не найдена' });
    }
    fs.rmSync(bundleDir, { recursive: true, force: true });
    console.log(`🗑️ Видео-пакет удален: ${bundleDir}`);
    res.json({ success: true, deleted: path.basename(bundleDir) });
  } catch (err) {
    console.error('Delete package error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-script-text
router.post('/api/save-script-text', async (req, res) => {
  try {
    const { bundleDir, text } = req.body;
    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(404).json({ success: false, error: 'Paketordner existiert nicht' });
    }

    const txtPath = path.join(bundleDir, 'script.txt');
    const mdPath = path.join(bundleDir, 'script.md');

    fs.writeFileSync(txtPath, text, 'utf-8');

    if (fs.existsSync(mdPath)) {
      try {
        const lines = fs.readFileSync(mdPath, 'utf-8').split('\n');
        const headerLines = [];
        let inHeader = true;
        for (const line of lines) {
          if (inHeader) {
            headerLines.push(line);
            if (line.trim() === '---') inHeader = false;
          }
        }
        const newMd = inHeader ? `# 🎭 Manuelles Update\n\n---\n\n${text}\n` : `${headerLines.join('\n')}\n\n${text}\n`;
        fs.writeFileSync(mdPath, newMd, 'utf-8');
      } catch {}
    }

    const jsonPath = path.join(bundleDir, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        manifest.word_count = text.split(/\s+/).filter(Boolean).length;
        manifest.text_updated_at = new Date().toISOString();
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {}
    }

    res.json({
      success: true,
      bundleDir,
      folderName: path.basename(bundleDir),
      text,
    });
  } catch (err) {
    console.error('Save script error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/generate-title-variants
router.post('/api/generate-title-variants', async (req, res) => {
  try {
    const { title = '', summary = '', text = '', bundleDir, folderName, forceRegenerate = false, style = 'golubuzki' } = req.body;
    const result = await generateTitleVariants(title, summary, bundleDir, folderName, forceRegenerate, style, text);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error generating title variants:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/update-package-title
router.post('/api/update-package-title', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, newTitle, updateThumbnail = true, lineSpacing, lineColors, fontSize, fontColor, font } = req.body;
    const newsDir = path.resolve(__dirname, '../../news');
    let targetFolder = inputBundleDir;

    if (!targetFolder && folderName) {
      targetFolder = path.join(newsDir, folderName);
    }
    if (!targetFolder || !fs.existsSync(targetFolder)) {
      return res.status(404).json({ success: false, error: 'Папка пакета не найдена' });
    }
    if (!newTitle || !newTitle.trim()) {
      return res.status(400).json({ success: false, error: 'Заголовок не может быть пустым' });
    }

    const titleOptions = {};
    if (lineSpacing !== undefined) titleOptions.lineSpacing = Number(lineSpacing);
    if (lineColors !== undefined) titleOptions.lineColors = lineColors;
    if (fontSize !== undefined) titleOptions.fontSize = fontSize;
    if (fontColor !== undefined) titleOptions.fontColor = fontColor;
    if (font !== undefined) titleOptions.font = font;

    const result = updatePackageTitle(targetFolder, newTitle, updateThumbnail, titleOptions);
    res.json(result);
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

export default router;
