import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
files.push('prisma/seed.ts');

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check if line contains dollar sign related to currency
    // e.g. $100, >$, $ {val}, `$${, '$', "$", Revenue ($), etc.
    const isCurrency =
      /\$[0-9]/.test(line) ||
      />\s*\$/.test(line) ||
      /`\$\$\{/.test(line) ||
      /\bRevenue \(\$\)/.test(line) ||
      /\$\{\s*[a-zA-Z0-9_.]*(?:price|fee|cost|amount|total|revenue|billed|outstanding|balance|paid|val)/i.test(line) ||
      /\bPayment of \$/.test(line) ||
      /\binvoice of \$/.test(line) ||
      /formatCurrency/.test(line);

    if (isCurrency) {
      console.log(`${f}:${idx + 1}: ${line.trim()}`);
    }
  });
});
