import assert from 'assert';
import { scrapeArticleText, extractMainText } from '../backend/services/articleScraperService.js';

console.log('🧪 [TEST 15] Running Article Scraper & Text Extraction Pipeline Tests...');

// 1. Test HTML Main Text Extraction
const mockHtml = `
<!DOCTYPE html>
<html>
<head><title>Test Article Title</title></head>
<body>
  <nav><a href="/">Home</a><a href="/news">News</a></nav>
  <header><h1>Header Navigation</h1></header>
  <main>
    <article>
      <h1>Главная новость дня: Рекордные показатели</h1>
      <p>В Берлине сегодня завершился международный экономический форум.</p>
      <p>Эксперты отметили значительный рост инвестиций в зеленую энергетику.</p>
      <p>Участники обсудили ключевые вызовы и перспективы на 2026-2027 годы.</p>
    </article>
  </main>
  <aside>
    <div class="sidebar">Реклама и баннеры</div>
  </aside>
  <footer>
    <p>Copyright 2026 Все права защищены</p>
  </footer>
</body>
</html>
`;

const extractedText = extractMainText(mockHtml);
assert(extractedText, 'Extracted text should not be empty');
assert(extractedText.includes('Главная новость дня'), 'Should contain main article headline');
assert(extractedText.includes('зеленую энергетику'), 'Should contain article paragraphs');
assert(!extractedText.includes('Header Navigation'), 'Should remove header navigation');
assert(!extractedText.includes('Реклама и баннеры'), 'Should remove aside/advertisement content');
console.log(`  ✅ HTML boilerplate stripping verified (${extractedText.split(/\s+/).length} words extracted)`);

// 2. Test Invalid/Empty Inputs
const emptyResult = extractMainText('');
assert.strictEqual(emptyResult, '', 'Empty HTML should return empty string');

const nullResult = extractMainText(null);
assert.strictEqual(nullResult, '', 'Null HTML should return empty string');
console.log('  ✅ Null & empty input edge cases handled gracefully');

// 3. Test Scraper Timeout & Failure Fallback
(async () => {
  try {
    const invalidUrlResult = await scrapeArticleText('http://invalid-non-existent-domain-12345.xyz/article');
    assert(invalidUrlResult === null || typeof invalidUrlResult === 'string', 'Scraper should handle network failure gracefully');
    console.log('  ✅ Network failure fallback verified (returns null/string without crashing)');
  } catch (err) {
    assert.fail(`Scraper should not throw uncaught errors: ${err.message}`);
  }

  console.log('🎉 Article Scraper Tests PASSED!\n');
})();
