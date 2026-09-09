import fs from 'fs';

/**
 * Scrapes and extracts full article text from a given web URL.
 * Returns clean, multi-paragraph text or null if scraping fails.
 */
export async function scrapeArticleText(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9,uk;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    // Find main content block
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                         html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                         html.match(/<div[^>]+class=["'][^"']*(?:article|post|content|story|entry|page-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const scopeHtml = articleMatch ? articleMatch[1] : html;

    const pMatches = scopeHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    const cleaned = pMatches
      .map(p => p.replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
                 .replace(/&quot;/g, '"')
                 .replace(/&laquo;/g, '«')
                 .replace(/&raquo;/g, '»')
                 .replace(/&#8212;/g, '—')
                 .replace(/&mdash;/g, '—')
                 .replace(/&ndash;/g, '–')
                 .replace(/&amp;/g, '&')
                 .replace(/<[^>]+>/g, ' ')
                 .replace(/[ \t]+/g, ' ')
                 .trim())
      .filter(p => p.length > 25 &&
                   !p.includes('Реклама') &&
                   !p.includes('Google') &&
                   !p.includes('Facebook') &&
                   !p.includes('Twitter') &&
                   !p.includes('Telegram-канал') &&
                   !p.includes('Условия использования') &&
                   !p.includes('Все права защищены') &&
                   !p.includes('Підпишіться на') &&
                   !p.includes('Читайте нас у') &&
                   !p.includes('Подписывайтесь на') &&
                   !p.includes('Cookie') &&
                   !p.includes('JavaScript')
      );

    // Extract article headline (h1)
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    let h1Text = '';
    if (h1Match) {
      h1Text = h1Match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&laquo;/g, '«')
        .replace(/&raquo;/g, '»')
        .replace(/&#8212;/g, '—')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&amp;/g, '&')
        .replace(/[ \t]+/g, ' ')
        .trim();
    }

    if (cleaned.length > 0) {
      let fullText = cleaned.join('\n\n');
      if (h1Text && !fullText.toLowerCase().includes(h1Text.toLowerCase().slice(0, 25))) {
        fullText = `${h1Text}\n\n${fullText}`;
      }
      if (fullText.length > 80) return fullText;
    }
  } catch (err) {
    // Network or parse error
  }
  return null;
}
