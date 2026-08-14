import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Route Module
import newsRoutes from './routes/news.js';
import photosRoutes from './routes/photos.js';
import feuilletonRoutes from './routes/feuilleton.js';
import packagesRoutes from './routes/packages.js';
import audioRoutes from './routes/audio.js';
import videoRoutes from './routes/video.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Status
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Routen registrieren
app.use(newsRoutes);
app.use(photosRoutes);
app.use(feuilletonRoutes);
app.use(packagesRoutes);
app.use(audioRoutes);
app.use(videoRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 ChaosChronicle Backend läuft auf http://localhost:${PORT}`);
  console.log(`📰 News API: http://localhost:${PORT}/api/news`);
});
