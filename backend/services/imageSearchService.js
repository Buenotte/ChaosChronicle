export function cleanText(str = '') {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export async function scrapeArticlePhotos(articleUrl, pubDate = null) {
  if (!articleUrl) return [];

  if (pubDate) {
    const articleTime = new Date(pubDate).getTime();
    if (!isNaN(articleTime)) {
      const ageHours = (Date.now() - articleTime) / (1000 * 60 * 60);
      if (ageHours > 24) {
        return [];
      }
    }
  }

  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];
    const html = await res.text();

    const timeMatch = html.match(/<meta[^>]+(?:article:published_time|date|pubdate)[^>]+content=["']([^"']+)["']/i);
    if (timeMatch && timeMatch[1]) {
      const pageTime = new Date(timeMatch[1]).getTime();
      if (!isNaN(pageTime)) {
        const ageHours = (Date.now() - pageTime) / (1000 * 60 * 60);
        if (ageHours > 24) {
          return [];
        }
      }
    }

    const photos = [];
    const baseUrl = new URL(articleUrl).origin;

    const toAbs = (src) => {
      if (!src) return null;
      try {
        let abs = src;
        if (src.startsWith('//')) abs = 'https:' + src;
        else if (!src.startsWith('http')) abs = new URL(src, baseUrl).href;

        const oldYearsRegex = /\/(201\d|202[0-5])\//;
        if (oldYearsRegex.test(abs)) {
          return null;
        }
        return abs;
      } catch {
        return null;
      }
    };

    const metaMatches = html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/gi);
    for (const m of metaMatches) {
      const abs = toAbs(m[1]);
      if (abs) photos.push(abs);
    }

    const metaMatches2 = html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi);
    for (const m of metaMatches2) {
      const abs = toAbs(m[1]);
      if (abs) photos.push(abs);
    }

    const imgMatches = html.matchAll(/<img[^>]+(?:src|data-src|srcset)=["']([^"'\s,]+)["']/gi);
    for (const m of imgMatches) {
      const abs = toAbs(m[1]);
      if (abs && /\.(jpg|jpeg|png|webp|gif)/i.test(abs)) {
        if (!/avatar|logo|pixel|tracker|icon|svg|share|button|banner-ad/i.test(abs)) {
          photos.push(abs);
        }
      }
    }

    return [...new Set(photos)];
  } catch (err) {
    return [];
  }
}

export async function fetchDDGPhotos(query) {
  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&df=d&iar=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!tokenRes.ok) return [];
    const text = await tokenRes.text();
    const vqdMatch = text.match(/vqd=([0-9-]+)/);
    if (!vqdMatch || !vqdMatch[1]) return [];

    const imgRes = await fetch(`https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqdMatch[1]}&df=d&f=,,,d`, {
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

export async function searchLiveNewsPhotos(queryTitle) {
  if (!queryTitle) return [];

  try {
    const titleClean = cleanText(queryTitle);
    const stopWords = new Set(['в', 'на', 'и', 'с', 'по', 'за', 'из', 'от', 'для', 'что', 'как', 'это', 'был', 'были', 'над', 'под', 'об', 'или', 'но', 'после', 'около']);
    const rawWords = titleClean
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));

    const keyNouns = rawWords.slice(0, 4);
    const keywords = keyNouns.join(' ');

    if (!keywords) return [];

    const [mainResults, agencyResults] = await Promise.all([
      fetchDDGPhotos(`"${keywords}"`),
      fetchDDGPhotos(`${keywords} фото репортаж`),
    ]);

    const combined = [...mainResults, ...agencyResults];
    const photos = [];
    const seen = new Set();

    const junkWords = ['инструкция', 'памятка', 'обучающих', 'учащих', 'школ', 'урок', 'плакат', 'схема', 'вектор', 'vector', 'stock', 'drawing', 'illustration', 'логотип', 'правила', 'методичка', 'avatar', 'author', 'banner', 'shutterstock'];
    const lowerKeyNouns = keyNouns.map(w => w.toLowerCase());
    const primarySubject = lowerKeyNouns[0] ? lowerKeyNouns[0].slice(0, 5) : '';

    combined.forEach(item => {
      const imgUrl = item.image;
      if (!imgUrl || !/^https?:\/\//i.test(imgUrl) || !/\.(jpg|jpeg|png|webp)/i.test(imgUrl)) return;
      if (seen.has(imgUrl) || imgUrl.includes('pixel') || imgUrl.includes('tracker') || imgUrl.includes('logo') || imgUrl.includes('avatar') || imgUrl.includes('ytimg') || imgUrl.includes('youtube') || imgUrl.includes('vimeo') || imgUrl.includes('rutube')) return;

      const itemTitleLower = (item.title || '').toLowerCase();
      const imgUrlLower = imgUrl.toLowerCase();

      const isJunk = junkWords.some(j => itemTitleLower.includes(j) || imgUrlLower.includes(j));
      if (isJunk) return;

      const oldYearMatch = /(201\d|202[0-5])/.test(itemTitleLower) || /(201\d|202[0-5])/.test(imgUrlLower);
      if (oldYearMatch) return;

      const hasMonthName = /(января|февраля|марта|апреля|мая|июня|июля|сентября|октября|ноября|декабря)/i.test(itemTitleLower);
      const hasDotDate = /(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])/.test(itemTitleLower) || /(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])/.test(imgUrlLower);
      const isAugust = /августа/i.test(itemTitleLower);

      if (hasMonthName || hasDotDate) return;
      if (isAugust && !/1[23]\s*августа/i.test(itemTitleLower)) return;

      const matchesCount = lowerKeyNouns.filter(noun => itemTitleLower.includes(noun) || imgUrlLower.includes(noun)).length;
      const matchesPrimary = primarySubject && (itemTitleLower.includes(primarySubject) || imgUrlLower.includes(primarySubject));

      if (!matchesPrimary && matchesCount < 2) return;

      seen.add(imgUrl);

      let providerName = 'Информагентство';
      try {
        const hostname = new URL(imgUrl).hostname.replace(/^www\./, '');
        if (hostname.includes('unian.')) providerName = 'УНИАН (UNIAN)';
        else if (hostname.includes('suspilne.')) providerName = 'Суспільне (Suspilne)';
        else if (hostname.includes('ukrinform.')) providerName = 'Укринформ (Ukrinform)';
        else if (hostname.includes('24tv.ua')) providerName = '24 Канал';
        else if (hostname.includes('obozrevatel.')) providerName = 'Обозреватель';
        else if (hostname.includes('liga.net')) providerName = 'ЛІГА.net';
        else if (hostname.includes('lb.ua')) providerName = 'Левый Берег (LB.ua)';
        else if (hostname.includes('dw.com')) providerName = 'Deutsche Welle';
        else if (hostname.includes('meduza.io')) providerName = 'Meduza';
        else if (hostname.includes('bbc.com') || hostname.includes('bbc.co.uk')) providerName = 'BBC News';
        else if (hostname.includes('reuters.com')) providerName = 'Reuters';
        else if (hostname.includes('apnews.com')) providerName = 'Associated Press (AP)';
        else if (hostname.includes('svoboda.org')) providerName = 'Радио Свобода';
        else if (hostname.includes('novayagazeta')) providerName = 'Новая газета';
        else providerName = hostname;
      } catch {}

      photos.push({
        url: imgUrl,
        source: providerName,
        articleTitle: item.title || queryTitle,
        isExactArticle: false,
        quality: 'search',
      });
    });

    return photos.slice(0, 35);
  } catch (err) {
    return [];
  }
}
