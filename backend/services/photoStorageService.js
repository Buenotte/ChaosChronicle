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

  // 1. Zuerst alle Bilddaten in den Speicher laden (verhindert Überschreib-Kollisionen beim Umsortieren)
  const preparedBuffers = [];
  for (let i = 0; i < photos.length; i++) {
    const rawPhoto = photos[i];
    const imgUrl = typeof rawPhoto === 'string' ? rawPhoto : (rawPhoto?.url || rawPhoto?.src || '');
    if (!imgUrl) continue;
    let ext = imgUrl.match(/\.(jpg|jpeg|png|webp|avif)/i)?.[1]?.toLowerCase() || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';

    // A. Lokale Datei
    const cleanUrl = imgUrl.replace(/^https?:\/\/[^\/]+/, '');
    if (cleanUrl.startsWith('/news-static/')) {
      const relativePath = decodeURIComponent(cleanUrl.replace(/^\/news-static\//, ''));
      const fullLocalPath = path.resolve(newsDir, relativePath);
      const directLocalPath = path.resolve(photosDir, path.basename(relativePath));
      if (fs.existsSync(fullLocalPath)) {
        try {
          const buf = fs.readFileSync(fullLocalPath);
          preparedBuffers.push({ buf, ext });
          continue;
        } catch {}
      } else if (fs.existsSync(directLocalPath)) {
        try {
          const buf = fs.readFileSync(directLocalPath);
          preparedBuffers.push({ buf, ext });
          continue;
        } catch {}
      }
    }

    // B. Base64 Data URL
    if (imgUrl.startsWith('data:image/')) {
      try {
        const matches = imgUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const dataExt = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const buf = Buffer.from(matches[2], 'base64');
          preparedBuffers.push({ buf, ext: dataExt });
          continue;
        }
      } catch {}
    }

    // C. Web-Download mit robustem Header & Fallback
    try {
      let imgRes = await fetch(imgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!imgRes.ok) {
        // Fallback-Versuch ohne spezifischen Accept-Header
        try {
          imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(8000) });
        } catch {}
      }

      if (imgRes && imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        if (buf.length > 0) {
          preparedBuffers.push({ buf, ext });
        }
      } else {
        console.warn(`[Photos] HTTP ${imgRes?.status || 'ERR'} beim Download: ${imgUrl.slice(0, 80)}`);
      }
    } catch (err) {
      console.error(`[Photos] Fehler beim Download von Bild ${imgUrl.slice(0, 80)}:`, err.message);
    }
  }

  // 2. Ziel-Dateien in der neuen exakten Reihenfolge photo_01, photo_02... schreiben
  const activeFilenames = new Set();
  const savedPhotos = [];
  for (let i = 0; i < preparedBuffers.length; i++) {
    const { buf, ext } = preparedBuffers[i];
    const targetFilename = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
    const targetPath = path.join(photosDir, targetFilename);
    fs.writeFileSync(targetPath, buf);
    activeFilenames.add(targetFilename);
    savedPhotos.push(`photos/${targetFilename}`);
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
