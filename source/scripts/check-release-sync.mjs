import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const built = path.resolve('dist/lost-memory-park.html');
const published = path.resolve('..', 'index.html');
const play = path.resolve('..', 'play.html');

for (const file of [built, published, play]) {
  if (!fs.existsSync(file)) {
    throw new Error(`缺少发布文件：${file}`);
  }
}

const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const builtHash = digest(built);
const publishedHash = digest(published);
const playHash = digest(play);

if (builtHash !== publishedHash || builtHash !== playHash) {
  throw new Error([
    'GitHub Pages 根目录版本与源码构建结果不一致。',
    `build: ${builtHash}`,
    `pages: ${publishedHash}`,
    `play: ${playHash}`,
    '请运行 npm run release:pages 后重新提交。',
  ].join('\n'));
}

console.log(`发布文件已同步：${builtHash}`);
