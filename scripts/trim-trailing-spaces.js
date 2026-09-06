import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist']);

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (IGNORE_DIRS.has(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk(rootDir);
let trimmedCount = 0;

for (const file of files) {
  try {
    const buffer = fs.readFileSync(file);
    let isBinary = false;
    for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
      if (buffer[i] === 0) {
        isBinary = true;
        break;
      }
    }
    if (isBinary) continue;

    const content = buffer.toString('utf8');
    const lines = content.split('\n');
    let modified = false;

    const newLines = lines.map(line => {
      // Remove trailing spaces or tabs (ignoring \r if present)
      const trimmed = line.replace(/[ \t]+(\r?)$/, '$1');
      if (trimmed !== line) modified = true;
      return trimmed;
    });

    if (modified) {
      fs.writeFileSync(file, newLines.join('\n'), 'utf8');
      const relPath = path.relative(rootDir, file);
      console.log(`Trimmed trailing spaces: ${relPath}`);
      trimmedCount++;
    }
  } catch (err) {
    // Ignore read errors for special files
  }
}

if (trimmedCount > 0) {
  console.log(`Successfully trimmed trailing whitespace from ${trimmedCount} file(s).`);
}
