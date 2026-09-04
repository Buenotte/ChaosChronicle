import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  }
});

// RSS Feed Quellen – Saubere, themenspezifische Feeds ohne Überschneidungen
export const FEEDS = [
  // 🇷🇺 Россия
  { url: 'https://meduza.io/rss/all', category: 'rossija', source: 'Meduza' },
  { url: 'https://zona.media/rss', category: 'rossija', source: 'Медиазона' },
  { url: 'https://feeds.bbci.co.uk/russian/rss.xml', category: 'rossija', source: 'BBC Русская служба' },
  { url: 'https://novayagazeta.eu/feed/rss', category: 'rossija', source: 'Новая газета Европа' },
  { url: 'https://ru.themoscowtimes.com/rss/news', category: 'rossija', source: 'The Moscow Times' },
  { url: 'https://verstka.media/feed', category: 'rossija', source: 'Вёрстка' },
  { url: 'https://www.agents.media/feed/', category: 'rossija', source: 'Агентство' },

  // 🤡 Абсурд & Скрепы (Курьезы, доносы, маразм, шапито и запреты из РФ)
  { url: 'https://news.google.com/rss/search?q=(site:theins.ru+OR+site:verstka.media+OR+site:holod.media+OR+site:ru.themoscowtimes.com)+(%D0%B4%D0%B5%D0%BF%D1%83%D1%82%D0%B0%D1%82+OR+%D0%B3%D0%BE%D1%81%D0%B4%D1%83%D0%BC%D0%B0+OR+%D0%B7%D0%B0%D0%BF%D1%80%D0%B5%D1%82%D0%B8%D1%82%D1%8C+OR+%D0%B4%D0%BE%D0%BD%D0%BE%D1%81+OR+%D1%81%D0%BA%D1%80%D0%B5%D0%BF%D1%8B+OR+%D1%88%D0%B0%D0%BF%D0%B8%D1%82%D0%BE+OR+%D0%B0%D0%B1%D1%81%D1%83%D1%80%D0%B4+OR+%D0%BC%D0%B0%D1%80%D0%B0%D0%B7%D0%BC)+-%D0%B0%D1%82%D0%B0%D0%BA%D0%BE%D0%B2%D0%B0%D0%BB%D0%B8+-%D0%B0%D1%8D%D1%80%D0%BE%D0%B4%D1%80%D0%BE%D0%BC+-%D0%BD%D0%BF%D0%B7+-%D0%BF%D0%BE%D0%B3%D0%B8%D0%B1%D0%BB%D0%B8+-%D0%BE%D0%B1%D1%81%D1%82%D1%80%D0%B5%D0%BB+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'absurd', source: 'The Moscow Times / Холод / Вёрстка' },
  { url: 'https://news.google.com/rss/search?q=(site:zona.media+OR+site:meduza.io)+(%D0%B4%D0%BE%D0%BD%D0%BE%D1%81+OR+%D0%B0%D0%B1%D1%81%D1%83%D1%80%D0%B4+OR+%D1%88%D1%82%D1%80%D0%B0%D1%84+OR+%D0%BA%D1%83%D1%80%D1%8C%D0%B5%D0%B7+OR+%D0%B4%D0%B8%D1%81%D0%BA%D1%80%D0%B5%D0%B4%D0%B8%D1%82%D0%B0%D1%86%D0%B8%D1%8F+OR+%D1%88%D0%B0%D0%BF%D0%B8%D1%82%D0%BE)+-%D0%B0%D1%82%D0%B0%D0%BA%D0%BE%D0%B2%D0%B0%D0%BB%D0%B8+-%D0%B0%D1%8D%D1%80%D0%BE%D0%B4%D1%80%D0%BE%D0%BC+-%D0%BD%D0%BF%D0%B7+-%D0%BF%D0%BE%D0%B3%D0%B8%D0%B1%D0%BB%D0%B8+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'absurd', source: 'Медиазона / Meduza' },
  { url: 'https://news.google.com/rss/search?q=(site:novayagazeta.eu+OR+site:svoboda.org)+(%D1%81%D0%BA%D1%80%D0%B5%D0%BF%D1%8B+OR+%D0%BF%D0%B0%D1%82%D1%80%D0%B8%D0%BE%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B5+%D0%B2%D0%BE%D1%81%D0%BF%D0%B8%D1%82%D0%B0%D0%BD%D0%B8%D0%B5+OR+%D0%B4%D0%BE%D0%BD%D0%BE%D1%81%D1%8B+OR+%D0%BC%D0%B0%D1%80%D0%B0%D0%B7%D0%BC)+-%D0%B0%D1%82%D0%B0%D0%BA%D0%BE%D0%B2%D0%B0%D0%BB%D0%B8+-%D0%B0%D1%8D%D1%80%D0%BE%D0%B4%D1%80%D0%BE%D0%BC+-%D0%BD%D0%BF%D0%B7+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'absurd', source: 'Новая газета / Радио Свобода' },

  // 🏛️ Политика
  { url: 'https://news.google.com/rss/search?q=site:svoboda.org+(%D0%BF%D0%BE%D0%BB%D0%B8%D1%82%D0%B8%D0%BA%D0%B0+OR+%D0%B2%D0%BB%D0%B0%D1%81%D1%82%D1%8C+OR+%D0%BA%D1%80%D0%B5%D0%BC%D0%BB%D1%8C)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'politika', source: 'Радио Свобода' },
  { url: 'https://news.google.com/rss/search?q=site:ru.themoscowtimes.com+(%D0%BF%D0%BE%D0%BB%D0%B8%D1%82%D0%B8%D0%BA%D0%B0+OR+%D0%B2%D0%BB%D0%B0%D1%81%D1%82%D1%8C)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'politika', source: 'The Moscow Times' },
  { url: 'https://news.google.com/rss/search?q=site:novayagazeta.eu+(%D0%BF%D0%BE%D0%BB%D0%B8%D1%82%D0%B8%D0%BA%D0%B0+OR+%D0%B2%D0%BB%D0%B0%D1%81%D1%82%D1%8C+OR+%D0%B2%D1%8B%D0%B1%D0%BE%D1%80%D1%8B)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'politika', source: 'Новая газета Европа' },
  { url: 'https://rss.dw.com/rdf/rss-ru-pol', category: 'politika', source: 'DW Политика' },
  { url: 'https://ru.euronews.com/rss?format=mrss&level=theme&name=news', category: 'politika', source: 'Euronews' },

  // 📈 Экономика (Строго независимые и международные издания)
  { url: 'https://news.google.com/rss/search?q=site:thebell.io+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'ekonomika', source: 'The Bell' },
  { url: 'https://news.google.com/rss/search?q=site:ru.themoscowtimes.com+(%D1%8D%D0%BA%D0%BE%D0%BD%D0%BE%D0%BC%D0%B8%D0%BA%D0%B0+OR+%D0%B1%D0%B8%D0%B7%D0%BD%D0%B5%D1%81+OR+%D1%81%D0%B0%D0%BD%D0%BA%D1%86%D0%B8%D0%B8+OR+%D1%80%D1%83%D0%B1%D0%BB%D1%8C)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'ekonomika', source: 'The Moscow Times Экономика' },
  { url: 'https://news.google.com/rss/search?q=site:novayagazeta.eu+(%D1%8D%D0%BA%D0%BE%D0%BD%D0%BE%D0%BC%D0%B8%D0%BA%D0%B0+OR+%D0%B1%D0%B8%D0%B7%D0%BD%D0%B5%D1%81+OR+%D1%81%D0%B0%D0%BD%D0%BA%D1%86%D0%B8%D0%B8+OR+%D1%80%D1%83%D0%B1%D0%BB%D1%8C)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'ekonomika', source: 'Новая газета Европа' },
  { url: 'https://news.google.com/rss/search?q=site:svoboda.org+(%D1%8D%D0%BA%D0%BE%D0%BD%D0%BE%D0%BC%D0%B8%D0%BA%D0%B0+OR+%D1%81%D0%B0%D0%BD%D0%BA%D1%86%D0%B8%D0%B8+OR+%D1%80%D1%83%D0%B1%D0%BB%D1%8C+OR+%D0%BD%D0%B5%D1%84%D1%82%D1%8C)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'ekonomika', source: 'Радио Свобода' },
  { url: 'https://rss.dw.com/rdf/rss-ru-eco', category: 'ekonomika', source: 'DW Экономика' },

  // 🎭 Культура & Общество
  { url: 'https://news.google.com/rss/search?q=site:svoboda.org+(%D0%BA%D1%83%D0%BB%D1%8C%D1%82%D1%83%D1%80%D0%B0+OR+%D0%BA%D0%B8%D0%BD%D0%BE+OR+%D0%BC%D1%83%D0%B7%D1%8B%D0%BA%D0%B0+OR+%D0%B8%D1%81%D0%BA%D1%83%D1%81%D1%81%D1%82%D0%B2%D0%BE+OR+%D0%BA%D0%BD%D0%B8%D0%B3%D0%B8)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'kultura', source: 'Радио Свобода' },
  { url: 'https://news.google.com/rss/search?q=site:meduza.io+(%D0%BA%D1%83%D0%BB%D1%8C%D1%82%D1%83%D1%80%D0%B0+OR+%D0%BA%D0%B8%D0%BD%D0%BE+OR+%D0%BC%D1%83%D0%B7%D1%8B%D0%BA%D0%B0+OR+%D1%81%D0%B5%D1%80%D0%B8%D0%B0%D0%BB%D1%8B)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'kultura', source: 'Meduza' },
  { url: 'https://rss.dw.com/rdf/rss-ru-cul', category: 'kultura', source: 'DW Культура' },

  // 🤖 Технологии & Наука
  { url: 'https://habr.com/ru/rss/hubs/all/', category: 'tekh', source: 'Хабр' },
  { url: 'https://3dnews.ru/news/rss/', category: 'tekh', source: '3DNews' },

  // 🌍 Мир
  { url: 'https://news.google.com/rss/search?q=site:bbc.com/russian+(%D0%BC%D0%B8%D1%80+OR+%D1%81%D1%88%D0%B0+OR+%D0%B5%D0%B2%D1%80%D0%BE%D0%BF%D0%B0+OR+%D0%BD%D0%B0%D1%82%D0%BE+OR+%D0%BA%D0%B8%D1%82%D0%B0%D0%B9+OR+%D0%B1%D0%BB%D0%B8%D0%B6%D0%BD%D0%B8%D0%B9+%D0%B2%D0%BE%D1%81%D1%82%D0%BE%D0%BA)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'mir', source: 'BBC Русская служба' },
  { url: 'https://news.google.com/rss/search?q=site:svoboda.org+(%D0%BC%D0%B8%D1%80+OR+%D1%81%D1%88%D0%B0+OR+%D0%B5%D0%B2%D1%80%D0%BE%D0%BF%D0%B0+OR+%D0%BD%D0%B0%D1%82%D0%BE+OR+%D0%BA%D0%B8%D1%82%D0%B0%D0%B9+OR+%D0%B8%D0%B7%D1%80%D0%B0%D0%B8%D0%BB%D1%8C)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'mir', source: 'Радио Свобода' },
  { url: 'https://news.google.com/rss/search?q=site:dw.com/ru+(%D0%BC%D0%B8%D1%80+OR+%D1%81%D1%88%D0%B0+OR+%D0%B5%D0%B2%D1%80%D0%BE%D0%BF%D0%B0+OR+%D0%BD%D0%B0%D1%82%D0%BE+OR+%D0%BA%D0%B8%D1%82%D0%B0%D0%B9+OR+%D0%B8%D0%B7%D1%80%D0%B0%D0%B8%D0%BB%D1%8C)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'mir', source: 'DW Мир' },

  // 🇺🇦 Война в Украине
  { url: 'https://www.pravda.com.ua/rus/rss/', category: 'ukraina', source: 'Украинская правда' },
  { url: 'https://www.rbc.ua/static/rss/newsline.rus.rss.xml', category: 'ukraina', source: 'РБК-Украина' },
  { url: 'https://nv.ua/rss/all.xml', category: 'ukraina', source: 'New Voice (NV)' },
  { url: 'https://news.google.com/rss/search?q=(site:svoboda.org+OR+site:radiosvoboda.org)+when:7d&hl=ru&gl=UA&ceid=UA:ru', category: 'ukraina', source: 'Радио Свобода' },
  { url: 'https://rss.dw.com/rdf/rss-ru-ukr', category: 'ukraina', source: 'DW Украина' },
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

export async function fetchOgImage(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const html = await resp.text();
    const head = html.slice(0, 40000);
    const ogMatch = head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                    head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
                    head.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                    head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (ogMatch && ogMatch[1]) {
      let imgUrl = ogMatch[1].trim();
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
      else if (imgUrl.startsWith('/')) {
        const origin = new URL(url).origin;
        imgUrl = origin + imgUrl;
      }
      return imgUrl;
    }
  } catch {}
  return null;
}

export async function enrichArticlesWithOgImages(articles) {
  const missing = articles.filter(a => !a.imageUrl && a.url);
  if (missing.length === 0) return articles;

  const chunkSize = 15;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    await Promise.allSettled(
      chunk.map(async (art) => {
        const img = await fetchOgImage(art.url);
        if (img) {
          art.imageUrl = img;
          art.images = [img];
        }
      })
    );
  }

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify({ lastFetch, articles }, null, 2), 'utf-8');
  } catch {}
  return articles;
}

const cacheFilePath = path.join(__dirname, '../cache_news.json');

export let newsCache = [];
let lastFetch = 0;

if (fs.existsSync(cacheFilePath)) {
  try {
    const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    newsCache = (cachedData.articles || []).filter(a => !a.pubDate || (Date.now() - new Date(a.pubDate).getTime()) <= maxAgeMs);
    lastFetch = cachedData.lastFetch || 0;
    console.log(`📦 ${newsCache.length} frische Nachrichten (max. 7 Tage) aus Festplatten-Cache geladen.`);
    // Hintergrund-Ergänzung für fehlende Bilder
    const missingCount = newsCache.filter(a => !a.imageUrl && a.url).length;
    if (missingCount > 0) {
      enrichArticlesWithOgImages(newsCache).then(enriched => {
        const withImg = enriched.filter(a => a.imageUrl).length;
        console.log(`✨ Fotos angereichert: ${withImg}/${enriched.length} Nachrichten haben jetzt Original-Bilder!`);
      });
    }
  } catch (e) {
    console.error('Fehler beim Lesen von cache_news.json:', e.message);
  }
}

export async function fetchAllFeeds(forceRefresh = false) {
  if (!forceRefresh && newsCache.length > 0) {
    return newsCache;
  }

  console.log(forceRefresh ? '↻ Nachrichten werden neu im Internet gesucht...' : '📰 Erste Nachrichten-Suche...');
  const now = Date.now();
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // Maximal 7 Tage (1 Woche)

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return parsed.items.filter(item => {
        const d = item.pubDate || item.isoDate;
        if (!d) return true;
        const time = new Date(d).getTime();
        return !isNaN(time) && (now - time) <= maxAgeMs;
      }).map((item, idx) => {
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

  const rawArticles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Strikte Duplikats-Filterung nach URL und normalisiertem Titel
  const seenUrls = new Set();
  const seenTitles = new Set();
  const articles = [];

  for (const art of rawArticles) {
    const normUrl = (art.url || '').split('?')[0].replace(/\/$/, '').toLowerCase();
    const normTitle = (art.title || '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
    if (normUrl && seenUrls.has(normUrl)) continue;
    if (normTitle && normTitle.length > 12 && seenTitles.has(normTitle)) continue;
    if (normUrl) seenUrls.add(normUrl);
    if (normTitle) seenTitles.add(normTitle);
    articles.push(art);
  }

  newsCache = articles;
  lastFetch = Date.now();

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify({ lastFetch, articles }, null, 2), 'utf-8');
  } catch (e) {
    console.error('Fehler beim Speichern von cache_news.json:', e.message);
  }

  // Sofort Web-Fotos für Artikel ohne RSS-Bild nachladen
  enrichArticlesWithOgImages(articles).then(enriched => {
    newsCache = enriched;
  });

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
    } else if (category === 'ukraina' || category === 'ukraine') {
      const ukraineSources = /(украинская правда|new voice|nv|рбк-украина|dw украина)/i;
      const ukraineKeywords = /(украин|киев|всу\b|зеленск|донбасс|донецк|луганск|харьков|днепр|одесс|запорожь|херсон|покровск|купянск|часов яр|краматорск|бахмут|авдеевк|сумск|курск|генштаб|оккупац|пво\b|шахед|обстрел|азов\b|войн)/i;
      filtered = all.filter(a => {
        if (ukraineSources.test(a.source || '')) return true;
        if (a.category === 'tekh' || a.category === 'kultura') return false;
        const full = `${a.title || ''} ${a.summary || ''}`;
        return a.category === 'ukraina' || a.category === 'ukraine' || ukraineKeywords.test(full);
      }).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
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
