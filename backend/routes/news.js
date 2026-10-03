import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import Parser from 'rss-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function parseViewCount(text) {
  if (!text) return 0;
  const cleaned = text.replace(/[\s\u00A0\u202F]+/g, ' ').trim();
  const match = cleaned.match(/([\d\s.,]+)\s*(тыс|млн|k|m|просм|view)?/i);
  if (!match) return 0;
  let numStr = match[1].replace(/[\s\u00A0\u202F]+/g, '').replace(',', '.');
  let num = parseFloat(numStr) || 0;
  const unit = (match[2] || '').toLowerCase();
  if (unit.startsWith('тыс') || unit === 'k') num *= 1000;
  else if (unit.startsWith('млн') || unit === 'm') num *= 1000000;
  return Math.round(num);
}

export function isPublishedWithin24Hours(text) {
  if (!text) return false;
  return parsePublishedAgeMinutes(text) <= 24 * 60;
}

export function parsePublishedAgeMinutes(text) {
  if (!text) return 999999;
  const t = text.toLowerCase().trim();

  // 1. Zuerst exakte Zeitabstände mit Zahlen parsen (Unicode-sicher für kyrillische Kurzformen wie "12 ч назад", "2 дн. назад")
  const minMatch = t.match(/(\d+)\s*(?:минут|\p{L}*мин|minute|min)/iu);
  if (minMatch) return parseInt(minMatch[1], 10);

  const hrMatch = t.match(/(\d+)\s*(?:час|hour|hr|std|ч(?!\p{L}))/iu);
  if (hrMatch) return parseInt(hrMatch[1], 10) * 60;

  const dayMatch = t.match(/(\d+)\s*(?:день|дня|дней|дн|day|tage?)/iu);
  if (dayMatch) return parseInt(dayMatch[1], 10) * 24 * 60;

  const weekMatch = t.match(/(\d+)\s*(?:недел|нед|week)/iu);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7 * 24 * 60;

  const monthMatch = t.match(/(\d+)\s*(?:месяц|мес|month)/iu);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 30 * 24 * 60;

  const yearMatch = t.match(/(\d+)\s*(?:год|лет|year|г(?!\p{L}))/iu);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 365 * 24 * 60;

  if (t.includes('сегодня') || t.includes('today')) return 6 * 60;
  if (t.includes('вчера') || t.includes('yesterday')) return 24 * 60;

  // 2. Nur wenn keine Zahl vorhanden ist und es ECHT jetzt live/neu ist:
  if (t.includes('только что') || t.includes('just now')) return 0;
  if ((t === 'в эфире' || t === 'прямой эфир' || t === 'live') && !t.includes('назад') && !t.includes('ago') && !t.includes('закончилась') && !t.includes('завершилась')) return 0;

  return 999999;
}

export function sortYouTubeVideosFreshnessFirst(ytArray) {
  return ytArray.sort((a, b) => {
    // 1. Höchste Priorität: Absolute Aktualität (kürzestes Alter in Minuten = neustes Video IMMER ZUERST AN PLATZ 1!)
    const ageA = parsePublishedAgeMinutes(a.publishedDateText);
    const ageB = parsePublishedAgeMinutes(b.publishedDateText);
    if (ageA !== ageB) return ageA - ageB;

    // 2. Priorität bei gleichem Alter: Top-Analysten (Schwets, Jakowina, Matwejew) bevorzugen
    const aKey = a.isKeyAnalyst ? 1 : 0;
    const bKey = b.isKeyAnalyst ? 1 : 0;
    if (aKey !== bKey) return bKey - aKey;

    // 3. Priorität: Meiste Aufrufe (Zuschauerzahlen)
    return (b.viewCount || 0) - (a.viewCount || 0);
  });
}

const KREMLIN_PROPAGANDA_REGEX = /(соловьев|соловьёв|скабеева|симоньян|попов\s+60|первый\s+канал|россия\s*1\b|россия\s*24|рт\b|rt\s+на\s+русском|царьград|вести\s+недели|риа\s+новости|тасс\b|минобороны\s+рф|конашенков|володин|медведев\s+заявил|военкор|подоляка|подоляк\s+юрий|варгонзо|wargonzo|рыбарь|военная\s+хроника|сводки\s+от\s+ополчения|шарий|олешко|россия\s+побеждает|удар\s+возмездия|нацист|денацификац|освобождение\s+донбасса|вс\s+рф\s+уничтожили)/i;

