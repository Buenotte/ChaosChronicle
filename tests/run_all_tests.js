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
];

let passedCount = 0;
const startTime = Date.now();

for (const suite of testSuites) {
  const suitePath = path.join(__dirname, suite.file);
  console.log(`▶ Running Suite: ${suite.name}...`);
  try {
    const output = execSync(`node "${suitePath}"`, { encoding: 'utf-8', timeout: 35000 });
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
