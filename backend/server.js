import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import Parser from 'rss-parser';

const app = express();
const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'ChaosChronicle/1.0' }
});

// ── SSE Job Store für Video-Fortschritt ─────────────────────────────────────
const videoJobs = new Map(); // jobId -> { clients: Set, progress: number, status: string, log: string }

app.use(cors());
app.use(express.json());

// RSS Feed Quellen – NUR unabhängige russischsprachige Medien (keine russischen Staatsmedien)
const FEEDS = [
  // 🎭 Культура & Общество
  { url: 'https://meduza.io/rss/all',                                       category: 'kultura',   source: 'Meduza' },
  { url: 'https://novayagazeta.eu/rss',                                     category: 'kultura',   source: 'Новая газета Европа' },
  { url: 'https://zona.media/rss',                                          category: 'kultura',   source: 'Медиазона' },
  { url: 'https://rss.dw.com/rdf/rss-ru-all',                              category: 'kultura',   source: 'Deutsche Welle RU' },

  // 🏛️ Политика
  { url: 'https://www.svoboda.org/api/zqpqe-mopot',                         category: 'politika',  source: 'Радио Свобода' },
  { url: 'https://www.bbc.com/russian/index.xml',                           category: 'politika',  source: 'BBC Русская служба' },
  { url: 'https://rss.dw.com/rdf/rss-ru-pol',                              category: 'politika',  source: 'DW Политика' },
  { url: 'https://www.currenttime.tv/api/zqpqe-mopot',                     category: 'politika',  source: 'Настоящее Время' },

  // 🤖 Технологии
  { url: 'https://habr.com/ru/rss/hubs/all/',                               category: 'tekh',      source: 'Хабр' },
  { url: 'https://rss.dw.com/rdf/rss-ru-sci',                              category: 'tekh',      source: 'DW Наука & Техника' },
  { url: 'https://meduza.io/rss/shapito',                                   category: 'tekh',      source: 'Meduza Технологии' },

  // 📈 Экономика
  { url: 'https://rss.dw.com/rdf/rss-ru-eco',                              category: 'ekonomika', source: 'DW Экономика' },
  { url: 'https://www.bbc.com/russian/topics/business.xml',                 category: 'ekonomika', source: 'BBC Экономика' },
  { url: 'https://meduza.io/rss/news',                                      category: 'ekonomika', source: 'Meduza Новости' },

  // 🌍 Мир
  { url: 'https://www.bbc.com/russian/topics/world.xml',                    category: 'mir',       source: 'BBC Мир' },
  { url: 'https://rss.dw.com/rdf/rss-ru-all',                              category: 'mir',       source: 'DW Мир' },
  { url: 'https://www.svoboda.org/api/zqpqe-mopot',                         category: 'mir',       source: 'Радио Свобода' },

  // ⚽ Спорт
  { url: 'https://www.sports.ru/rss/posts.xml',                             category: 'sport',     source: 'Sports.ru' },
  { url: 'https://www.eurosport.ru/rss.xml',                                category: 'sport',     source: 'Eurosport RU' },
  { url: 'https://rss.dw.com/rdf/rss-ru-sport',                            category: 'sport',     source: 'DW Спорт' },

  // 🇺🇦 Война в Украине
  { url: 'https://www.bbc.com/russian/topics/ukraine.xml',                  category: 'ukraina',   source: 'BBC Украина' },
  { url: 'https://meduza.io/rss/Ukraine',                                   category: 'ukraina',   source: 'Meduza Украина' },
  { url: 'https://rss.dw.com/rdf/rss-ru-ukr',                              category: 'ukraina',   source: 'DW Украина' },
  { url: 'https://www.currenttime.tv/api/zmmqo-mopot',                     category: 'ukraina',   source: 'Настоящее Время' },
  { url: 'https://novayagazeta.eu/rss',                                     category: 'ukraina',   source: 'Новая газета Европа' },
];

function cleanText(text = '') {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImages(item) {
  const images = [];

  // 1. Enclosure
  if (item.enclosure?.url && /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url)) {
    images.push(item.enclosure.url);
  }

  // 2. Media thumbnail & content
  const mediaContent = item['media:content'] || item['media:thumbnail'];
  if (mediaContent) {
    const list = Array.isArray(mediaContent) ? mediaContent : [mediaContent];
    list.forEach(m => {
      const url = m?.['$']?.url || m?.url;
      if (url) images.push(url);
    });
  }

  // 3. Media group
  if (item['media:group']?.['media:content']) {
    const groupList = Array.isArray(item['media:group']['media:content'])
      ? item['media:group']['media:content']
      : [item['media:group']['media:content']];
    groupList.forEach(m => {
      const url = m?.['$']?.url || m?.url;
      if (url) images.push(url);
    });
  }

  // 4. Extract all <img> tags from content / summary
  const fullHtml = (item['content:encoded'] || '') + (item.content || '') + (item.summary || '') + (item.description || '');
  const imgMatches = fullHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const match of imgMatches) {
    if (match[1] && /^https?:\/\//i.test(match[1]) && !match[1].includes('pixel') && !match[1].includes('tracker')) {
      images.push(match[1]);
    }
  }

  // Deduplizieren & leere Filtern
  const uniqueImages = [...new Set(images)];
  return {
    imageUrl: uniqueImages[0] || null,
    images: uniqueImages,
  };
}

function getRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  if (isNaN(date)) return '';
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `Vor ${diffMins} Min`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `Vor ${diffHrs} Std`;
  const diffDays = Math.floor(diffHrs / 24);
  return `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
}

const cacheFilePath = path.join(__dirname, 'cache_news.json');

// Cache für Feeds (Wird NUR bei explizitem Button-Klick ↻ im Browser aktualisiert!)
let newsCache = [];
let lastFetch = 0;
if (fs.existsSync(cacheFilePath)) {
  try {
    const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    newsCache = cachedData.articles || [];
    lastFetch = cachedData.lastFetch || 0;
    console.log(`📦 ${newsCache.length} Nachrichten aus lokalem Festplatten-Cache geladen (cache_news.json). F5 sucht NICHT im Internet.`);
  } catch (e) {
    console.error('Fehler beim Lesen von cache_news.json:', e.message);
  }
}

async function fetchAllFeeds(forceRefresh = false) {
  // Wenn bereits Nachrichten im Cache sind und kein erzwungener Button-Klick vorliegt, gib den Cache sofort zurück!
  if (!forceRefresh && newsCache.length > 0) {
    return newsCache;
  }

  console.log(forceRefresh ? '↻ Nachrichten werden auf Button-Klick neu im Internet gesucht...' : '📰 Erste Nachrichten-Suche...');

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return parsed.items.slice(0, 15).map((item, idx) => {
        const imgData = extractImages(item);
        return {
          id: `${feed.source}-${idx}-${Date.now()}`,
          title: cleanText(item.title || ''),
          summary: cleanText(item.contentSnippet || item.summary || '').slice(0, 200),
          url: item.link || item.guid || '',
          imageUrl: imgData.imageUrl,
          images: imgData.images,
          source: feed.source,
          category: feed.category,
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          relativeTime: getRelativeTime(item.pubDate || item.isoDate),
        };
      });
    })
  );

  const articles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)); // Neueste zuerst

  newsCache = articles;
  lastFetch = Date.now();

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify({ lastFetch, articles }, null, 2), 'utf-8');
  } catch (e) {
    console.error('Fehler beim Speichern von cache_news.json:', e.message);
  }

  return articles;
}

// GET /api/news?category=alle|feuilleton|politik|tech|wirtschaft&force=true
app.get('/api/news', async (req, res) => {
  try {
    const { category = 'alle', force = 'false' } = req.query;
    const isForce = force === 'true';
    const all = await fetchAllFeeds(isForce);

    let filtered = all;
    if (category !== 'alle' && category !== 'vse') {
      filtered = all.filter(a => a.category === category);
    }

    res.json({
      success: true,
      count: filtered.length,
      total: all.length,
      lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
      wasRefreshed: isForce,
      articles: filtered,
    });
  } catch (err) {
    console.error('RSS Fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Vollständiger Artikel-Web-Scraper für Fotos (mit Zeitfilter max. 24h) ────
async function scrapeArticlePhotos(articleUrl, articlePubDate = null) {
  if (!articleUrl || !/^https?:\/\//i.test(articleUrl)) return [];

  // Zeitprüfungs-Schwellenwert: STRIKT maximal 24 Stunden alt!
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
      signal: AbortSignal.timeout(7000), // 7 Sekunden Timeout
    });

    if (!res.ok) return [];
    const html = await res.text();

    // Extrahiere PubDate aus HTML Meta Tags falls im RSS nicht vorhanden
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

    // Helper für absolute URLs & Jahresfilter
    const toAbs = (src) => {
      if (!src) return null;
      try {
        let abs = src;
        if (src.startsWith('//')) abs = 'https:' + src;
        else if (!src.startsWith('http')) abs = new URL(src, baseUrl).href;

        // Prüfe ob Bild-URL alte Jahreszahlen in Pfaden enthält (z. B. /2021/, /2022/, /2023/, /2024/, /2025/)
        const oldYearsRegex = /\/(201\d|202[0-5])\//;
        if (oldYearsRegex.test(abs)) {
          return null; // Altes Archivbild verwerfen!
        }
        return abs;
      } catch {
        return null;
      }
    };

    // 1. OG & Twitter Meta Tags (Höchste Auflösung)
    const metaMatches = html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/gi);
    for (const m of metaMatches) {
      const abs = toAbs(m[1]);
      if (abs) photos.push(abs);
    }

    // Reverse meta search (content vor property)
    const metaMatches2 = html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi);
    for (const m of metaMatches2) {
      const abs = toAbs(m[1]);
      if (abs) photos.push(abs);
    }

    // 2. <figure>, <picture> und <img> Tags aus dem Hauptinhalt
    const imgMatches = html.matchAll(/<img[^>]+(?:src|data-src|srcset)=["']([^"'\s,]+)["']/gi);
    for (const m of imgMatches) {
      const abs = toAbs(m[1]);
      if (abs && /\.(jpg|jpeg|png|webp|gif)/i.test(abs)) {
        // Filtere Systemicons, Logos, Tracker und Kleinbilder heraus
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

// ── Active Live News Photo Search (DuckDuckGo & Weltagenturen Suche) ──────────────
async function fetchDDGPhotos(query) {
  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!tokenRes.ok) return [];
    const text = await tokenRes.text();
    const vqdMatch = text.match(/vqd=([0-9-]+)/);
    if (!vqdMatch || !vqdMatch[1]) return [];

    const imgRes = await fetch(`https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqdMatch[1]}`, {
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
    const primarySubject = keyNouns[0] ? keyNouns[0].toLowerCase().slice(0, 5) : ''; // z.B. "башко"
    const keywords = keyNouns.join(' ');

    if (!keywords) return [];

    const [mainResults, agencyResults] = await Promise.all([
      fetchDDGPhotos(`"${keywords}"`),
      fetchDDGPhotos(`${keywords} фото репортаж`),
    ]);

    const combined = [...mainResults, ...agencyResults];
    const photos = [];
    const seen = new Set();

    // Wörterbuch für unerwünschte Infografiken, Schul-Instruktionen, Vektoren
    const junkWords = ['инструкция', 'памятка', 'обучающих', 'учащих', 'школ', 'урок', 'плакат', 'схема', 'вектор', 'vector', 'stock', 'drawing', 'illustration', 'логотип', 'правила', 'методичка'];
    const lowerKeyNouns = keyNouns.map(w => w.toLowerCase());

    combined.forEach(item => {
      const imgUrl = item.image;
      if (!imgUrl || !/^https?:\/\//i.test(imgUrl) || !/\.(jpg|jpeg|png|webp)/i.test(imgUrl)) return;
      if (seen.has(imgUrl) || imgUrl.includes('pixel') || imgUrl.includes('tracker') || imgUrl.includes('logo')) return;

      const itemTitleLower = (item.title || '').toLowerCase();
      const imgUrlLower = imgUrl.toLowerCase();

      // 1. Ausschluss von Schul-Instruktionen, Infografiken, Vektoren
      const isJunk = junkWords.some(j => itemTitleLower.includes(j) || imgUrlLower.includes(j));
      if (isJunk) return;

      // 2. Erforderlicher Relevanz-Match (Hauptthema ODER mind. 2 Schlagwörter)
      const matchesCount = lowerKeyNouns.filter(noun => itemTitleLower.includes(noun) || imgUrlLower.includes(noun)).length;
      const matchesPrimary = primarySubject && (itemTitleLower.includes(primarySubject) || imgUrlLower.includes(primarySubject));

      if (matchesPrimary || matchesCount >= 2) {
        seen.add(imgUrl);
        const provider = item.provider || item.source || 'Пресс-служба / Информагентство';
        photos.push({
          url: imgUrl,
          source: provider,
          articleTitle: item.title || queryTitle,
          isExactArticle: false,
        });
      }
    });

    return photos.slice(0, 35);
  } catch (err) {
    console.error('Live photo search error:', err.message);
    return [];
  }
}

// Custom UTF-8 Dekodierung für Windows-Pfade mit kyrillischen Zeichen in news/
app.get('/news-static/*', (req, res) => {
  try {
    const rawSubPath = req.params[0] || '';
    const decodedSubPath = decodeURIComponent(rawSubPath);
    const fullPath = path.resolve(__dirname, '../news', decodedSubPath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return res.sendFile(fullPath);
    }
    return res.status(404).send('File not found');
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

// GET /api/news-photos?title=...&url=...
app.get('/api/news-photos', async (req, res) => {
  try {
    const { title = '', articleId = '', url = '', category = 'alle', forceLive = 'false' } = req.query;
    const isForceLive = forceLive === 'true' || forceLive === '1';

    // 0. Prüfe, ob für diese Nachricht bereits ein Paket in news/ existiert (außer bei forceLive)
    const newsDir = path.resolve(__dirname, '../news');
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

    // Finde den passenden Artikel im Speicher
    const exactArticle = newsCache.find(a =>
      a.id === articleId ||
      (a.url && url && a.url === url) ||
      (a.title && title && a.title.toLowerCase().includes(title.toLowerCase().slice(0, 30)))
    );

    const targetUrl = url || exactArticle?.url;

    // 1. Web-Scrape die Original-Webseite dieser Nachricht → quality='article'
    if (targetUrl) {
      const scrapedImages = await scrapeArticlePhotos(targetUrl, exactArticle?.pubDate);
      scrapedImages.forEach(imgUrl => {
        if (!seen.has(imgUrl)) {
          seen.add(imgUrl);
          photos.push({
            url: imgUrl,
            source: exactArticle?.source || new URL(targetUrl).hostname.replace('www.', ''),
            articleTitle: exactArticle?.title || title,
            isExactArticle: true,
            quality: 'article',
          });
        }
      });
    }

    // 2. Ergänze RSS-Bilder des Artikels → quality='rss'
    if (exactArticle && exactArticle.images) {
      exactArticle.images.forEach(imgUrl => {
        if (!seen.has(imgUrl)) {
          seen.add(imgUrl);
          photos.push({
            url: imgUrl,
            source: exactArticle.source,
            articleTitle: exactArticle.title,
            isExactArticle: true,
            quality: 'rss',
          });
        }
      });
    }

    // 3. AKTIVE LIVE-SUCHE: Bei forceLive oder wenn weniger als 30 Bilder → quality='search'
    if ((isForceLive || photos.length < 30) && title) {
      const livePhotos = await searchLiveNewsPhotos(title);
      livePhotos.forEach(p => {
        if (photos.length < 35 && !seen.has(p.url)) {
          seen.add(p.url);
          photos.push({ ...p, quality: 'search' });
        }
      });
    }

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

// ── Feuilleton KI Generator ──────────────────────────────────────────────────
const MODELS = {
  gemini:   'google/gemini-2.5-flash',
  deepseek: 'deepseek/deepseek-chat',
  qwen:     'qwen/qwen-2.5-72b-instruct',
  free:     'openrouter/free',
};

const SATIRE_PROMPT = `Du bist ein Meister des giftigen satirischen Feuilletons und der dunklen Alltagskomödie (im Stil von "Fight Club" und scharfer moderner Gesellschaftssatire). Schreibe auf Russisch.