export function extractVideoRenderers(itemSection) {
  const list = [];
  for (const item of (itemSection || [])) {
    if (item.videoRenderer) {
      list.push(item.videoRenderer);
    }
    if (item.shelfRenderer) {
      const shelfItems = item.shelfRenderer.content?.verticalListRenderer?.items ||
                         item.shelfRenderer.content?.horizontalListRenderer?.items || [];
      for (const si of shelfItems) {
        if (si.videoRenderer) list.push(si.videoRenderer);
        else if (si.compactVideoRenderer) list.push(si.compactVideoRenderer);
      }
    }
  }
  return list;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function fetchYouTubeCategoryVideos(searchQueries, category, defaultChannel, sortType = 'fresh') {
  const allVideos = [];
  const seenIds = new Set();
  const irrelevantPattern = /(художественный\s+фильм|комедия|полный\s+фильм|мелодрама|боевик|кинопраздник|кино\b|фильм\b|сериал\b|трейлер|reaction|реакци|смотрит:|нарезк|9\/11|катастроф)/i;
  const isViewSort = category === 'psikh' || sortType === 'views';
  const filterParams = isViewSort ? ['sp=CAM%253D'] : ['sp=CAI%253D'];
  const maxLimit = isViewSort ? 20 : 10;

  const fetchOneQuery = async (query, sp) => {
    try {
      const searchUrl = sp ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&${sp}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const resp = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Connection': 'close'
        },
        signal: AbortSignal.timeout(2200)
      });
      if (!resp.ok) return [];
      const html = await resp.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/);
      if (!match) return [];

      const data = JSON.parse(match[1]);
      const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
      const itemSection = contents?.find(c => c.itemSectionRenderer)?.itemSectionRenderer?.contents;
      const videoRenderers = extractVideoRenderers(itemSection);
      const list = [];

      for (const v of videoRenderers) {
        if (!v || !v.videoId) continue;
        const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || '';
        const channel = v.ownerText?.runs?.[0]?.text || defaultChannel || 'YouTube';
        const snippetText = v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(r => r.text).join('') || '';
        const fullInfo = `${title} ${channel} ${snippetText}`;

        if (irrelevantPattern.test(title)) continue;
        if (KREMLIN_PROPAGANDA_REGEX.test(fullInfo)) continue;
        if (!/[а-яёіїєґ]/i.test(title)) continue;

        const publishedText = v.publishedTimeText?.simpleText || 'Популярное видео';
        const ageMins = parsePublishedAgeMinutes(publishedText);
        if (['rossija', 'ukraina', 'politika'].includes(category)) {
          if (ageMins > 3 * 24 * 60) continue;
        } else if (category === 'emigr') {
          if (ageMins > 45 * 24 * 60) continue;
        }

        const viewsText = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || '';
        const thumb = v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
        const viewCount = parseViewCount(viewsText);
        const is24h = isPublishedWithin24Hours(publishedText);
        const exactPubDate = new Date(Date.now() - (ageMins === 999999 ? 24 * 60 : ageMins) * 60 * 1000).toISOString();

        list.push({
          id: `yt-${v.videoId}`,
          title: `🎬 ${title}`,
          summary: snippetText || title,
          original_news: title,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          imageUrl: thumb,
          images: [thumb],
          source: channel || defaultChannel || 'YouTube',
          channel: channel || defaultChannel || 'YouTube',
          blogger: channel || defaultChannel || '',
          author: channel || defaultChannel || '',
          category: category,
          viewCount: viewCount,
          viewsText: viewsText || (viewCount ? `${viewCount.toLocaleString('ru-RU')} просмотров` : ''),
          publishedDateText: publishedText,
          is24h: is24h,
          pubDate: exactPubDate,
          relativeTime: `🎬 ${viewsText || viewCount.toLocaleString('ru-RU') + ' просм.'} • 🕒 ${publishedText}`,
          isYouTube: true,
        });
      }
      return list;
    } catch {
      return [];
    }
  };

  const queriesToRun = searchQueries.slice(0, 2);
  const tasks = [];
  for (const q of queriesToRun) {
    for (const sp of filterParams) {
      tasks.push(fetchOneQuery(q, sp));
    }
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      for (const v of r.value) {
        if (!seenIds.has(v.url)) {
          seenIds.add(v.url);
          allVideos.push(v);
          if (allVideos.length >= maxLimit) break;
        }
      }
    }
    if (allVideos.length >= maxLimit) break;
  }

  if (isViewSort) {
    allVideos.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  } else {
    sortYouTubeVideosFreshnessFirst(allVideos);
  }
  return allVideos;
}

export async function fetchYouTubeEmigrationVideos() {
  const refugeeQueries = [
    'украинцы в германии беженцы новости',
    'украинцы в европе новые правила выплаты',
    'украинские беженцы германия статус закон',
    'новые правила для украинцев в ес',
    'украинцы в польше новые законы выплаты',
    'украинцы в германии джобцентр выплаты новости',
    'беженцы выплаты статус германия польша',
    'украинцы за границей законы работа жилье',
    'продление временной защиты для украинцев в ес',
  ];
  const worldQueries = [
    'эмиграция в европу 2026 внж переезд',
    'переезд в испанию 2026 внж опыт',
    'эмиграция в сша канаду 2026 визы',
    'переезд в германию 2026 опыт жизнь',
    'жизнь в эмиграции релоканты 2026',
    'переезд в грузию сербию армению 2026',
    'переезд в азию таиланд бали 2026 внж',
    'внж пмж виза цифрового кочевника 2026',
    'куда уехать из россии 2026 страны для переезда',
    'переезд в латинскую америку аргентину 2026',
    'жизнь в черногории сербии 2026 переезд',
  ];

  const [refugeeVideos, worldVideos] = await Promise.all([
    fetchYouTubeCategoryVideos(refugeeQueries, 'emigr', 'Беженцы & Правила'),
    fetchYouTubeCategoryVideos(worldQueries, 'emigr', 'Эмиграция & Релокация')
  ]);

  const taggedRefugee = refugeeVideos.map(v => ({ ...v, isRefugeeRule: true }));
  const taggedWorld = worldVideos.map(v => ({ ...v, isRefugeeRule: false }));
  return [...taggedRefugee, ...taggedWorld];
}

export async function fetchYouTubePsychologyVideos() {
  return fetchYouTubeCategoryVideos([
    'психология манипуляции поведение человека',
    'психология отношений как понять людей',
    'психология тревога стресс как успокоиться',
    'психология самооценка уверенность в себе',
    'психология личные границы токсичные люди',
    'психология мозг мышление когнитивные искажения',
    'психотерапия депрессия выгорание усталость',
    'психология эмоции язык тела ложь жесты',
    'нарциссизм абьюз как защитить себя психология',
    'психология сна и памяти мозг человека',
    'психология влияния секреты общения',
    'психология кризис среднего возраста поиск себя',
    'психология привычки сила воли мотивация',
    'психология комплексы и травмы'
  ], 'psikh', 'Психология', 'views');
}

export function fetchYouTubeRussiaVideos() {
  return fetchYouTubeCategoryVideos([
    'майкл наки сводка',
    'новости россия аналитика наки потапенко шульман',
    'что происходит в россии разбор дождь свобода',
    'кризис в россии 2026 ходорковский live',
    'потери рф экономика санкции аналитика',
    'провал кремля новости сегодня',
    'владимир милов аналитика экономика россия',
    'илья шепелин разбор пропаганды',
    'максим кац аналитика россия новости'
  ], 'rossija', 'Россия & Аналитика');
}

export function fetchYouTubeUkraineVideos() {
  return fetchYouTubeCategoryVideos([
    'майкл наки фронт',
    'роман цымбалюк',
    'ян матвеев военный разбор карты',
    'украина новости фронт война сегодня аналитика',
    'события в украине всу фронт сводка',
    'всу фронт сегодня сводка новости',
    'война в украине аналитика freedom',
    'удары по военным объектам рф фронт',
    'сводка генштаба всу аналитика карты'
  ], 'ukraina', 'Украина');
}

