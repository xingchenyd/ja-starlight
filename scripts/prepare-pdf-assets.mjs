import { cp, mkdir } from 'node:fs/promises';
// PDF.js uses these local tables for Chinese and other CID-font PDFs.
// Generated from the pinned npm dependency; no third-party CDN is involved.
for (const folder of ['cmaps', 'standard_fonts']) {
  const target = new URL(`../public/pdfjs/${folder}/`, import.meta.url);
  await mkdir(target, { recursive: true });
  await cp(new URL(`../node_modules/pdfjs-dist/${folder}/`, import.meta.url), target, { recursive: true });
}
