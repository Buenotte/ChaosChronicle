import express from 'express';
import {
  autoFetchPackagePhotos,
  generate30VisualQueries,
  getPackagePhotoQueries,
  savePackagePhotoQueries,
} from '../services/autoPhotoService.js';

const router = express.Router();

// GET /api/package-photo-queries
// Fetch saved visual search queries for a package
router.get('/api/package-photo-queries', (req, res) => {
  try {
    const { folderName, bundleDir } = req.query;
    const queries = getPackagePhotoQueries(folderName, bundleDir);
    res.json({ success: true, count: queries.length, queries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auto-fetch-photos
// Automatically generates visual queries (or uses customQueries), downloads matching web photos and saves them to package
router.post('/api/auto-fetch-photos', async (req, res) => {
  try {
    const {
      folderName,
      bundleDir,
      title,
      scriptText,
      count = 100,
      engine = 'all',
      customQueries = null,
    } = req.body;

    if (!folderName && !bundleDir) {
      return res.status(400).json({
        success: false,
        error: 'Требуется указать folderName или bundleDir пакета',
      });
    }

    const result = await autoFetchPackagePhotos({
      folderName,
      bundleDir,
      title,
      scriptText,
      count,
      engine,
      customQueries,
    });

    res.json(result);
  } catch (err) {
    console.error('❌ Ошибка автоматической загрузки фото:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Ошибка загрузки фото',
    });
  }
});

// POST /api/generate-photo-queries
// Generates visual search queries without downloading yet, optionally saving to package
router.post('/api/generate-photo-queries', async (req, res) => {
  try {
    const { scriptText = '', title = '', count = 100, folderName, bundleDir } = req.body;
    const queries = await generate30VisualQueries(scriptText, title, count);
    if (folderName || bundleDir) {
      savePackagePhotoQueries(folderName, bundleDir, queries);
    }
    res.json({ success: true, count: queries.length, queries });
  } catch (err) {
    console.error('❌ Ошибка генерации запросов:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