export function fetchYouTubePoliticsVideos() {
  return fetchYouTubeCategoryVideos([
    'мировая политика геополитика аналитика кремль',
    'политика новости сегодня главные события разбор',
    'санкции против рф изоляция аналитика',
    'международные отношения разбор кризис',
    'трамп путин переговоры аналитика политика',
    'европа санкции война аналитика политика'
  ], 'politika', 'Политика');
}

export async function fetchTopThreeAnalystVideos(analystName, searchQueries, category) {
  const analystVideos = [];
  const seenIds = new Set();
  const irrelevantPattern = /(художественный\s+фильм|комедия|полный\s+фильм|мелодрама|боевик|кинопраздник|кино\b|фильм\b|сериал\b|трейлер|reaction|реакци|смотрит:|нарезк|9\/11|катастроф)/i;

  const fetchOne = async (query) => {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=CAI%253D`;
      const resp = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Connection': 'close'
        },
        signal: AbortSignal.timeout(2200)
      });
      if (!resp.ok) return [];
      const html = await resp.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/);
      if (!match) return [];

      const data = JSON.parse(match[1]);
      const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
      const itemSection = contents?.find(c => c.itemSectionRenderer)?.itemSectionRenderer?.contents;
      const videoRenderers = extractVideoRenderers(itemSection);
      const list = [];

      for (const v of videoRenderers) {
        if (!v || !v.videoId) continue;
        const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || '';
        const channel = v.ownerText?.runs?.[0]?.text || analystName;
        const snippetText = v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(r => r.text).join('') || '';
        const fullInfo = `${title} ${channel} ${snippetText}`;

        if (irrelevantPattern.test(title)) continue;
        if (KREMLIN_PROPAGANDA_REGEX.test(fullInfo)) continue;
        if (!/[а-яёіїєґ]/i.test(title)) continue;

        const publishedText = v.publishedTimeText?.simpleText || 'Свежее видео';
        const ageMins = parsePublishedAgeMinutes(publishedText);
        if (ageMins > 3 * 24 * 60) continue;

        const viewsText = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || '';
        const thumb = v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
        const viewCount = parseViewCount(viewsText);
        const is24h = isPublishedWithin24Hours(publishedText);
        const exactPubDate = new Date(Date.now() - (ageMins === 999999 ? 24 * 60 : ageMins) * 60 * 1000).toISOString();

        list.push({
          id: `yt-${v.videoId}`,
          title: `🎬 ${title}`,
          summary: snippetText || title,
          original_news: title,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          imageUrl: thumb,
          images: [thumb],
          source: channel || analystName,
          channel: channel || analystName,
          blogger: analystName || channel,
          author: analystName || channel,
          category: category,
          viewCount: viewCount,
          viewsText: viewsText || (viewCount ? `${viewCount.toLocaleString('ru-RU')} просмотров` : ''),
          publishedDateText: publishedText,
          is24h: is24h,
          pubDate: exactPubDate,
          relativeTime: `🎬 ${viewsText || viewCount.toLocaleString('ru-RU') + ' просм.'} • 🕒 ${publishedText}`,
          isYouTube: true,
          isKeyAnalyst: true,
        });
      }
      return list;
    } catch {
      return [];
    }
  };

  const results = await Promise.allSettled(searchQueries.slice(0, 1).map(q => fetchOne(q)));
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      for (const v of r.value) {
        if (!seenIds.has(v.url)) {
          seenIds.add(v.url);
          analystVideos.push(v);
          if (analystVideos.length >= 3) break;
        }
      }
    }
    if (analystVideos.length >= 3) break;
  }

  return analystVideos.slice(0, 3);
}

export async function fetchAllKeyAnalystsVideos() {
  const [shvets, yakovina, matveev] = await Promise.all([
    fetchTopThreeAnalystVideos('Юрий Швец', ['Юрий Швец', 'Юрий Швец официальный канал'], 'ukraina'),
    fetchTopThreeAnalystVideos('Иван Яковина', ['Иван Яковина', 'Иван Яковина Ivan Yakovina'], 'ukraina'),
    fetchTopThreeAnalystVideos('Ян Матвеев', ['Ян Матвеев', 'Ян Матвеев военный разбор'], 'ukraina')
  ]);

  const allKey = [...shvets, ...yakovina, ...matveev];
  const keyRussia = allKey.map(v => ({ ...v, category: 'rossija', id: `${v.id}-rus` }));
  const keyPolitika = allKey.map(v => ({ ...v, category: 'politika', id: `${v.id}-pol` }));
  return [...allKey, ...keyRussia, ...keyPolitika];
}

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  }
});

// RSS Feed Quellen
export const FEEDS = [
  { url: 'https://ru.themoscowtimes.com/rss/news', category: 'rossija', source: 'The Moscow Times' },
  { url: 'https://meduza.io/rss/all', category: 'rossija', source: 'Meduza' },
  { url: 'https://zona.media/rss', category: 'rossija', source: 'Медиазона' },
  { url: 'https://novayagazeta.eu/feed/rss', category: 'rossija', source: 'Новая газета Европа' },
  { url: 'https://verstka.media/feed', category: 'rossija', source: 'Вёрстка' },
  { url: 'https://www.agents.media/feed/', category: 'rossija', source: 'Агентство' },
  { url: 'https://feeds.bbci.co.uk/russian/rss.xml', category: 'rossija', source: 'BBC Русская служба' },
  { url: 'https://www.svoboda.org/rss/', category: 'rossija', source: 'Радио Свобода' },
  { url: 'https://holod.media/feed/', category: 'absurd', source: 'Холод' },
  { url: 'https://verstka.media/feed', category: 'absurd', source: 'Вёрстка' },
  { url: 'https://zona.media/rss', category: 'absurd', source: 'Медиазона' },
  { url: 'https://meduza.io/rss/all', category: 'absurd', source: 'Meduza' },
  { url: 'https://ru.themoscowtimes.com/rss/news', category: 'politika', source: 'The Moscow Times' },
  { url: 'https://novayagazeta.eu/feed/rss', category: 'politika', source: 'Новая газета Европа' },
  { url: 'https://www.svoboda.org/rss/', category: 'politika', source: 'Радио Свобода' },
  { url: 'https://rss.dw.com/rdf/rss-ru-pol', category: 'politika', source: 'DW Политика' },
  { url: 'https://ru.euronews.com/rss?format=mrss&level=theme&name=news', category: 'politika', source: 'Euronews' },
  { url: 'https://rss.dw.com/rdf/rss-ru-eco', category: 'ekonomika', source: 'DW Экономика' },
  { url: 'https://ru.themoscowtimes.com/rss/news', category: 'ekonomika', source: 'The Moscow Times' },
  { url: 'https://novayagazeta.eu/feed/rss', category: 'ekonomika', source: 'Новая газета Европа' },
  { url: 'https://www.svoboda.org/rss/', category: 'ekonomika', source: 'Радио Свобода' },
  { url: 'https://rss.dw.com/rdf/rss-ru-cul', category: 'kultura', source: 'DW Культура' },
  { url: 'https://www.svoboda.org/rss/', category: 'kultura', source: 'Радио Свобода' },
  { url: 'https://meduza.io/rss/all', category: 'kultura', source: 'Meduza' },
  { url: 'https://habr.com/ru/rss/hubs/all/', category: 'tekh', source: 'Хабр' },
  { url: 'https://3dnews.ru/news/rss/', category: 'tekh', source: '3DNews' },
  { url: 'https://feeds.bbci.co.uk/russian/rss.xml', category: 'mir', source: 'BBC Русская служба' },
  { url: 'https://www.svoboda.org/rss/', category: 'mir', source: 'Радио Свобода' },
  { url: 'https://rss.dw.com/rdf/rss-ru-all', category: 'mir', source: 'DW Мир' },
  { url: 'https://ru.euronews.com/rss?format=mrss&level=theme&name=news', category: 'mir', source: 'Euronews' },
  { url: 'https://www.pravda.com.ua/rus/rss/', category: 'ukraina', source: 'Украинская правда' },
  { url: 'https://www.rbc.ua/static/rss/newsline.rus.rss.xml', category: 'ukraina', source: 'РБК-Украина' },
  { url: 'https://nv.ua/rss/all.xml', category: 'ukraina', source: 'New Voice (NV)' },
  { url: 'https://rss.dw.com/rdf/rss-ru-ukr', category: 'ukraina', source: 'DW Украина' },
  { url: 'https://news.google.com/rss/search?q=' + encodeURIComponent('эмиграция OR релокация OR "жизнь в эмиграции" OR "переезд за границу"') + '&hl=ru&gl=RU&ceid=RU:ru', category: 'emigr', source: 'Google News (Эмиграция & Релокация)' },
  { url: 'https://news.google.com/rss/search?q=' + encodeURIComponent('ВНЖ OR "вид на жительство" OR релоканты OR "виза цифрового кочевника"') + '&hl=ru&gl=RU&ceid=RU:ru', category: 'emigr', source: 'Google News (ВНЖ, Визы & Экспаты)' },
  { url: 'https://news.google.com/rss/search?q=' + encodeURIComponent('загранпаспорт за границей OR апостиль OR "политическое убежище"') + '&hl=ru&gl=RU&ceid=RU:ru', category: 'emigr', source: 'Google News (Убежище & Документы)' },
  { url: 'https://www.psychologies.ru/rss/', category: 'psikh', source: 'Psychologies (Отношения & Психология)' },
  { url: 'https://knife.media/feed/', category: 'psikh', source: 'Нож (Психология & Общество)' },
  { url: 'https://takiedela.ru/feed/', category: 'psikh', source: 'Такие Дела (Люди & Судьбы)' },
  { url: 'https://reminder.media/feed', category: 'psikh', source: 'Reminder (Ментальное здоровье)' },
  { url: 'https://holod.media/feed/', category: 'psikh', source: 'Холод (Истории людей & Драмы)' },
  { url: 'https://verstka.media/feed', category: 'psikh', source: 'Вёрстка (Судьбы людей)' },
];

export function cleanText(text = '', preserveNewlines = false) {
  if (!text) return '';
  const cleaned = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  if (preserveNewlines) {
    return cleaned
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  }

  return cleaned.replace(/\s+/g, ' ').trim();
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
  const missing = articles.filter(a => !a.imageUrl && a.url).slice(0, 10);
  if (missing.length === 0) return articles;

  await Promise.allSettled(
    missing.map(async (art) => {
      try {
        const img = await fetchOgImage(art.url);
        if (img) {
          art.imageUrl = img;
          art.images = [img];
        }
      } catch {}
    })
  );

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify({ lastFetch, articles }, null, 2), 'utf-8');
  } catch {}
  return articles;
}

export const SPORTS_REGEX = /(sport\b|sport\.|\/sport\/|football|soccer|спорт\w*|футбол\w*|хокке\w*|баскетбол\w*|волейбол\w*|теннис\w*|биатлон\w*|\bбокс\w*|\bмма\b|\bufc\b|\buefa\b|\bfifa\b|фифа|уефа|олимпиад\w*|олимпийск\w*|чемпионат\w*|\bматч\w*|сборн\w*\s+(украин|росси|грузи|германи|франци|испани|итали)|ротаци\w*\s+в\s+сборн|лиг[аеыу]\s+чемпион|лиг[аеыу]\s+наци|куб[окае]\s+(мира|европы|уефа|фифа|гагарина|стэнли)|турнир\w*|формул[аы]-1|\bрпл\b|\bапл\b|\bнба\b|\bнхл\b|еврокуб\w*|трансфер\w*|пенальти|стадион\w*|болельщик\w*|главн\w*\s+тренер|\bгол[аыов]?\b|реал\s+мадрид|манчестер\s+(юнайтед|сити)|левандовски|месси\b|рональд\w*|мбаппе|джокович|хабиб\s+нурмагомедов|фигурн\w*\s+катан\w*|конькобеж\w*|лыжн\w*\s+гонк\w*|плавани\w*|легк\w*\s+атлетик\w*|тяжел\w*\s+атлетик\w*|дзюдо|карате|шахмат\w*)/i;

export function isSportsArticle(art) {
  if (!art) return false;
  if (art.category === 'sport' || art.category === 'sports') return true;
  const url = art.url || art.link || '';
  if (/sport\.nv\.ua|sport\.ua|sports\.ru|championat\.com|\/sport\/|\/football\//i.test(url)) return true;
  const text = `${art.title || ''} ${art.summary || ''} ${url}`;
  return SPORTS_REGEX.test(text);
}

const cacheFilePath = path.join(__dirname, '../cache_news.json');

export let newsCache = [];
let lastFetch = 0;

if (fs.existsSync(cacheFilePath)) {
  try {
    const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // Maximal 7 Tage alte Beiträge
    newsCache = (cachedData.articles || []).filter(a => {
      if (isSportsArticle(a)) return false;
      if (a.isYouTube) {
        if (a.category === 'psikh') return true; // Psychologie Evergreen-Videos mit höchsten Aufrufen behalten
        if (a.category === 'emigr' && parsePublishedAgeMinutes(a.publishedDateText) <= 45 * 24 * 60) return true;
        if (parsePublishedAgeMinutes(a.publishedDateText) > 3 * 24 * 60) return false;
      }
      if (a.category === 'psikh' && a.isYouTube) return true;
      if (!a.pubDate) return true;
      return (Date.now() - new Date(a.pubDate).getTime()) <= maxAgeMs;
    }).slice(0, 1000);
    lastFetch = cachedData.lastFetch || 0;
    console.log(`📦 ${newsCache.length} frische Nachrichten aus Festplatten-Cache geladen.`);
  } catch (e) {
    console.error('Fehler beim Lesen von cache_news.json:', e.message);
  }
}

// Falls der Cache leer ist, initial im Hintergrund laden
if (newsCache.length === 0) {
  setTimeout(() => {
    fetchAllFeeds(true).catch(() => {});
  }, 500);
}

let fetchInProgress = null;

export async function fetchAllFeeds(forceRefresh = false) {
  const isCacheFresh = newsCache.length > 0 && (Date.now() - lastFetch < 60000);
  if (!forceRefresh && isCacheFresh) {
    return newsCache;
  }
  if (fetchInProgress) return fetchInProgress;

  fetchInProgress = (async () => {
    try {
      console.log(forceRefresh ? '↻ Nachrichten werden neu im Internet gesucht...' : '📰 Erste/Periodische Nachrichten-Suche...');
      const now = Date.now();

      const rssPromise = Promise.allSettled(
        FEEDS.map(async (feed) => {
          try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Feed timeout')), 2500));
            const parsed = await Promise.race([parser.parseURL(feed.url), timeoutPromise]);
            const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // Maximal 7 Tage
            const limitItems = feed.category === 'psikh' ? 30 : 15;

            return (parsed.items || []).slice(0, limitItems).filter(item => {
              const d = item.pubDate || item.isoDate;
              if (!d) return true;
              const time = new Date(d).getTime();
              return !isNaN(time) && (now - time) <= maxAgeMs;
            }).map((item, idx) => {
              const imgData = extractImages(item);
              const fullContent = item['content:encoded'] || item.content || item.summary || item.description || item.contentSnippet || '';
              const fullCleaned = cleanText(fullContent, true);
              return {
                id: `${feed.source}-${idx}-${Date.now()}`,
                title: cleanText(item.title || ''),
                summary: fullCleaned || cleanText(item.title || ''),
                original_news: fullCleaned || cleanText(item.title || ''),
                url: item.link || item.guid || '',
                imageUrl: imgData.imageUrl,
                images: imgData.images,
                source: feed.source,
                category: feed.category,
                pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
                relativeTime: getRelativeTime(item.pubDate || item.isoDate),
              };
            });
          } catch {
            return [];
          }
        })
      );

      const cachedYt = newsCache.filter(a => a.isYouTube);
      const shouldFetchYt = cachedYt.length === 0;

      const ytPromise = shouldFetchYt
        ? Promise.allSettled([
            fetchAllKeyAnalystsVideos().catch(() => []),
            fetchYouTubeUkraineVideos().catch(() => []),
            fetchYouTubeRussiaVideos().catch(() => []),
            fetchYouTubePoliticsVideos().catch(() => []),
            fetchYouTubeEmigrationVideos().catch(() => []),
            fetchYouTubePsychologyVideos().catch(() => []),
          ])
        : Promise.resolve([]);

      const [results, ytResults] = await Promise.all([
        rssPromise,
        ytPromise
      ]);

      const freshYtArticles = (Array.isArray(ytResults) && ytResults.length > 0)
        ? ytResults.filter(r => r.status === 'fulfilled').flatMap(r => r.value || [])
        : [];

      const finalYt = freshYtArticles.length > 0 ? freshYtArticles : cachedYt;

      const feedArticles = (results.status === 'fulfilled' && Array.isArray(results.value))
        ? results.value.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
        : [];

      const rawArticles = [
        ...feedArticles,
        ...newsCache,
        ...finalYt
      ].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

      // Strikte Duplikats-Filterung nach URL und normalisiertem Titel
      const seenUrls = new Set();
      const seenTitles = new Set();
      const articles = [];

      for (const art of rawArticles) {
        if (isSportsArticle(art)) continue;
        const isYt = (art.url || '').includes('youtube.com') || (art.url || '').includes('youtu.be') || art.isYouTube;
        const normUrl = isYt ? ((art.url || '').trim().toLowerCase() + (art.category ? `-${art.category}` : '')) : (art.url || '').split('?')[0].replace(/\/$/, '').toLowerCase();
        const normTitle = (art.title || '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
        if (normUrl && seenUrls.has(normUrl)) continue;
        if (normTitle && normTitle.length > 12 && seenTitles.has(normTitle)) continue;
        if (normUrl) seenUrls.add(normUrl);
        if (normTitle) seenTitles.add(normTitle);
        articles.push(art);
        if (articles.length >= 1000) break;
      }

      if (articles.length > 0) {
        newsCache = articles;
        lastFetch = Date.now();
        try {
          fs.writeFileSync(cacheFilePath, JSON.stringify({ lastFetch, articles }, null, 2), 'utf-8');
        } catch (e) {
          console.error('Fehler beim Speichern von cache_news.json:', e.message);
        }
      }

      // Web-Fotos für Artikel ohne Bild nachladen (asynchron im Hintergrund)
      enrichArticlesWithOgImages(newsCache).then(enriched => {
        if (Array.isArray(enriched) && enriched.length > 0) newsCache = enriched;
      }).catch(() => {});

      return newsCache;
    } finally {
      fetchInProgress = null;
    }
  })();

  return fetchInProgress;
}

export function assembleTopYouTubeList(ytList, limit = 15) {
  const keyAnalysts = ytList.filter(a => a.isKeyAnalyst);
  sortYouTubeVideosFreshnessFirst(keyAnalysts);

  const otherYt = ytList.filter(a => !a.isKeyAnalyst);
  sortYouTubeVideosFreshnessFirst(otherYt);

  return [...keyAnalysts, ...otherYt].slice(0, limit);
}

// GET /api/news
router.get('/api/news', async (req, res) => {
  try {
    const { category = 'alle', force = 'false' } = req.query;
    const isForce = force === 'true';

    let all;
    if (isForce) {
      // Frische Suche im Internet starten und maximal 800ms warten, damit das Frontend nie blockiert
      const quickTimeout = new Promise(resolve => setTimeout(() => resolve(newsCache), 800));
      all = await Promise.race([fetchAllFeeds(true), quickTimeout]);
      if (!all || all.length === 0) all = newsCache;
    } else {
      all = (newsCache.length > 0) ? newsCache : await fetchAllFeeds(false);
    }

    const nonSportsAll = (all || newsCache || []).filter(a => !isSportsArticle(a));
    let filtered = nonSportsAll;
    if (category === 'alle' || category === 'vse') {
      // Ausdrücklich KEINE YouTube-Videos im Tab "Все новости" (alle / vse), nur 50 neueste echte Nachrichten (RSS & Web)
      const newsOnly = nonSportsAll.filter(a => {
        if (a.isYouTube || (typeof a.url === 'string' && (a.url.includes('youtube.com') || a.url.includes('youtu.be')))) return false;
        if (a.category === 'tekh' || a.category === 'tech') return false; // Technologien nur im tekh-Tab
        return true;
      });
      filtered = (newsOnly.length > 0 ? newsOnly : nonSportsAll).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 50);
    } else if (category === 'rossija') {
      const russiaKeywords = /(росси|рф\b|москв|петербург|питер|кремл|путин|госдум|росстат|минфин|центробанк|цб рф|минобороны рф|фсб|мвд|росгварди|белгород|курск|брянск|воронеж|ростов|шебекино|сибирь|урал|татарстан|башкортостан|кавказ|дагестан|чечн|краснодар|сочи|владивосток|приморь|новосибирск|екатеринбург|россиян|российск|отечествен)/i;
      const rusAll = nonSportsAll.filter(a => {
        // Ausdrücklich KEINE YouTube-Videos im Tab "rossija", nur echte Nachrichten (RSS & Web)
        if (a.isYouTube || (typeof a.url === 'string' && (a.url.includes('youtube.com') || a.url.includes('youtu.be')))) return false;
        if (a.category === 'tekh' || a.category === 'psikh' || a.category === 'kultura') return false;
        const full = `${a.title || ''} ${a.summary || ''}`;
        if (a.category === 'rossija') return true;
        return russiaKeywords.test(full);
      });
      // Exakt die 30 aktuellsten Nachrichten über Russland
      filtered = rusAll.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 30);
    } else if (category === 'ukraina' || category === 'ukraine') {
      const ukraineSources = /(украинская правда|new voice|nv|рбк-украина|dw украина)/i;
      const ukraineKeywords = /(украин|киев|всу\b|зеленск|донбасс|донецк|луганск|харьков|днепр|одесс|запорожь|херсон|покровск|купянск|часов яр|краматорск|бахмут|авдеевк|сумск|курск|генштаб|оккупац|пво\b|шахед|обстрел|азов\b|войн)/i;
      const ukrAll = nonSportsAll.filter(a => {
        if (a.category === 'tekh' || a.category === 'kultura' || a.category === 'psikh') return false;
        if (a.isKeyAnalyst) return true;
        if (a.category === 'ukraina' && a.isYouTube) return true;
        if (ukraineSources.test(a.source || '')) return true;
        const full = `${a.title || ''} ${a.summary || ''}`;
        return a.category === 'ukraina' || a.category === 'ukraine' || ukraineKeywords.test(full);
      });
      const ytList = ukrAll.filter(a => a.isYouTube && parsePublishedAgeMinutes(a.publishedDateText) <= 3 * 24 * 60);
      const topYt = assembleTopYouTubeList(ytList, 15);
      const rssList = ukrAll.filter(a => !a.isYouTube).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 15);
      filtered = [...topYt, ...rssList];
    } else if (category === 'politika') {
      const polAll = nonSportsAll.filter(a => {
        if (a.isKeyAnalyst) return true;
        if (a.category === 'politika') return true;
        const full = `${a.title || ''} ${a.summary || ''}`;
        return a.isYouTube && /(политик|геополитик|переговор|трамп|путин|сша|европ|кремл|санкци)/i.test(full);
      });
      const ytList = polAll.filter(a => a.isYouTube && parsePublishedAgeMinutes(a.publishedDateText) <= 3 * 24 * 60);
      const topYt = assembleTopYouTubeList(ytList, 15);
      const rssList = polAll.filter(a => !a.isYouTube).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 15);
      filtered = [...topYt, ...rssList];
    } else if (category === 'emigr' || category === 'emigration' || category === 'relocation') {
      const nonEmigrationKeywords = /(санкци\s+с\s+усманова|минобороны|генштаб|госдум|лавров|песков|всу\b|дрон|бпла|атак\w*|прилет|обстрел|снаряд|оккупац|пво\b|шахед|боевых\s+действ|квантов|астроном|галактик|телескоп|космос\b|рецепт|ингредиент|запекан|скумбри|выпечк|пирог|погод[аеу]|похолодан|потеплен|гороскоп|знак\s+зодиак|боинг|delphi|docker|ssh\b|субсиди|джаз\b|блефаропластик|совриск|экранизац|кинопоэт|диплом\w*\s+имеют\s+вакарчук|астролог)/i;
      const emigrationKeywords = /(эмиграц|релокац|релокант|переезд\w*\s+за|уехавш|уехал|перееха\w*\s+в\s+|за\s+рубеж|за\s+границ|чужбин|\bбеженц|\bубежищ|\bвнж\b|\bпмж\b|\bвиз[аыеуо]\b|\bвизов|\bзагранпаспорт|\bконсульств|\bдепортац|\bнострификац|\bадаптац\w*\s+в|\bязыков\w*\s+барьер|\bностальги\w*\s+по|\bтоск\w*\s+по\s+родин|\bчужая\s+стран|\bжизнь\s+в\s+(германи|серби|грузи|армени|турци|испани|кипр|казахстан|черногори|польш|чехи|сша|канаде|франци|израил|аргентин|португали)|\bэкспат|\bапостил|\bвтор\w*\s+гражданств|\bкарта\s+шансов|\bchancenkarte)/i;

      const emigrAll = nonSportsAll.filter(a => {
        if (a.category === 'tekh' || a.category === 'kultura' || a.category === 'psikh') return false;
        const full = `${a.title || ''} ${a.summary || ''}`;
        if (nonEmigrationKeywords.test(full)) return false;
        if (a.category === 'emigr') return true;
        return emigrationKeywords.test(full);
      });

      const ytAll = emigrAll.filter(a => a.isYouTube);
      const refugeeRegex = /(беженц|украинц|германи|польш|чехи|выплат|джобцентр|правил|пособи|статус|временн\w*\s+защит|европ|ес\b)/i;

      // 1. Топ-5 видео о новых правилах для украинских беженцев (свежие, самые актуальные и просматриваемые)
      const refugeeAll = ytAll
        .filter(a => a.isRefugeeRule || refugeeRegex.test(a.title || ''))
        .sort((a, b) => {
          const a3d = parsePublishedAgeMinutes(a.publishedDateText) <= 3 * 24 * 60 ? 1 : 0;
          const b3d = parsePublishedAgeMinutes(b.publishedDateText) <= 3 * 24 * 60 ? 1 : 0;
          if (a3d !== b3d) return b3d - a3d;
          const ageA = parsePublishedAgeMinutes(a.publishedDateText);
          const ageB = parsePublishedAgeMinutes(b.publishedDateText);
          if (ageA !== ageB) return ageA - ageB;
          return (b.viewCount || 0) - (a.viewCount || 0);
        });
      const top5Refugee = refugeeAll.slice(0, 5);

      // 2. Топ-10 видео об эмиграции в разные страны мира (Испания, США, Канада, Германия, Грузия, Сербия, Азия, ВНЖ 2026)
      const seenTitles = new Set(top5Refugee.map(v => (v.title || '').toLowerCase()));
      const worldVideos = ytAll
        .filter(a => !seenTitles.has((a.title || '').toLowerCase()) && !a.isRefugeeRule)
        .sort((a, b) => {
          const ageA = parsePublishedAgeMinutes(a.publishedDateText);
          const ageB = parsePublishedAgeMinutes(b.publishedDateText);
          if (ageA !== ageB) return ageA - ageB;
          return (b.viewCount || 0) - (a.viewCount || 0);
        });
      const top10World = worldVideos.slice(0, 10);

      const topYt = [...top5Refugee, ...top10World];
      const rssList = emigrAll.filter(a => !a.isYouTube).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 15);
      filtered = [...topYt, ...rssList];
    } else if (category === 'psikh' || category === 'psychology' || category === 'mental') {
      const nonPsychologyKeywords = /(санкци|усманов|путин|зеленск|минобороны|генштаб|госдум|лавров|макрон|трамп|байден|шольц|урсула|песков|кремл|правительств|парламент|дипломат|посол\b|посольств|мид\b|оон\b|нато\b|nato|ес\b|евросоюз|всу\b|дрон|бпла|атак\w*|прилет|обстрел|снаряд|оккупац|пво\b|шахед|погибш|ранен|боевых\s+действ|сводк\w*|олигарх|актив\w*\s+рф|суд\s+ес|квантов|астроном|галактик|телескоп|космос\b|ракетоносител|орбит\b|астероид|марсоход|луноход|экзопланет|черн\w*\s+дыр|окаменелост|динозавр|палеонтолог|археолог|коллайдер|сверхпроводим|лазерн|рецепт|ингредиент|блюд[ао]|запекан|скумбри|выпечк|пирог|погод[аеу]|похолодан|потеплен|гороскоп|знак\s+зодиак|боинг|boeing|delphi|docker|ssh\b|джаз\b|джазмен|рок-музык|певиц|певец\b|композитор|альбом\b|кинопоэт|альмодовар|кинофестивал|фестиваль|экранизац|кринолин|рюкзак|самые\s+точные\s+часы|батарейка|\bбар\b|\bбара\b|\bбаре\b|\bбаров\b|гонконг|космических\s+зондов|прививк|вакцин|кимчи|картину\s+случайно\s+нашли)/i;
      const humanPsychKeywords = /(психолог|психик|ментальн|депресси|тревог|тревожн|страх|паник|паническ|стресс|выгорани|апати|психотерапи|психиатр|расстройств|птср\b|фоби|психотравм|невроз|биполярн|сдвг\b|одиночеств|сон\b|бессонниц|когнитивн|манипуляц|абьюз|токсичн|эмоциональн|самооценк|психосоматик|нарцисс|социопат|зависимост|аддикци|мозг\b|нейробиолог|нейронаук|поведени|мышлени|психопат|медитаци|осознанност|беспомощност|стыд\b|вина\b|самобичеван|перфекционизм|прокрастинаци|экзистенциальн|эмиграци|релокаци|переезд|беженц|чужбин|адаптаци|ностальги|тоска|языков\w*\s+барьер|легализац|внж|пмж|виз\w*\s+проблем|культурн\w*\s+шок|изгнан|увольнен|сокращен|безработиц|потер\w*\s+работ|поиск\w*\s+работ|кризис\w*\s+карьер|уволен|банкротств|бедность|долг\b|кредит\w*\s+нагрузк|финансов\w*\s+стресс|потер\w*\s+доход|синдром\w*\s+самозванц|неопределенност|дауншифтинг|минимализм|смена\w*\s+професси|замедлен\w*\s+жизн|slow\s+life|эскапизм|фриланс|поиск\w*\s+себя|кризис\w*\s+среднего\s+возраст|переосмыслен|развод|расставан|разрыв\w*\s+отношен|бракосочетан|супружеск\w*\s+измен|предательств|бракоразводн|семейн\w*\s+кризис|токсичн\w*\s+брак|созависимост|бывш\w*\s+муж|бывш\w*\s+жен|поиск\w*\s+любви|дейтинг|знакомств|тиндер|tinder|свидани|любовн|романтическ|редфлаг|red\s*flag|совместимост|привязанност|страх\w*\s+близост|влюбленност|чувств|переживан|трагеди|травм|семь|родител|дет|воспитани|подростк|конфликт|ссора|боль\b|горе\b|утрат|поддержк|обидчик|простить)/i;

      const psikhAll = nonSportsAll.filter(a => {
        if (a.category !== 'psikh') return false;
        const full = `${a.title || ''} ${a.summary || ''}`;
        if (nonPsychologyKeywords.test(full)) return false;
        if (a.isYouTube || a.source?.includes('Psychologies') || a.source?.includes('Эмиграция') || a.source?.includes('Карьера') || a.source?.includes('Личный опыт')) return true;
        return humanPsychKeywords.test(full);
      });

      let ytList = psikhAll
        .filter(a => a.isYouTube)
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

      if (ytList.length < 15) {
        try {
          const freshYt = await fetchYouTubePsychologyVideos();
          if (freshYt && freshYt.length > 0) {
            for (const v of freshYt) {
              if (!newsCache.some(c => c.url === v.url || c.id === v.id)) {
                newsCache.push(v);
              }
            }
            ytList = [...ytList, ...freshYt]
              .filter((v, i, self) => i === self.findIndex(t => t.url === v.url || t.id === v.id))
              .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
          }
        } catch (e) {
          console.error('On-demand psychology YouTube fetch error:', e.message);
        }
      }

      const topYt = ytList.slice(0, 15);
      const rssList = psikhAll.filter(a => !a.isYouTube).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 15);
      filtered = [...topYt, ...rssList];
    } else if (category === 'absurd') {
      const absurdKeywords = /(курьез|абсурд|нелепо|странно|дичь|анекдот|скандал|задержали|оштрафовали|запретили|приняли закон|госдум|шаман|экстрасенс|чиновни|курьёз|прикол|фейк|бред|холод|вёрстка)/i;
      filtered = nonSportsAll.filter(a => a.category === 'absurd' || absurdKeywords.test(`${a.title || ''} ${a.summary || ''}`));
    } else if (category === 'ekonomika') {
      const ecoKeywords = /(эконом|рубл|доллар|евро\b|банк\b|цб\b|центробанк|ставк|инфляц|налог|бюджет|нефт|газ\b|газпром|акци|бизнес|санкци|дефицит|торговл|рынок|зарплат|пенси|цен[аы]|кризис\s+в|ввп\b)/i;
      filtered = nonSportsAll.filter(a => a.category === 'ekonomika' || ecoKeywords.test(`${a.title || ''} ${a.summary || ''}`));
    } else if (category === 'kultura') {
      const culKeywords = /(культур|кино|фильм|сериал|актер|актрис|режиссер|музык|песн|концерт|театр|спектакл|книг|писател|музей|выставк|шоу|звезд|преми|фестивал|искусств|художник|живопис)/i;
      filtered = nonSportsAll.filter(a => a.category === 'kultura' || culKeywords.test(`${a.title || ''} ${a.summary || ''}`));
    } else if (category === 'tekh' || category === 'tech') {
      const techKeywords = /(технолог|наук|it\b|ии\b|нейросет|робот|смартфон|apple|google|microsoft|чип\b|процессор|код\b|разработ|космос|nasa|роскосмос|физик|биолог|генет|квантов|гаджет)/i;
      filtered = nonSportsAll.filter(a => a.category === 'tekh' || a.category === 'tech' || techKeywords.test(`${a.title || ''} ${a.summary || ''}`));
    } else if (category === 'mir') {
      const mirKeywords = /(сша|европ|германи|франци|великобритани|лондон|вашингтон|китай|пекин|инди|ближн\w*\s+восток|израил|газ[ае]|иран|трамп|байден|оон\b|нато\b|nato|ес\b|евросоюз|мир\b|международн)/i;
      filtered = nonSportsAll.filter(a => a.category === 'mir' || mirKeywords.test(`${a.title || ''} ${a.summary || ''}`));
    } else if (category !== 'alle' && category !== 'vse') {
      filtered = nonSportsAll.filter(a => a.category === category);
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

// POST /api/news/custom - Пользовательская новость (из YouTube, Telegram, Twitter)
router.post('/api/news/custom', (req, res) => {
  try {
    const { title, summary = '', category = 'absurd', source = 'Своя новость', link = '', imageUrl = null, customPrompt = '' } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, error: 'Заголовок обязателен' });

    const customArticle = {
      id: `custom-${Date.now()}`,
      title: cleanText(title.trim()),
      summary: cleanText(summary.trim(), true),
      original_news: cleanText(summary.trim(), true),
      source: source.trim() || 'Своя новость',
      category: category || 'absurd',
      link: link.trim() || '',
      customPrompt: typeof customPrompt === 'string' ? customPrompt.trim() : '',
      pubDate: new Date().toISOString(),
      relativeTime: 'Только что',
      imageUrl: imageUrl || null,
      images: imageUrl ? [imageUrl] : [],
      isCustom: true,
    };

    if (!newsCache) newsCache = [];
    newsCache.unshift(customArticle);
    try {
      fs.writeFileSync(cacheFilePath, JSON.stringify({ lastFetch, articles: newsCache }, null, 2), 'utf-8');
    } catch (e) {
      console.error('Fehler beim Speichern:', e.message);
    }

    return res.json({ success: true, article: customArticle });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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
