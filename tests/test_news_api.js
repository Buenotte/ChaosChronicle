import assert from 'assert';

console.log('🧪 [TEST 1/5] Running News API & RSS Feed Tests...');

async function runNewsTests() {
  // 1. Health Status
  const statusRes = await fetch('http://localhost:3001/api/status');
  assert.strictEqual(statusRes.status, 200, 'Status endpoint must return 200');
  const statusData = await statusRes.json();
  assert.strictEqual(statusData.status, 'online', 'Status must be online');
  console.log('  ✅ GET /api/status passed');

  // 2. Fetch News
  const newsRes = await fetch('http://localhost:3001/api/news?category=alle');
  assert.strictEqual(newsRes.status, 200, 'News endpoint must return 200');
  const newsData = await newsRes.json();
  assert.ok(Array.isArray(newsData.articles), 'Articles must be an array');
  assert.ok(newsData.articles.length > 0, 'Articles count must be > 0');
  console.log(`  ✅ GET /api/news passed (${newsData.articles.length} articles loaded)`);

  // 3. Category Filter
  const kulturaRes = await fetch('http://localhost:3001/api/news?category=kultura');
  const kulturaData = await kulturaRes.json();
  assert.ok(Array.isArray(kulturaData.articles), 'Kultura articles must be an array');
  console.log(`  ✅ GET /api/news?category=kultura passed (${kulturaData.articles.length} articles)`);
}

runNewsTests()
  .then(() => console.log('🎉 News API Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ News API Tests FAILED:', err.message);
    process.exit(1);
  });
