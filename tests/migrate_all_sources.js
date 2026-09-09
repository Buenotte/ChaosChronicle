import fs from 'fs';
import path from 'path';
import { scrapeArticleText } from '../backend/services/articleScraperService.js';

async function migrateAllPackages() {
  const newsDir = 'news';
  const dirs = fs.readdirSync(newsDir);
  console.log(`Processing ${dirs.length} packages in news/...`);

  for (const dir of dirs) {
    const pkgDir = path.join(newsDir, dir);
    const projPath = path.join(pkgDir, 'project.json');
    if (!fs.existsSync(projPath)) continue;

    const proj = JSON.parse(fs.readFileSync(projPath, 'utf-8'));
    const url = proj.url || proj.link || '';

    console.log(`\n--------------------------------------------`);
    console.log(`Package: ${dir}`);
    console.log(`Title: ${proj.title}`);
    console.log(`URL: ${url || 'None'}`);

    if (url && /^https?:\/\//i.test(url)) {
      try {
        const scraped = await scrapeArticleText(url);
        if (scraped && scraped.length > 100) {
          console.log(`✨ Successfully scraped ${scraped.length} chars (${scraped.split(/\s+/).length} words) from web`);
          // 1. source.txt
          fs.writeFileSync(path.join(pkgDir, 'source.txt'), scraped, 'utf-8');
          // 2. original_news.txt
          fs.writeFileSync(path.join(pkgDir, 'original_news.txt'), scraped, 'utf-8');
          // 3. project.json
          proj.summary = scraped;
          proj.original_news = scraped;
          fs.writeFileSync(projPath, JSON.stringify(proj, null, 2), 'utf-8');
          // 4. script.md
          const scriptPath = path.join(pkgDir, 'script.md');
          if (fs.existsSync(scriptPath)) {
            const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
            const quoteLines = scraped.split('\n').map(l => l.trim() ? `> ${l}` : '>').join('\n');
            const updatedScript = scriptContent.replace(
              /## 📝 Исходное сообщение \/ Новость \(Telegram \/ Источник\)[\s\S]*?---/,
              `## 📝 Исходное сообщение / Новость (Telegram / Источник)\n\n${quoteLines}\n\n---`
            );
            fs.writeFileSync(scriptPath, updatedScript, 'utf-8');
          }
          console.log(`💾 Saved updated original text to disk.`);
        } else {
          console.log(`ℹ️ Scraper returned no data (keeping existing text).`);
        }
      } catch (err) {
        console.error(`Error scraping ${url}:`, err.message);
      }
    } else {
      console.log(`ℹ️ No web URL (Telegram/Custom message) -> Preserved current text.`);
    }
  }

  console.log(`\n✅ Finished checking all saved packages.`);
}

migrateAllPackages();
