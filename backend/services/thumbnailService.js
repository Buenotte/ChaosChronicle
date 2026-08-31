import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { generateGolubuzkiTitle } from '../routes/feuilleton.js';
import { generate4CornerAiPrompt, generateGeminiImage } from './aiImageService.js';
import { overlayRussianHeadlineOnThumbnail } from './thumbnailOverlayService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

export function getDefaultThumbnailStyle() {
  const defPath = path.resolve(__dirname, '../default_thumbnail_style.json');
  if (fs.existsSync(defPath)) {
    try { return JSON.parse(fs.readFileSync(defPath, 'utf-8')); } catch {}
  }
  return {
    font: 'impact', fontFamilyName: 'Impact, sans-serif', fontSize: 'auto', customSizeNum: 82,
    lineFontSizes: null, fontColor: 'yellow', lineColors: null, wordColors: null, wordFontSizes: null,
    borderColor: 'black', borderWidth: 9,
    shadowDistance: 4, lineSpacing: 1.15, isItalic: false, tiltAngle: 0, position: 'center', offsetY: 50,
    hasBox: false, boxStyle: 'none', boxOpacity: 75,
  };
}

export function saveDefaultThumbnailStyle(style = {}) {
  const defPath = path.resolve(__dirname, '../default_thumbnail_style.json');
  const clean = { ...getDefaultThumbnailStyle(), ...style };
  delete clean.text; delete clean.photoUrl; delete clean.updatedAt;
  fs.writeFileSync(defPath, JSON.stringify(clean, null, 2), 'utf-8');
  return clean;
}

