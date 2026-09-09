// sync-guess.js — run with: node sync-guess.js
// Scans public/images/guess/<category>/ and regenerates supabase/functions/_shared/data/guess.json
// Arabic names and emojis for existing categories are preserved automatically.

const { readdirSync, statSync, writeFileSync, existsSync, readFileSync } = require('fs');
const { join, extname, basename } = require('path');

const __root = __dirname;

const IMAGES_DIR  = join(__root, 'public', 'images', 'guess');
const OUTPUT_FILE = join(__root, 'supabase', 'functions', '_shared', 'data', 'guess.json');
const IMG_EXTS    = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

function toDisplayName(stem) {
  return stem
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

let existing = [];
if (existsSync(OUTPUT_FILE)) {
  try { existing = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8')); } catch {}
}
const existingMap = new Map(existing.map(c => [c.key, c]));

if (!existsSync(IMAGES_DIR)) {
  console.error('Folder not found: ' + IMAGES_DIR);
  console.error('Create public/images/guess/ and add category subfolders.');
  process.exit(1);
}

const categories = readdirSync(IMAGES_DIR)
  .filter(name => statSync(join(IMAGES_DIR, name)).isDirectory())
  .sort()
  .map(folderName => {
    const key = folderName;
    const prev = existingMap.get(key);

    const items = readdirSync(join(IMAGES_DIR, folderName))
      .filter(f => IMG_EXTS.has(extname(f).toLowerCase()))
      .sort()
      .map(f => {
        const stem = basename(f, extname(f));
        // Match by stem to preserve existing Arabic names
        const prevItem = prev && prev.items && prev.items.find(i => (i.file === f || i.file === stem));
        return {
          name: prevItem ? prevItem.name : toDisplayName(stem),
          file: f,  // full filename with extension
        };
      });

    return {
      key,
      name:  prev ? prev.name  : toDisplayName(folderName),
      emoji: prev ? prev.emoji : '🎯',
      items,
    };
  });

writeFileSync(OUTPUT_FILE, JSON.stringify(categories, null, 2), 'utf8');

const total = categories.reduce(function(s, c) { return s + c.items.length; }, 0);
console.log('Wrote ' + categories.length + ' categories, ' + total + ' items to guess.json');
console.log('Redeploy: supabase functions deploy get-guess-categories && supabase functions deploy get-guess-deal');
categories.forEach(function(c) { console.log('  ' + c.emoji + ' ' + c.key + ' (' + c.items.length + ' items)'); });
