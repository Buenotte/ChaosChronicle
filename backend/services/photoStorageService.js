import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

function cleanMatchTitle(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
}

export async function saveNewsPhotos({ title = 'News', bundleDir: inputBundleDir, folderName, photos = [] }) {
  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) {
    bundleDir = path.join(newsDir, folderName);
  }

  if (!bundleDir && title && fs.existsSync(newsDir)) {
    const cleanQuery = cleanMatchTitle(title);
    const dirs = fs.readdirSync(newsDir, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const targetDir = path.join(newsDir, d.name);
      const jsonPath = path.join(targetDir, 'project.json');
      let manifestTitle = '';
      let manifestOrig = '';
      if (fs.existsSync(jsonPath)) {
        try {
          const m = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          manifestTitle = cleanMatchTitle(m.title);
          manifestOrig = cleanMatchTitle(m.original_title);
        } catch {}
      }
      const folderClean = cleanMatchTitle(d.name.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, ''));
      if (
        (manifestOrig && (cleanQuery.includes(manifestOrig.slice(0, 12)) || manifestOrig.includes(cleanQuery.slice(0, 12)))) ||
        (manifestTitle && (cleanQuery.includes(manifestTitle.slice(0, 12)) || manifestTitle.includes(cleanQuery.slice(0, 12)))) ||
        (folderClean && (cleanQuery.includes(folderClean.slice(0, 12)) || folderClean.includes(cleanQuery.slice(0, 12))))
      ) {
        bundleDir = targetDir;
        break;
      }
    }
  }

  if (!bundleDir) {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').replace(/_+/g, '_').slice(0, 80);
    bundleDir = path.join(newsDir, `${dateStr}_${safeTitle}`);
  }

  const photosDir = path.join(bundleDir, 'photos');
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  const activeFilenames = new Set();
  const savedPhotos = [];

  for (let i = 0; i < photos.length; i++) {
    const imgUrl = typeof photos[i] === 'string' ? photos[i] : photos[i]?.url;
    if (!imgUrl) continue;

    const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
    const targetFilename = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
    const targetPath = path.join(photosDir, targetFilename);

    if (imgUrl.startsWith('/news-static/')) {
      const relativePath = decodeURIComponent(imgUrl.replace(/^\/news-static\//, ''));
      const fullLocalPath = path.resolve(newsDir, relativePath);
      if (fs.existsSync(fullLocalPath)) {
        if (fullLocalPath !== targetPath) {
          const buf = fs.readFileSync(fullLocalPath);
          fs.writeFileSync(targetPath, buf);
        }
        activeFilenames.add(targetFilename);
        savedPhotos.push(`photos/${targetFilename}`);
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
        fs.writeFileSync(targetPath, buffer);
        activeFilenames.add(targetFilename);
        savedPhotos.push(`photos/${targetFilename}`);
      }
    } catch (err) {
      console.error(`Fehler beim Download von Bild ${imgUrl}:`, err.message);
    }
  }

  // Lösche nur Dateien, die nicht mehr in der aktiven Auswahl sind
  try {
    const allFiles = fs.readdirSync(photosDir);
    for (const file of allFiles) {
      if (!activeFilenames.has(file)) {
        try { fs.unlinkSync(path.join(photosDir, file)); } catch {}
      }
    }
  } catch {}

  const jsonPath = path.join(bundleDir, 'project.json');
  let manifest = {};
  if (fs.existsSync(jsonPath)) {
    try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
  }
  if (title && !manifest.title) {
    manifest.title = title;
    manifest.original_title = title;
  }
  manifest.photos = savedPhotos;
  manifest.photos_count = savedPhotos.length;
  manifest.photos_updated_at = new Date().toISOString();

  fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return {
    success: true,
    bundleDir,
    folderName: path.basename(bundleDir),
    savedPhotosCount: savedPhotos.length,
    photos: savedPhotos,
  };
}

export function deleteNewsPhoto({ bundleDir, folderName, photoUrl }) {
  let targetDir = bundleDir;
  if (!targetDir && folderName) {
    targetDir = path.join(newsDir, folderName);
  }
  if (!targetDir || !photoUrl) {
    return { success: false, error: 'bundleDir and photoUrl required' };
  }

  try {
    const relativePath = decodeURIComponent(photoUrl.replace(/^\/news-static\//, ''));
    const filePath = path.resolve(newsDir, relativePath);
    if (fs.existsSync(filePath) && filePath.startsWith(targetDir)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Foto gelöscht: ${filePath}`);
      return { success: true, deleted: true };
    }
  } catch (err) {
    console.error('Fehler beim Löschen des Fotos:', err.message);
  }
  return { success: false, error: 'File not found or invalid path' };
}

export async function saveSingleNewsPhoto({ title = 'News', bundleDir: inputBundleDir, folderName, photoUrl }) {
  if (!photoUrl) {
    return { success: false, error: 'photoUrl is required' };
  }

  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) {
    bundleDir = path.join(newsDir, folderName);
  }

  if (!bundleDir && title && fs.existsSync(newsDir)) {
    const cleanQuery = cleanMatchTitle(title);
    const dirs = fs.readdirSync(newsDir, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const targetDir = path.join(newsDir, d.name);
      const jsonPath = path.join(targetDir, 'project.json');
      let manifestTitle = '';
      let manifestOrig = '';
      if (fs.existsSync(jsonPath)) {
        try {
          const m = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          manifestTitle = cleanMatchTitle(m.title);
          manifestOrig = cleanMatchTitle(m.original_title);
        } catch {}
      }
      const folderClean = cleanMatchTitle(d.name.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, ''));
      if (
        (manifestOrig && (cleanQuery.includes(manifestOrig.slice(0, 12)) || manifestOrig.includes(cleanQuery.slice(0, 12)))) ||
        (manifestTitle && (cleanQuery.includes(manifestTitle.slice(0, 12)) || manifestTitle.includes(cleanQuery.slice(0, 12)))) ||
        (folderClean && (cleanQuery.includes(folderClean.slice(0, 12)) || folderClean.includes(cleanQuery.slice(0, 12))))
      ) {
        bundleDir = targetDir;
        break;
      }
    }
  }

  if (!bundleDir) {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').replace(/_+/g, '_').slice(0, 80);
    bundleDir = path.join(newsDir, `${dateStr}_${safeTitle}`);
  }

  const photosDir = path.join(bundleDir, 'photos');
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  const existingFiles = fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp)/i.test(f));
  const nextNum = existingFiles.length + 1;
  const ext = photoUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
  const targetFilename = `photo_${String(nextNum).padStart(2, '0')}.${ext}`;
  const targetPath = path.join(photosDir, targetFilename);

  if (photoUrl.startsWith('/news-static/')) {
    const relativePath = decodeURIComponent(photoUrl.replace(/^\/news-static\//, ''));
    const fullLocalPath = path.resolve(newsDir, relativePath);
    if (fs.existsSync(fullLocalPath) && fullLocalPath !== targetPath) {
      fs.writeFileSync(targetPath, fs.readFileSync(fullLocalPath));
    }
  } else {
    const imgRes = await fetch(photoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!imgRes.ok) {
      throw new Error(`Fehler beim Downloaden des Bildes (HTTP ${imgRes.status})`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);
  }

  // Обновляем project.json
  const jsonPath = path.join(bundleDir, 'project.json');
  let manifest = {};
  if (fs.existsSync(jsonPath)) {
    try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
  }
  if (title && !manifest.title) {
    manifest.title = title;
    manifest.original_title = title;
  }
  const updatedFiles = fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp)/i.test(f));
  manifest.photos = updatedFiles.map(f => `photos/${f}`);
  manifest.photos_count = updatedFiles.length;
  manifest.photos_updated_at = new Date().toISOString();
  fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

  const folderBase = path.basename(bundleDir);
  return {
    success: true,
    bundleDir,
    folderName: folderBase,
    filename: targetFilename,
    localUrl: `/news-static/${folderBase}/photos/${targetFilename}`,
    totalPhotos: updatedFiles.length,
  };
}
