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

// Cache für Feeds
let newsCache = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

async function fetchAllFeeds() {
  if (Date.now() - lastFetch < CACHE_TTL && newsCache.length > 0) {
    return newsCache;
  }

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
  return articles;
}

// GET /api/news?category=alle|feuilleton|politik|tech|wirtschaft
app.get('/api/news', async (req, res) => {
  try {
    const { category = 'alle' } = req.query;
    const all = await fetchAllFeeds();
    const filtered = category === 'alle'
      ? all
      : all.filter(a => a.category === category);
    res.json({ success: true, count: filtered.length, articles: filtered });
  } catch (err) {
    console.error('Feed error:', err.message);
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

// ── Active Live News Photo Search (DuckDuckGo Live Image Search) ──────────────
async function searchLiveNewsPhotos(queryTitle) {
  if (!queryTitle) return [];

  try {
    const titleClean = cleanText(queryTitle);
    const stopWords = new Set(['в', 'на', 'и', 'с', 'по', 'за', 'из', 'от', 'для', 'что', 'как', 'это', 'был', 'были', 'после', 'около', 'новые', 'атаки']);
    const keywords = titleClean
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 4)
      .join(' ');

    if (!keywords) return [];

    // Step 1: Token holen
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(keywords)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!tokenRes.ok) return [];
    const text = await tokenRes.text();
    const vqdMatch = text.match(/vqd=([0-9-]+)/);
    if (!vqdMatch || !vqdMatch[1]) return [];

    // Step 2: Bilder abrufen
    const imgRes = await fetch(`https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(keywords)}&vqd=${vqdMatch[1]}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!imgRes.ok) return [];
    const data = await imgRes.json();
    const results = data.results || [];
    const photos = [];
    const seen = new Set();

    results.forEach(item => {
      const imgUrl = item.image;
      if (imgUrl && /^https?:\/\//i.test(imgUrl) && /\.(jpg|jpeg|png|webp)/i.test(imgUrl)) {
        // Altes Archivmaterial vor 2026 filtern (z. B. /2021/, /2022/, /2023/, /2024/, /2025/)
        if (!/\/(201\d|202[0-5])\//.test(imgUrl) && !seen.has(imgUrl)) {
          seen.add(imgUrl);
          photos.push({
            url: imgUrl,
            source: item.source || item.provider || 'Пресса (Поиск по новости)',
            articleTitle: item.title || queryTitle,
            isExactArticle: false,
          });
        }
      }
    });

    return photos;
  } catch (err) {
    console.error('Live photo search error:', err.message);
    return [];
  }
}

// GET /api/news-photos?title=...&url=...
app.get('/api/news-photos', async (req, res) => {
  try {
    const { title = '', articleId = '', url = '' } = req.query;
    const all = await fetchAllFeeds();
    
    const photos = [];
    const seen = new Set();

    // Exakten Artikel finden
    const exactArticle = all.find(a => a.id === articleId || a.url === url || a.title === title);
    const targetUrl = url || exactArticle?.url;

    // 1. Web-Scrape die Original-Webseite dieser Nachricht
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
          });
        }
      });
    }

    // 2. Ergänze RSS-Bilder des Artikels
    if (exactArticle && exactArticle.images) {
      exactArticle.images.forEach(imgUrl => {
        if (!seen.has(imgUrl)) {
          seen.add(imgUrl);
          photos.push({
            url: imgUrl,
            source: exactArticle.source,
            articleTitle: exactArticle.title,
            isExactArticle: true,
          });
        }
      });
    }

    // 3. AKTIVE LIVE-SUCHE: Falls wenige Bilder da sind, starte Live-Suche exakt nach den Hauptbegriffen dieser Nachricht!
    if (photos.length < 10 && title) {
      const livePhotos = await searchLiveNewsPhotos(title);
      livePhotos.forEach(p => {
        if (photos.length < 20 && !seen.has(p.url)) {
          seen.add(p.url);
          photos.push(p);
        }
      });
    }

    const resultPhotos = photos.slice(0, 20);
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

    // Ordner C:\Projekte\ChaosChronicle\scripts\ anlegen
    const scriptsDir = path.resolve(__dirname, '../scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    // Dateiname formatieren
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = (title || 'Feuilleton')
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')
      .slice(0, 40);
    const fileName = `${dateStr}_${safeTitle}.md`;
    const filePath = path.join(scriptsDir, fileName);

    // Markdown-Datei Inhalt mit eingebetteten ECHTEN Nachrichten-Bildern erstellen
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

    const fileContent = `# 🎭 ${title}\n\n- **Дата**: ${now.toLocaleString('ru-RU')}\n- **Модель ИИ**: ${modelId}\n- **Хронометраж**: ~${minutes} мин.\n- **Количество слов**: ${words}\n- **Источник**: ${source || 'RSS Feed'}\n\n---\n\n${textWithEmbeddedImages}\n`;

    fs.writeFileSync(filePath, fileContent, 'utf-8');
    console.log(`💾 Фельетон сохранен с картинками: ${filePath}`);

    res.json({
      success: true,
      text,
      model: modelId,
      words,
      minutes,
      savedFile: filePath,
      fileName,
    });
  } catch (err) {
    console.error('Feuilleton error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 ChaosChronicle Backend läuft auf http://localhost:${PORT}`);
  console.log(`📰 News API: http://localhost:${PORT}/api/news`);
});
