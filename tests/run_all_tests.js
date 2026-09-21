import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🚀 CHAOSCHRONICLE COMPLETE TEST SUITE');
console.log('====================================================\n');

const testSuites = [
  { name: '1. News API & RSS Live Feeds', file: 'test_news_api.js' },
  { name: '2. Golobutsky Titles & AI Generator', file: 'test_titles_service.js' },
  { name: '3. Typography & Thumbnail Engine (FFmpeg)', file: 'test_thumbnail_engine.js' },
  { name: '4. Saved Packages & Artifacts Storage', file: 'test_packages_service.js' },
  { name: '5. Photos Scraper & Storage Engine', file: 'test_photos_service.js' },
  { name: '6. Custom Fonts Upload & Management', file: 'test_fonts_service.js' },
  { name: '7. Edge-TTS Audio Generation', file: 'test_audio_service.js' },
  { name: '8. Video Engine & Subscribe Banner (FFmpeg)', file: 'test_video_engine.js' },
  { name: '9. Frontend React AST & Modal Smoke Tests', file: 'test_frontend_smoke.js' },
  { name: '10. YouTube Shorts 9:16 Studio & FFmpeg Pipeline', file: 'test_shorts_engine.js' },
  { name: '11. YouTube Audio Extraction & 3-Min Script Pipeline', file: 'test_youtube_service.js' },
  { name: '12. Auto Photos 100 Engine & Web Downloader', file: 'test_auto_photos.js' },
  { name: '13. Strict File Line Limits (<= 389 lines)', file: 'test_line_limits.js' },
  { name: '14. Reusable Common Components & Voice Registry', file: 'test_common_components.js' },
  { name: '15. Article Scraper & Text Extraction Pipeline', file: 'test_article_scraper.js' },
  { name: '16. Backend API Edge Cases & Error Handling', file: 'test_backend_edge_cases.js' },
  { name: '17. Frontend Module Resolution & Component Contracts', file: 'test_frontend_contracts.js' },
];

let passedCount = 0;
const startTime = Date.now();

function ensureServerReady() {
  for (let i = 0; i < 15; i++) {
    try {
      execSync('node -e "fetch(\'http://localhost:3001/api/status\').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"', { timeout: 2000, stdio: 'ignore' });
      return true;
    } catch {
      try { execSync('node -e "setTimeout(()=>process.exit(0), 500)"', { stdio: 'ignore' }); } catch {}
    }
  }
  return false;
}

ensureServerReady();

for (const suite of testSuites) {
  ensureServerReady();
  const suitePath = path.join(__dirname, suite.file);
  console.log(`▶ Running Suite: ${suite.name}...`);
  try {
    const output = execSync(`node "${suitePath}"`, { encoding: 'utf-8', timeout: 120000 });
    console.log(output);
    passedCount++;
  } catch (err) {
    console.error(`❌ Suite "${suite.name}" FAILED:`);
    console.error(err.stdout || err.message);
  }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('====================================================');
if (passedCount === testSuites.length) {
  console.log(`✨ ALL ${passedCount}/${testSuites.length} TEST SUITES PASSED SUCCESSFULLY! (${totalDuration}s)`);
} else {
  console.log(`⚠️ ${passedCount}/${testSuites.length} TEST SUITES PASSED (${testSuites.length - passedCount} FAILED).`);
}
console.log('====================================================\n');
