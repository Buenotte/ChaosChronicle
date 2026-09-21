import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../frontend/node_modules/@babel/parser/lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../frontend/src');

console.log('🧪 [TEST 17] Running Frontend Module Resolution & Contract Tests...');

function getAllFiles(dir, exts = ['.jsx', '.js']) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist') {
        files = files.concat(getAllFiles(full, exts));
      }
    } else if (exts.includes(path.extname(item))) {
      files.push(full);
    }
  }
  return files;
}

const files = getAllFiles(srcDir);
let resolvedImports = 0;

for (const filePath of files) {
  const code = fs.readFileSync(filePath, 'utf-8');
  let ast;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  } catch {
    continue;
  }

  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration' || (node.type === 'ExportNamedDeclaration' && node.source)) {
      const source = (node.source || node.declaration?.source)?.value;
      if (!source || !source.startsWith('.')) continue; // skip third-party npm packages

      const callerDir = path.dirname(filePath);
      const possibleExtensions = ['', '.js', '.jsx', '.json', '.css'];
      let found = false;

      for (const ext of possibleExtensions) {
        const target = path.resolve(callerDir, source + ext);
        if (fs.existsSync(target) && !fs.statSync(target).isDirectory()) {
          found = true;
          resolvedImports++;
          break;
        }
        // Check if it is a directory with index.js / index.jsx
        const indexJs = path.resolve(callerDir, source, 'index.js');
        const indexJsx = path.resolve(callerDir, source, 'index.jsx');
        if (fs.existsSync(indexJs) || fs.existsSync(indexJsx)) {
          found = true;
          resolvedImports++;
          break;
        }
      }

      assert(found, `Broken relative import in "${path.relative(srcDir, filePath)}": cannot resolve "${source}"`);
    }
  }
}

console.log(`  ✅ All ${resolvedImports} relative imports across ${files.length} frontend files resolved successfully.`);
console.log('🎉 Frontend Module Resolution & Contract Tests PASSED!\n');
