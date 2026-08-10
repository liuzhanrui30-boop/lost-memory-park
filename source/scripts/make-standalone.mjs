import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const entry = path.join(dist, 'index.html');
let html = fs.readFileSync(entry, 'utf8');
const scriptMatch = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/);
const styleMatch = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/);

if (!scriptMatch || !styleMatch) throw new Error('Unable to find Vite assets for standalone build');

const js = fs.readFileSync(path.join(dist, scriptMatch[1]), 'utf8')
  .replace(/\/\/# sourceMappingURL=.*$/m, '')
  .replaceAll('</script', '<\\/script');
const css = fs.readFileSync(path.join(dist, styleMatch[1]), 'utf8')
  .replaceAll('</style', '<\\/style');

html = html.replace(scriptMatch[0], `<script type="module">${js}</script>`);
html = html.replace(styleMatch[0], `<style>${css}</style>`);
fs.writeFileSync(path.join(dist, 'lost-memory-park.html'), html);
