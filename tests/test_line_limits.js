import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 [TEST 13/14] Running File Line Count Constraint Check (<= 389 lines)...');

const MAX_LINES = 389;
let totalChecked = 0;
const violations = [];

function checkDir(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'dist' && item.name !== 'brain') {
        checkDir(full);
      }
    } else if (item.name.endsWith('.js') || item.name.endsWith('.jsx') || item.name.endsWith('.css')) {
      totalChecked++;
      const content = fs.readFileSync(full, 'utf8');
      const lineCount = content.split('\n').length;
      if (lineCount > MAX_LINES) {
        const rel = path.relative(rootDir, full);
        violations.push({ file: rel, lines: lineCount });
      }
    }
  }
}

checkDir(rootDir);

if (violations.length > 0) {
  console.error(`❌ Found ${violations.length} file(s) exceeding ${MAX_LINES} lines:`);
  violations.forEach(v => console.error(`  - ${v.file}: ${v.lines} lines (limit: ${MAX_LINES})`));
  process.exit(1);
} else {
  console.log(`  ✅ All ${totalChecked} (.js, .jsx, .css) files strictly comply with <= ${MAX_LINES} lines limit.`);
  console.log('🎉 Line Count Constraint Check PASSED!\n');
}
