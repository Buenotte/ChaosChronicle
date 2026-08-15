import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'ChaosChronicle/1.0' }
});

// RSS Feed Quellen – NUR unabhängige russischsprachige Medien
export const FEEDS = [
  // 🇷🇺 Россия (Проблемы, кризисы, репрессии, экономика – независимые СМИ)
  { url: 'https://meduza.io/rss/news',                                      category: 'rossija',   source: 'Meduza Россия' },
  { url: 'https://zona.media/rss',                                          category: 'rossija',   source: 'Медиазона' },
  { url: 'https://novayagazeta.eu/rss',                                     category: 'rossija',   source: 'Новая газета Европа' },
  { url: 'https://www.svoboda.org/api/zqpqe-mopot',                         category: 'rossija',   source: 'Радио Свобода' },
  { url: 'https://www.currenttime.tv/api/zmmqo-mopot',                     category: 'rossija',   source: 'Настоящее Время' },
  { url: 'https://www.bbc.com/russian/topics/russia.xml',                   category: 'rossija',   source: 'BBC Россия' },

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

export function cleanText(text = '') {
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

export function extractImages(item) {
  const images = [];

  if (item.enclosure?.url && /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url)) {
    images.push(item.enclosure.url);
  }

  const mediaContent = item['media:content'] || item['media:thumbnail'];
  if (mediaContent) {
    const list = Array.isArray(mediaContent) ? mediaContent : [mediaContent];
    list.forEach(m => {
      const url = m?.['$']?.url || m?.url;
      if (url) images.push(url);
    });
  }

  if (item['media:group']?.['media:content']) {
    const groupList = Array.isArray(item['media:group']['media:content'])
      ? item['media:group']['media:content']
      : [item['media:group']['media:content']];
    groupList.forEach(m => {
      const url = m?.['$']?.url || m?.url;
      if (url) images.push(url);
    });
  }

  const fullHtml = (item['content:encoded'] || '') + (item.content || '') + (item.summary || '') + (item.description || '');
  const imgMatches = fullHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const match of imgMatches) {
    if (match[1] && /^https?:\/\//i.test(match[1]) && !match[1].includes('pixel') && !match[1].includes('tracker')) {
      images.push(match[1]);
    }
  }

  const uniqueImages = [...new Set(images)];
  return {
    imageUrl: uniqueImages[0] || null,
    images: uniqueImages,
  };
}

export function getRelativeTime(dateStr) {
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

const cacheFilePath = path.join(__dirname, '../cache_news.json');

export let newsCache = [];
let lastFetch = 0;

if (fs.existsSync(cacheFilePath)) {
  try {
    const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    newsCache = cachedData.articles || [];
    lastFetch = cachedData.lastFetch || 0;
    console.log(`📦 ${newsCache.length} Nachrichten aus lokalem Festplatten-Cache geladen (cache_news.json).`);
  } catch (e) {
    console.error('Fehler beim Lesen von cache_news.json:', e.message);
  }
}

export async function fetchAllFeeds(forceRefresh = false) {
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
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  newsCache = articles;
  lastFetch = Date.now();

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify({ lastFetch, articles }, null, 2), 'utf-8');
  } catch (e) {
    console.error('Fehler beim Speichern von cache_news.json:', e.message);
  }

  return articles;
}

// GET /api/news
router.get('/api/news', async (req, res) => {
  try {
    const { category = 'alle', force = 'false' } = req.query;
    const isForce = force === 'true';
    const all = await fetchAllFeeds(isForce);

    let filtered = all;
    if (category === 'rossija') {
      const russiaKeywords = /(росси|рф\b|москв|петербург|питер|кремл|путин|минобороны|госдум|росстат|минфин|центробанк|цб рф|фсб|мвд|росгварди|белгород|курск|брянск|воронеж|ростов|шебекино|сибирь|урал|татарстан|башкортостан|кавказ|дагестан|чечн|краснодар|сочи|владивосток|приморь|новосибирск|екатеринбург|россиян|российск|отечествен)/i;
      const problemKeywords = /(кризис|дефицит|авари|пожар|взрыв|дрон|бпла|атак|прилет|разрушен|удар|хлопок|мобилизац|потер|погиб|ранен|инфляц|рост цен|рубл|девальвац|паден|санкци|убытк|ущерб|коллапс|банкротств|закрыт|дефолт|задержк|долг|нехватк|отключен|блэкаут|сбой|затоплен|наводнен|прорыв|чп|чрезвычайн|трагеди|арест|задержан|обыск|уголовн|приговор|срок|суд|штраф|иноагент|нежелательн|запрет|блокировк|цензур|протест|бунт|забастовк|митинг|коррупци|взятк|хищен|провал|ухудшен|катастроф|жалоб|скандал)/i;
      filtered = all.filter(a => {
        const full = `${a.title || ''} ${a.summary || ''}`;
        return russiaKeywords.test(full) && problemKeywords.test(full);
      });
    } else if (category !== 'alle' && category !== 'vse') {
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

// GET /news-static/*
router.get('/news-static/*', (req, res) => {
  try {
    const rawSubPath = req.params[0] || '';
    const decodedSubPath = decodeURIComponent(rawSubPath);
    const fullPath = path.resolve(__dirname, '../../news', decodedSubPath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return res.sendFile(fullPath);
    }
    return res.status(404).send('File not found');
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

export default router;