STIL-REGELN (Böse Satire & Dunkles Alltagsfeuilleton):
1. STRIKTES VERBOT von «МЫ» (kein «мы создали», «мы привыкли»). Nutze 3. Person («существо», «паразит», «менеджер», «элита») oder «вы».
2. Giftige Metaphern: «вирус бесполезности», «хрустальный цветок XXI века», «каста офисных паразитов», «стерильная звенящая пустота».
3. Groteske Hyperbel: Anruf ohne SMS = zivilisatorischer Terrorakt. Punkt im Chat statt Emoji = Woche psychologische Reha. Bett machen = Mount Everest.
4. Scharfe Satire auf Zoom-Management (Konferenzen über Konferenzen, Entscheidungen ausweichen wie Neo in Matrix) und Polit-Eliten.
5. Exakt 3 bis 4 Absätze, ~420 Wörter gesamt (exakt 3:00 Minuten Vorlesezeit bei 140 Wörtern/Min).
6. NUR reiner Sprechertext, keine Nummern, keine Klammerbemerkungen im Text.
7. Am Ende JEDES Absatzes: eine Zeile [B-Roll: Визуальный кадр / Иллюстрация к новости на английском] mit konkreten Bild- und Kadermotiven für die visuelle Gestaltung des Videos.`;

app.post('/api/generate-feuilleton', async (req, res) => {
  const { title, summary, model = 'gemini', source = '' } = req.body;
  const modelId = MODELS[model] || MODELS.gemini;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.includes('HIER')) {
    return res.status(500).json({ success: false, error: 'OpenRouter API Key nicht konfiguriert in .env' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'ChaosChronicle',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: SATIRE_PROMPT },
          { role: 'user', content: `ТЕМА: ${title}\n\nКОНТЕКСТ: ${summary || ''}` },
        ],
        max_tokens: 1800,
        temperature: 0.88,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.round((words / 140) * 10) / 10;

    // Hauptordner C:\Projekte\ChaosChronicle\news\ anlegen
    const newsDir = path.resolve(__dirname, '../news');
    if (!fs.existsSync(newsDir)) {
      fs.mkdirSync(newsDir, { recursive: true });
    }

    // Dateiname formatieren
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = (title || 'Feuilleton')
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')
      .slice(0, 40);

    // Spezifischen Unterordner für dieses Projekt anlegen
    const bundleDir = path.join(newsDir, `${dateStr}_${safeTitle}`);
    const photosDir = path.join(bundleDir, 'photos');
    fs.mkdirSync(photosDir, { recursive: true });

    // 1. Markdown-Datei mit eingebetteten Bildern erstellen
    const imagesList = Array.isArray(req.body.images) && req.body.images.length > 0
      ? req.body.images
      : (req.body.imageUrl ? [req.body.imageUrl] : []);

    let imageIdx = 0;
    const textWithEmbeddedImages = text.split('\n\n').map(p => {
      if (p.startsWith('[B-Roll:')) {
        const currentImg = imagesList[imageIdx % (imagesList.length || 1)];
        imageIdx++;
        return `${p}\n${currentImg ? `![Иллюстрация к новости](${currentImg})` : ''}`;
      }
      return p;
    }).join('\n\n');

    const mdContent = `# 🎭 ${title}\n\n- **Дата**: ${now.toLocaleString('ru-RU')}\n- **Модель ИИ**: ${modelId}\n- **Хронометраж**: ~${minutes} мин.\n- **Количество слов**: ${words}\n- **Источник**: ${source || 'RSS Feed'}\n\n---\n\n${textWithEmbeddedImages}\n`;
    const mdPath = path.join(bundleDir, 'script.md');
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    // 2. Reinen Sprecher-Text ohne B-Rolls für KI-Voice / TTS anlegen
    const cleanSpeechText = text
      .split('\n\n')
      .filter(p => !p.startsWith('[B-Roll:'))
      .join('\n\n');
    const txtPath = path.join(bundleDir, 'script.txt');
    fs.writeFileSync(txtPath, cleanSpeechText, 'utf-8');

    // 3. Echte Nachrichten-Fotos als Bilddateien im Unterordner photos/ speichern
    const savedPhotos = [];
    for (let i = 0; i < Math.min(imagesList.length, 30); i++) {
      const imgUrl = imagesList[i];
      try {
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(5000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
          const imgFileName = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
          const imgPath = path.join(photosDir, imgFileName);
          fs.writeFileSync(imgPath, buffer);
          savedPhotos.push(`photos/${imgFileName}`);
        }
      } catch (err) {
        console.error(`Fehler beim Herunterladen von Bild ${imgUrl}:`, err.message);
      }
    }

    // 4. project.json Manifest-Datei für automatisierte Video-Generierung erstellen
    const projectManifest = {
      title,
      source,
      model: modelId,
      date: now.toISOString(),
      duration_target_seconds: Math.round(minutes * 60),
      word_count: words,
      speech_text_file: 'script.txt',
      markdown_file: 'script.md',
      photos: savedPhotos,
    };
    const jsonPath = path.join(bundleDir, 'project.json');
    fs.writeFileSync(jsonPath, JSON.stringify(projectManifest, null, 2), 'utf-8');

    res.json({
      success: true,
      text,
      model: modelId,
      words,
      minutes,
    });
  } catch (err) {
    console.error('Feuilleton error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-news-package - Speichert das Paket in news/ erst auf Button-Klick im Modal!
app.post('/api/save-news-package', async (req, res) => {
  try {
    const { title = '', text = '', model = 'gemini', source = '', images = [], imageUrl = '' } = req.body;

    const newsDir = path.resolve(__dirname, '../news');
    if (!fs.existsSync(newsDir)) {
      fs.mkdirSync(newsDir, { recursive: true });
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = (title || 'Feuilleton')
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')
      .slice(0, 40);

    const bundleDir = path.join(newsDir, `${dateStr}_${safeTitle}`);
    const photosDir = path.join(bundleDir, 'photos');
    fs.mkdirSync(photosDir, { recursive: true });

    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.round((words / 140) * 10) / 10;

    // 1. Sammle alle verfügbaren Fotos (RSS + Scraper + Live-Suche)
    let imagesList = Array.isArray(images) && images.length > 0
      ? [...images]
      : (imageUrl ? [imageUrl] : []);

    // Falls weniger als 5 Fotos da sind, starte Scraper & Live-Suche nach dem Titel
    if (imagesList.length < 5 && title) {
      try {
        const livePhotos = await searchLiveNewsPhotos(title);
        livePhotos.forEach(p => {
          if (p.url && !imagesList.includes(p.url)) {
            imagesList.push(p.url);
          }
        });
      } catch (e) {
        console.error('Live photos error during save:', e.message);
      }
    }

    // 2. Markdown-Datei
    let imageIdx = 0;
    const textWithEmbeddedImages = text.split('\n\n').map(p => {
      if (p.startsWith('[B-Roll:')) {
        const currentImg = imagesList[imageIdx % (imagesList.length || 1)];
        imageIdx++;
        return `${p}\n${currentImg ? `![Иллюстрация к новости](${currentImg})` : ''}`;
      }
      return p;
    }).join('\n\n');

    const mdContent = `# 🎭 ${title}\n\n- **Дата**: ${now.toLocaleString('ru-RU')}\n- **Модель ИИ**: ${model}\n- **Хронометраж**: ~${minutes} мин.\n- **Количество слов**: ${words}\n- **Источник**: ${source || 'RSS Feed'}\n\n---\n\n${textWithEmbeddedImages}\n`;
    fs.writeFileSync(path.join(bundleDir, 'script.md'), mdContent, 'utf-8');

    // 3. Reiner Sprecher-Text (script.txt)
    const cleanSpeechText = text
      .split('\n\n')
      .filter(p => !p.startsWith('[B-Roll:'))
      .join('\n\n');
    fs.writeFileSync(path.join(bundleDir, 'script.txt'), cleanSpeechText, 'utf-8');

    // 4. Echte Fotos herunterladen und in photos/ speichern
    const savedPhotos = [];
    for (let i = 0; i < Math.min(imagesList.length, 30); i++) {
      const imgUrl = typeof imagesList[i] === 'string' ? imagesList[i] : imagesList[i]?.url;
      if (!imgUrl) continue;

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
          fs.writeFileSync(path.join(photosDir, imgFileName), buffer);
          savedPhotos.push(`photos/${imgFileName}`);
        }
      } catch (err) {
        console.error(`Fehler beim Laden von ${imgUrl}:`, err.message);
      }
    }

    // 4. project.json Manifest
    const projectManifest = {
      title,
      source,
      model,
      date: now.toISOString(),
      duration_target_seconds: Math.round(minutes * 60),
      word_count: words,
      speech_text_file: 'script.txt',
      markdown_file: 'script.md',
      photos: savedPhotos,
    };
    fs.writeFileSync(path.join(bundleDir, 'project.json'), JSON.stringify(projectManifest, null, 2), 'utf-8');

    console.log(`💾 Пакет сохранен в news/: ${bundleDir}`);

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
});

// GET /api/saved-packages - Listet alle bereits gespeicherten Pakete aus news/ auf
app.get('/api/saved-packages', async (req, res) => {
  try {
    const newsDir = path.resolve(__dirname, '../news');
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

        packages.push({
          folderName: entry.name,
          bundleDir,
          title: manifest.title || entry.name.replace(/^[0-9T-]{16}_/, '').replace(/_/g, ' '),
          date: manifest.date || null,
          model: manifest.model || 'gemini',
          source: manifest.source || '',
          hasAudio: fs.existsSync(audioPath),
          hasVideo,
          hasScriptTxt: fs.existsSync(txtPath),
          hasScriptMd: fs.existsSync(mdPath),
          photosCount: photoFiles.length,
          photoUrls: photoFiles,
          audioUrl: fs.existsSync(audioPath) ? `/news-static/${entry.name}/audio.mp3` : null,
          videoUrl,
          scriptTxt: fs.existsSync(txtPath) ? fs.readFileSync(txtPath, 'utf-8') : '',
          scriptMd: fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : '',
        });
      }
    }

    res.json({ success: true, packages });
  } catch (err) {
    console.error('List packages error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-news-photos - Speichert die im Foto-Dialog ausgewählten/gefilterten Fotos im photos/ Unterordner!
app.post('/api/save-news-photos', async (req, res) => {
  try {
    const { title = '', bundleDir: inputBundleDir, photos = [] } = req.body;

    const newsDir = path.resolve(__dirname, '../news');
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

    // Alte Fotos im photos/ Ordner leeren
    const existing = fs.readdirSync(photosDir);
    existing.forEach(f => {
      try { fs.unlinkSync(path.join(photosDir, f)); } catch {}
    });

    const savedPhotos = [];
    for (let i = 0; i < photos.length; i++) {
      const imgUrl = typeof photos[i] === 'string' ? photos[i] : photos[i]?.url;
      if (!imgUrl) continue;

      // Wenn das Bild bereits lokal im /news-static/ Ordner liegt -> Nicht neu herunterladen!
      if (imgUrl.startsWith('/news-static/')) {
        const relativePath = imgUrl.replace(/^\/news-static\//, '');
        const fullLocalPath = path.resolve(__dirname, '../news', relativePath);
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

    // project.json aktualisieren
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

// POST /api/delete-photo - Löscht ein bestimmtes Foto aus news/<folderName>/photos/ physikalisch von der Festplatte!
app.post('/api/delete-photo', async (req, res) => {
  try {
    const { photoUrl, bundleDir } = req.body;
    let targetFile = null;

    const newsDir = path.resolve(__dirname, '../news');

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

      // Manifest project.json aktualisieren
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

// POST /api/save-script-text - Speichert den bearbeiteten Sprecher-Text in script.txt im Paket-Ordner!
app.post('/api/save-script-text', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, text = '' } = req.body;

    const newsDir = path.resolve(__dirname, '../news');
    let bundleDir = inputBundleDir;

    if (!bundleDir && folderName) {
      bundleDir = path.join(newsDir, folderName);
    }

    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(404).json({ success: false, error: 'Ordner existiert nicht' });
    }

    const txtPath = path.join(bundleDir, 'script.txt');
    fs.writeFileSync(txtPath, text, 'utf-8');

    // Manifest project.json word count aktualisieren
    const jsonPath = path.join(bundleDir, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const words = text.split(/\s+/).filter(Boolean).length;
        manifest.word_count = words;
        manifest.text_updated_at = new Date().toISOString();
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {}
    }

    console.log(`📜 script.txt in ${bundleDir} erfolgreich aktualisiert.`);

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

// ── Verfügbare Edge-TTS Stimmen (Russisch) ──────────────────────────────────
const TTS_VOICES = {
  nikolay:  { voice: 'ru-RU-DmitryNeural',   label: 'Nikolay',  rate: '+0%',  pitch: '-10Hz' },
  dmitry:   { voice: 'ru-RU-DmitryNeural',   label: 'Dmitry',   rate: '+8%',  pitch: '+0Hz'  },
  svetlana: { voice: 'ru-RU-SvetlanaNeural', label: 'Svetlana', rate: '+0%',  pitch: '+0Hz'  },
  darya:    { voice: 'ru-RU-DaryaNeural',    label: 'Darya',    rate: '-5%',  pitch: '-5Hz'  },
};

// POST /api/generate-audio - Erzeugt audio.mp3 mit wählbarer Edge-TTS Stimme im Nachricht-Ordner!
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { bundleDir, text = '', voiceKey = 'nikolay' } = req.body;

    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(400).json({ success: false, error: 'Папка проекта не найдена' });
    }

    const txtPath = path.join(bundleDir, 'script.txt');
    const audioPath = path.join(bundleDir, 'audio.mp3');

    // Falls script.txt nicht existiert, erstelle sie aus dem Text
    if (!fs.existsSync(txtPath) && text) {
      const cleanSpeechText = text
        .split('\n\n')
        .filter(p => !p.startsWith('[B-Roll:'))
        .join('\n\n');
      fs.writeFileSync(txtPath, cleanSpeechText, 'utf-8');
    }

    if (!fs.existsSync(txtPath)) {
      return res.status(400).json({ success: false, error: 'Файл с текстом script.txt не найден' });
    }

    const voiceCfg = TTS_VOICES[voiceKey] || TTS_VOICES.nikolay;
    const { exec } = await import('child_process');
    const cmd = `edge-tts --file "${txtPath}" --voice ${voiceCfg.voice} --rate=${voiceCfg.rate} --pitch=${voiceCfg.pitch} --write-media "${audioPath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Audio generation error:', error.message, stderr);
        return res.status(500).json({ success: false, error: `Ошибка генерации аудио: ${error.message}` });
      }

      // Manifest project.json mit Audio-Status aktualisieren
      const jsonPath = path.join(bundleDir, 'project.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          manifest.hasAudio = true;
          manifest.audio_generated_at = new Date().toISOString();
          manifest.voice = voiceCfg.label;
          fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
        } catch {}
      }

      console.log(`🎙️ Аудио-файл сохранен: ${audioPath} (${voiceCfg.label})`);
      res.json({
        success: true,
        audioPath,
        audioFileName: 'audio.mp3',
        folderName: path.basename(bundleDir),
        voice: `${voiceCfg.label} (${voiceCfg.voice})`,
        voiceKey,
        rate: voiceCfg.rate,
        pitch: voiceCfg.pitch,
      });
    });
  } catch (err) {
    console.error('Generate audio error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/voices - Gibt alle verfügbaren TTS-Stimmen zurück
app.get('/api/voices', (req, res) => {
  res.json({ voices: Object.entries(TTS_VOICES).map(([key, cfg]) => ({ key, label: cfg.label, voice: cfg.voice })) });
});

// GET /api/video-progress/:jobId - SSE-Stream für Echtzeit FFmpeg-Fortschritt
app.get('/api/video-progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Job sofort anlegen falls noch nicht vorhanden
  if (!videoJobs.has(jobId)) {
    videoJobs.set(jobId, { clients: new Set(), progress: 0, status: 'waiting', log: '' });
  }
  const job = videoJobs.get(jobId);
  job.clients.add(sendEvent);

  // Aktuellen Stand sofort senden
  sendEvent({ progress: job.progress, status: job.status, log: job.log });

  req.on('close', () => {
    job.clients.delete(sendEvent);
    if (job.clients.size === 0 && job.status === 'done') {
      videoJobs.delete(jobId);
    }
  });
});

// POST /api/generate-video - Erzeugt video.mp4 (Preset ultrafast) aus photos/ und audio.mp3 im Nachricht-Ordner!
// Unterstützt: transition=concat|xfade, jobId für SSE-Fortschritt
app.post('/api/generate-video', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, transition = 'concat', jobId } = req.body;

    const newsDir = path.resolve(__dirname, '../news');
    let bundleDir = inputBundleDir;
    if (!bundleDir && folderName) {
      bundleDir = path.join(newsDir, folderName);
    }

    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(400).json({ success: false, error: 'Папка проекта не найдена' });
    }

    const audioPath = path.join(bundleDir, 'audio.mp3');
    const photosDir = path.join(bundleDir, 'photos');
    const videoDir = path.join(bundleDir, 'video');
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    const timeStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
    const videoFileName = `video_${timeStr}.mp4`;
    const videoPath = path.join(videoDir, videoFileName);

    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({ success: false, error: 'Файл audio.mp3 не найден. Сначала создайте аудио!' });
    }

    if (!fs.existsSync(photosDir)) {
      return res.status(400).json({ success: false, error: 'Папка photos/ не найдена. Сначала скачайте фото!' });
    }

    const photoFiles = fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp)/i.test(f));
    if (photoFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'В папке photos/ нет фотографий!' });
    }

    // Helper: SSE-Fortschritt an alle verbundenen Clients senden
    const broadcastProgress = (progress, status, log = '') => {
      if (!jobId) return;
      if (!videoJobs.has(jobId)) {
        videoJobs.set(jobId, { clients: new Set(), progress: 0, status: 'waiting', log: '' });
      }
      const job = videoJobs.get(jobId);
      job.progress = progress;
      job.status = status;
      job.log = log;
      for (const client of job.clients) {
        try { client({ progress, status, log }); } catch {}
      }
    };

    broadcastProgress(5, 'probing', 'Определение длительности аудио...');

    // 1. Audio-Dauer ermitteln (ffprobe)
    const { exec, spawn } = await import('child_process');
    const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;

    exec(probeCmd, async (probeErr, stdout) => {
      let audioDuration = parseFloat(stdout.trim());
      if (isNaN(audioDuration) || audioDuration <= 0) {
        audioDuration = 180; // Fallback
      }

      broadcastProgress(10, 'building', 'Подготовка фотографий для монтажа...');

      const FADE_DURATION = 0.8; // xfade overlap in seconds
      let ffmpegArgs = [];
      const blurFilter = 'split[bg][fg];[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=35[blurred];[fg]scale=1920:1080:force_original_aspect_ratio=decrease[sharp];[blurred][sharp]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p';

      if (transition === 'xfade' && photoFiles.length > 1) {
        // ── xfade Überblendungsmodus ─────────────────────────────────────────
        // Jedes Foto als separaten Input, dann xfade chain
        const photoDuration = audioDuration / photoFiles.length;
        const effectiveDuration = photoDuration - FADE_DURATION;

        // Inputs
        for (const f of photoFiles) {
          const fp = path.join(photosDir, f);
          ffmpegArgs.push('-loop', '1', '-t', String(photoDuration.toFixed(3)), '-i', fp);
        }
        ffmpegArgs.push('-i', audioPath);

        // Blur-Filter pro Input
        let filterParts = [];
        for (let i = 0; i < photoFiles.length; i++) {
          filterParts.push(`[${i}:v]${blurFilter}[v${i}]`);
        }

        // xfade chain
        let xfadeChain = '';
        let prevLabel = 'v0';
        for (let i = 1; i < photoFiles.length; i++) {
          const offset = (effectiveDuration * i).toFixed(3);
          const outLabel = i < photoFiles.length - 1 ? `xf${i}` : 'vout';
          xfadeChain += `[${prevLabel}][v${i}]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset}[${outLabel}];`;
          prevLabel = outLabel;
        }
        // Remove trailing semicolon
        xfadeChain = xfadeChain.replace(/;$/, '');

        const fullFilter = filterParts.join(';') + ';' + xfadeChain;
        const audioInputIndex = photoFiles.length;

        ffmpegArgs = [
          ...ffmpegArgs,
          '-filter_complex', fullFilter,
          '-map', '[vout]',
          '-map', `${audioInputIndex}:a`,
          '-c:v', 'libx264', '-preset', 'ultrafast',
          '-c:a', 'copy',
          '-shortest',
          '-y', videoPath,
        ];
      } else {
        // ── Standard Concat-Modus ─────────────────────────────────────────────
        const photoDuration = audioDuration / photoFiles.length;
        const concatPath = path.join(bundleDir, 'concat.txt');
        let concatContent = '';
        for (const f of photoFiles) {
          const fp = path.join(photosDir, f).replace(/\\/g, '/');
          concatContent += `file '${fp}'\nduration ${photoDuration.toFixed(3)}\n`;
        }
        const lastPhoto = path.join(photosDir, photoFiles[photoFiles.length - 1]).replace(/\\/g, '/');
        concatContent += `file '${lastPhoto}'\n`;
        fs.writeFileSync(concatPath, concatContent, 'utf-8');

        ffmpegArgs = [
          '-y',
          '-f', 'concat', '-safe', '0', '-i', concatPath,
          '-i', audioPath,
          '-filter_complex', blurFilter,
          '-c:v', 'libx264', '-preset', 'ultrafast',
          '-c:a', 'copy',
          '-shortest',
          videoPath,
        ];
      }

      broadcastProgress(15, 'encoding', 'Начало кодирования видео FFmpeg...');

      // 3. FFmpeg als spawn ausführen (für Progress-Parsing)
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      let ffmpegStderr = '';

      ffmpegProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        ffmpegStderr += chunk;

        // Zeitfortschritt aus stderr parsen: time=HH:MM:SS.xx
        const timeMatch = chunk.match(/time=(\d+):(\d+):([\d.]+)/);
        if (timeMatch) {
          const h = parseInt(timeMatch[1]);
          const m = parseInt(timeMatch[2]);
          const s = parseFloat(timeMatch[3]);
          const encodedSecs = h * 3600 + m * 60 + s;
          const pct = Math.min(95, 15 + Math.round((encodedSecs / audioDuration) * 80));
          broadcastProgress(pct, 'encoding', `Кодирование: ${timeMatch[0].replace('time=', '')} / ${Math.floor(audioDuration)}s`);
        }
      });

      ffmpegProcess.on('close', (code) => {
        if (code !== 0) {
          broadcastProgress(0, 'error', `FFmpeg завершился с ошибкой (код ${code})`);
          console.error('FFmpeg error:', ffmpegStderr.slice(-800));
          return res.status(500).json({ success: false, error: `Ошибка создания видео: FFmpeg код ${code}` });
        }

        broadcastProgress(100, 'done', 'Видео успешно смонтировано!');

        // Manifest project.json aktualisieren
        const jsonPath = path.join(bundleDir, 'project.json');
        if (fs.existsSync(jsonPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            manifest.hasVideo = true;
            manifest.video_generated_at = new Date().toISOString();
            manifest.transition = transition;
            fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
          } catch {}
        }

        const resFolderName = path.basename(bundleDir);
        console.log(`🎬 video.mp4 erfolgreich generiert: news/${resFolderName}/video/${videoFileName} (${transition})`);

        res.json({
          success: true,
          videoPath,
          videoFileName: `video/${videoFileName}`,
          folderName: resFolderName,
          duration: audioDuration,
          photosCount: photoFiles.length,
          transition,
        });
      });
    });
  } catch (err) {
    console.error('Generate video error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 ChaosChronicle Backend läuft auf http://localhost:${PORT}`);
  console.log(`📰 News API: http://localhost:${PORT}/api/news`);
});
