import fs from 'node:fs';
import path from 'node:path';

const source=path.resolve('dist/lost-memory-park.html');
const target=path.resolve('..','index.html');
if(!fs.existsSync(source))throw new Error('请先运行 npm run build');
fs.copyFileSync(source,target);
console.log(`已同步 GitHub Pages：${target}`);
