const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets');
const keepPng = new Set(['app-icon.png', 'favicon.png']);

const files = fs
  .readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith('.png') && !keepPng.has(f));

(async () => {
  let totalBefore = 0;
  let totalAfter = 0;
  for (const f of files) {
    const src = path.join(dir, f);
    const dest = path.join(dir, f.replace(/\.png$/i, '.webp'));
    await sharp(src).webp({ quality: 80 }).toFile(dest);
    const before = fs.statSync(src).size;
    const after = fs.statSync(dest).size;
    totalBefore += before;
    totalAfter += after;
    console.log(
      `${f} -> ${path.basename(dest)}  ${Math.round(before / 1024)}KB => ${Math.round(after / 1024)}KB`,
    );
  }
  console.log(
    `done ${files.length} files  ${Math.round(totalBefore / 1024 / 1024)}MB => ${Math.round(totalAfter / 1024 / 1024)}MB`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
