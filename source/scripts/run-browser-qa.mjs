import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const host = '127.0.0.1';
const freePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, host, () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    server.close(error => error ? reject(error) : resolve(port));
  });
});
const previewPort = Number(process.env.PREVIEW_PORT ?? await freePort());
const cdpPort = Number(process.env.CDP_PORT ?? await freePort());
const gameUrl = `http://${host}:${previewPort}/?debug=1`;
const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const chrome = chromeCandidates.find(candidate => fs.existsSync(candidate));

if (!chrome) {
  throw new Error('未找到 Chrome/Chromium。可通过 CHROME_BIN 指定浏览器路径。');
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lost-memory-park-qa-'));
const artifacts = path.resolve('qa-artifacts');
fs.mkdirSync(artifacts, { recursive: true });

const preview = spawn(npm, ['run', 'preview', '--', '--host', host, '--port', String(previewPort)], {
  stdio: 'inherit',
});
const browser = spawn(chrome, [
  '--headless=new',
  '--disable-gpu-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${profile}`,
  gameUrl,
], { stdio: 'ignore' });

const waitFor = async url => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // 服务和浏览器仍在启动。
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`等待服务超时：${url}`);
};

const run = file => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [file, String(cdpPort), gameUrl, artifacts], { stdio: 'inherit' });
  child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${file} 验收失败：${code}`)));
  child.once('error', reject);
});
const terminate = child => new Promise(resolve => {
  if (child.exitCode !== null || child.signalCode) return resolve();
  const force = setTimeout(() => child.kill('SIGKILL'), 1500);
  child.once('exit', () => {
    clearTimeout(force);
    resolve();
  });
  child.kill('SIGTERM');
});

try {
  await waitFor(gameUrl);
  await waitFor(`http://${host}:${cdpPort}/json`);
  await run('qa/progression-acceptance.mjs');
  await run('qa/mobile-acceptance.mjs');
  await run('qa/performance-profile.mjs');
  console.log(`浏览器验收完成，截图位于：${artifacts}`);
} finally {
  await Promise.all([terminate(browser), terminate(preview)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