export async function processSetThumbnail({
  photoUrl,
  bundleDir: inputBundleDir,
  folderName,
  mode = 'direct',
  headlineConfig = {},
}) {
  let targetFolder = inputBundleDir;
  if (!targetFolder && folderName) targetFolder = path.join(newsDir, folderName);
  if (!targetFolder || !fs.existsSync(targetFolder)) {
    if (fs.existsSync(newsDir)) {
      const searchTarget = folderName || (inputBundleDir ? path.basename(inputBundleDir) : '');
      const prefix = searchTarget.slice(0, 16);
      const entries = fs.readdirSync(newsDir, { withFileTypes: true });
      const matched = entries.find(e => e.isDirectory() && (e.name === searchTarget || (prefix && e.name.startsWith(prefix))));
      if (matched) targetFolder = path.join(newsDir, matched.name);
    }
  }
  if (!targetFolder || !fs.existsSync(targetFolder)) throw new Error('Paketordner nicht gefunden');

  const thumbnailDir = path.join(targetFolder, 'thumbnail');
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  const destSub = path.join(thumbnailDir, 'thumbnail.jpg');
  const rawBackgroundPath = path.join(thumbnailDir, 'raw_background.jpg');
  const tempRaw = path.join(thumbnailDir, 'raw_temp.png');
  const styleJsonPath = path.join(thumbnailDir, 'style.json');

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

  let savedStyle = {};
  if (fs.existsSync(styleJsonPath)) {
    try { savedStyle = JSON.parse(fs.readFileSync(styleJsonPath, 'utf-8')); } catch {}
  }
  if (!savedStyle.font && fs.existsSync(jsonPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (manifest.headlineConfig) savedStyle = { ...manifest.headlineConfig, ...savedStyle };
    } catch {}
  }
  if (!savedStyle.font) {
    savedStyle = { ...getDefaultThumbnailStyle(), ...savedStyle };
  }

  let titleToRender = (headlineConfig && headlineConfig.text) || savedStyle.text;
  if (!titleToRender) {
    const wordCount = fullNewsTitle.split(/\s+/).filter(Boolean).length;
    if (wordCount > 6) {
      titleToRender = await generateGolubuzkiTitle(fullNewsTitle);
    } else {
      titleToRender = fullNewsTitle;
    }
  }

  const effectiveConfig = { ...savedStyle, ...(headlineConfig || {}) };

  const styleData = {
    text: titleToRender,
    font: effectiveConfig.font || 'impact',
    fontFamilyName: effectiveConfig.fontFamilyName || 'Impact, sans-serif',
    fontSize: effectiveConfig.fontSize || 'auto',
    customSizeNum: effectiveConfig.fontSize !== 'auto' && effectiveConfig.fontSize ? Number(effectiveConfig.fontSize) : (effectiveConfig.customSizeNum || 82),
    lineFontSizes: Array.isArray(effectiveConfig.lineFontSizes) ? effectiveConfig.lineFontSizes : null,
    fontColor: effectiveConfig.fontColor || 'yellow',
    lineColors: Array.isArray(effectiveConfig.lineColors) ? effectiveConfig.lineColors : null,
    wordColors: Array.isArray(effectiveConfig.wordColors) ? effectiveConfig.wordColors : null,
    wordFontSizes: Array.isArray(effectiveConfig.wordFontSizes) ? effectiveConfig.wordFontSizes : null,
    borderColor: effectiveConfig.borderColor || 'black',
    borderWidth: effectiveConfig.borderWidth !== undefined ? Number(effectiveConfig.borderWidth) : 9,
    shadowDistance: effectiveConfig.shadowDistance !== undefined ? Number(effectiveConfig.shadowDistance) : 4,
    lineSpacing: effectiveConfig.lineSpacing !== undefined ? Number(effectiveConfig.lineSpacing) : 1.15,
    isItalic: !!effectiveConfig.isItalic,
    tiltAngle: Number(effectiveConfig.tiltAngle) || 0,
    position: effectiveConfig.position || 'center',
    offsetY: effectiveConfig.offsetY !== undefined && effectiveConfig.offsetY !== null ? Number(effectiveConfig.offsetY) : 50,
    hasBox: !!effectiveConfig.hasBox,
    boxStyle: effectiveConfig.boxStyle || (effectiveConfig.hasBox ? 'dark_soft' : 'none'),
    boxOpacity: effectiveConfig.boxOpacity !== undefined ? Number(effectiveConfig.boxOpacity) : 75,
    photoUrl: photoUrl || effectiveConfig.photoUrl || null,
    updatedAt: new Date().toISOString(),
  };

  // Funktion zum Speichern von style.json und project.json
  const saveStyleAndManifest = () => {
    fs.writeFileSync(styleJsonPath, JSON.stringify(styleData, null, 2), 'utf-8');

    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        manifest.thumbnail = 'thumbnail/thumbnail.jpg';
        manifest.title = titleToRender;
        manifest.headlineConfig = styleData;
        manifest.thumbnail_updated_at = styleData.updatedAt;
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {}
    }
    return styleData;
  };

  // A) Nur Headline neu formatieren oder gewähltes Foto als Hintergrund verwenden
  if (mode === 'apply_headline') {
    const targetPhoto = photoUrl || effectiveConfig.photoUrl;
    let sourceFile = null;
    if (targetPhoto && targetPhoto.startsWith('/news-static/')) {
      const cleanSubPath = targetPhoto.replace('/news-static/', '').split('?')[0];
      sourceFile = path.join(newsDir, decodeURIComponent(cleanSubPath));
    } else if (targetPhoto && targetPhoto.startsWith('photos/')) {
      sourceFile = path.join(targetFolder, targetPhoto);
    }

    if (!sourceFile || !fs.existsSync(sourceFile)) {
      const photosDir = path.join(targetFolder, 'photos');
      if (fs.existsSync(photosDir)) {
        const photoList = fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f));
        if (photoList.length > 0) sourceFile = path.join(photosDir, photoList[0]);
      }
    }

    if (sourceFile && fs.existsSync(sourceFile)) {
      const scaleCmd = `ffmpeg -y -i "${sourceFile}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[v]" -map "[v]" -q:v 2 "${destSub}"`;
      try {
        execSync(scaleCmd, { timeout: 10000 });
      } catch {
        fs.copyFileSync(sourceFile, destSub);
      }
      fs.copyFileSync(destSub, rawBackgroundPath);
    } else if (fs.existsSync(rawBackgroundPath)) {
      fs.copyFileSync(rawBackgroundPath, destSub);
    }
    overlayRussianHeadlineOnThumbnail(destSub, titleToRender, styleData);

    const finalStyle = saveStyleAndManifest();

    return {
      success: true,
      thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
      folderName: path.basename(targetFolder),
      style: finalStyle,
    };
  }

  // B) Neue KI-Bildgenerierung (Gemini 16:9)
  if (mode === 'generate_ai' || mode === 'auto') {
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

    const promptEn = await generate4CornerAiPrompt(
      fullNewsTitle,
      scriptText,
      availablePhotos.map(p => path.basename(p))
    );

    let aiSuccess = false;
    const geminiBuffer = await generateGeminiImage(promptEn);
    if (geminiBuffer && geminiBuffer.length > 5000) {
      fs.writeFileSync(tempRaw, geminiBuffer);
      try {
        execSync(`ffmpeg -y -i "${tempRaw}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -q:v 2 "${destSub}"`, { timeout: 10000 });
        try { fs.unlinkSync(tempRaw); } catch {}
      } catch {
        fs.writeFileSync(destSub, geminiBuffer);
      }
      aiSuccess = true;
    }

    if (!aiSuccess && availablePhotos.length > 0) {
      const singlePhoto = availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
      const ffmpegCmd = `ffmpeg -y -i "${singlePhoto}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,gblur=sigma=40,eq=brightness=-0.05:contrast=1.15[bg];[0:v]scale=1280:720:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -q:v 2 "${destSub}"`;
      try {
        execSync(ffmpegCmd, { timeout: 15000 });
      } catch {
        fs.copyFileSync(singlePhoto, destSub);
      }
    }

    fs.copyFileSync(destSub, rawBackgroundPath);
    overlayRussianHeadlineOnThumbnail(destSub, titleToRender, styleData);
  } else {
    let sourceFile = null;
    if (photoUrl && photoUrl.startsWith('/news-static/')) {
      const cleanSubPath = photoUrl.replace('/news-static/', '').split('?')[0];
      sourceFile = path.join(newsDir, decodeURIComponent(cleanSubPath));
    }

    if (sourceFile && fs.existsSync(sourceFile)) {
      const scaleCmd = `ffmpeg -y -i "${sourceFile}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[v]" -map "[v]" -q:v 2 "${destSub}"`;
      try {
        execSync(scaleCmd, { timeout: 10000 });
      } catch {
        fs.copyFileSync(sourceFile, destSub);
      }
    } else if (photoUrl && photoUrl.startsWith('http')) {
      const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(6000) });
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(destSub, buffer);
      }
    }

    fs.copyFileSync(destSub, rawBackgroundPath);
    overlayRussianHeadlineOnThumbnail(destSub, titleToRender, styleData);
  }

  const finalStyle = saveStyleAndManifest();

  return {
    success: true,
    thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
    folderName: path.basename(targetFolder),
    style: finalStyle,
  };
}
