import fs from 'node:fs';
import path from 'node:path';
import { assertAll, connect, sleep } from './cdp-client.mjs';

const port = process.argv[2] ?? '9223';
const url = process.argv[3] ?? 'http://127.0.0.1:4173/?debug=1';
const artifacts = process.argv[4] ?? 'qa-artifacts';
const client = await connect(port);
const { send, evaluate, errors } = client;
const metrics = (width, height, mobile = true) => send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 2,
  mobile,
  screenWidth: width,
  screenHeight: height,
});
const touch = (type, touchPoints) => send('Input.dispatchTouchEvent', { type, touchPoints, modifiers: 0 });

await metrics(844, 390, true);
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.navigate', { url });
await sleep(1200);
await evaluate('localStorage.clear()');
await send('Page.reload', { ignoreCache: true });
await sleep(1400);

const title = await evaluate(`(() => {
  const card = document.querySelector('.title-card').getBoundingClientRect();
  const controls = document.querySelector('#touch-controls');
  return {
    version: document.querySelector('#title-screen .eyebrow')?.textContent,
    capable: document.documentElement.classList.contains('touch-capable'),
    enabled: document.documentElement.classList.contains('touch-enabled'),
    controlsHidden: controls.classList.contains('hidden'),
    card: { top: card.top, bottom: card.bottom, height: card.height },
    viewport: [innerWidth, innerHeight],
    scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    orientation: getComputedStyle(document.querySelector('#orientation-hint')).display
  };
})()`);
await evaluate(`document.querySelector('#new-game').click()`);
await sleep(300);
const active = await evaluate(`(() => {
  const controls = document.querySelector('#touch-controls');
  const canvas = document.querySelector('canvas');
  const rects = Object.fromEntries([...controls.querySelectorAll('button[data-action]')].map(button => {
    const rect = button.getBoundingClientRect();
    return [button.dataset.action, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width, h: rect.height }];
  }));
  return {
    hidden: controls.classList.contains('hidden'),
    aria: controls.getAttribute('aria-hidden'),
    active: document.documentElement.classList.contains('touch-active'),
    rects,
    canvas: { width: canvas.width, height: canvas.height },
    snapshot: window.__lostMemoryParkDebug.snapshot()
  };
})()`);

const { right, left, jump, drop, pause } = active.rects;
await touch('touchStart', [
  { x: right.x, y: right.y, id: 1, radiusX: 8, radiusY: 8, force: 1 },
  { x: jump.x, y: jump.y, id: 2, radiusX: 8, radiusY: 8, force: 1 },
]);
await sleep(100);
const multi = await evaluate(`({ snapshot: window.__lostMemoryParkDebug.snapshot(), pressed: [...document.querySelectorAll('.is-pressed')].map(element => element.dataset.action) })`);
await touch('touchMove', [
  { x: left.x, y: left.y, id: 1, radiusX: 8, radiusY: 8, force: 1 },
  { x: jump.x, y: jump.y, id: 2, radiusX: 8, radiusY: 8, force: 1 },
]);
await sleep(190);
const slide = await evaluate(`({ snapshot: window.__lostMemoryParkDebug.snapshot(), pressed: [...document.querySelectorAll('.is-pressed')].map(element => element.dataset.action) })`);
await touch('touchEnd', []);

await evaluate('window.__lostMemoryParkDebug.startRoom(1); window.__lostMemoryParkDebug.teleport(2212,520)');
await sleep(220);
const dropBefore = await evaluate('window.__lostMemoryParkDebug.snapshot()');
await touch('touchStart', [{ x: drop.x, y: drop.y, id: 4, radiusX: 8, radiusY: 8, force: 1 }]);
await touch('touchEnd', []);
await sleep(80);
const dropAfter = await evaluate('window.__lostMemoryParkDebug.snapshot()');

await touch('touchStart', [{ x: pause.x, y: pause.y, id: 3, radiusX: 8, radiusY: 8, force: 1 }]);
await touch('touchEnd', []);
await sleep(70);
const touchPause = await evaluate(`({ paused: window.__lostMemoryParkDebug.snapshot().paused, panel: !document.querySelector('#pause-screen').classList.contains('hidden') })`);
await evaluate(`document.querySelector('#resume-game').click()`);

fs.mkdirSync(artifacts, { recursive: true });
const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
fs.writeFileSync(path.join(artifacts, 'mobile.png'), Buffer.from(image.data, 'base64'));

await metrics(390, 844, true);
await sleep(180);
const portrait = await evaluate(`getComputedStyle(document.querySelector('#orientation-hint')).display`);
await send('Emulation.setTouchEmulationEnabled', { enabled: false });
await metrics(1440, 900, false);
await send('Page.reload', { ignoreCache: true });
await sleep(700);
const desktop = await evaluate(`(() => {
  document.querySelector('#new-game').click();
  return new Promise(resolve => setTimeout(() => {
    const canvas = document.querySelector('canvas');
    resolve({
      capable: document.documentElement.classList.contains('touch-capable'),
      enabled: document.documentElement.classList.contains('touch-enabled'),
      controlsHidden: document.querySelector('#touch-controls').classList.contains('hidden'),
      render: window.__lostMemoryParkDebug.snapshot().render,
      canvas: [canvas.width, canvas.height]
    });
  }, 220));
})()`);

const runtimeErrors = errors.filter(error => !String(error.entry?.url ?? '').endsWith('/favicon.ico'));
const report = { suite: 'mobile', title, active, multi, slide, drop: { before: dropBefore, after: dropAfter }, touchPause, portrait, desktop, errors: runtimeErrors };
assertAll([
  { label: '手机标题版本错误', ok: title.version?.includes('v12.6') },
  { label: '手机触控能力未启用', ok: title.capable && title.enabled },
  { label: '标题页触控按钮不应显示', ok: title.controlsHidden },
  { label: '标题卡超出横屏', ok: title.card.bottom <= title.viewport[1] + 2 && title.scroll[0] <= title.viewport[0] + 2 },
  { label: '横屏错误显示旋转提示', ok: title.orientation === 'none' },
  { label: '进入游戏后触控按钮未显示', ok: !active.hidden && active.aria === 'false' && active.active },
  { label: '手机内部画布不是 1280×720', ok: active.snapshot.render.dpr === 1 && active.canvas.width === 1280 && active.canvas.height === 720 },
  { label: '手机按钮尺寸过小', ok: left.w >= 70 && jump.w >= 100 && drop.w >= 58 },
  { label: '多点移动跳跃失效', ok: multi.snapshot.vx > 0 && multi.snapshot.vy < 0 && multi.pressed.includes('right') && multi.pressed.includes('jump') },
  { label: '方向区滑动换向失效', ok: slide.snapshot.vx < 0 && slide.pressed.includes('left') },
  { label: '触控下穿失效', ok: dropBefore.movement.grounded && dropBefore.movement.standing.includes('recovery-A') && dropAfter.y > dropBefore.y + 5 && dropAfter.movement.dropTimer > 0 },
  { label: '触控暂停失效', ok: touchPause.paused && touchPause.panel },
  { label: '竖屏旋转提示未显示', ok: portrait === 'flex' },
  { label: '桌面触控按钮仍显示', ok: !desktop.capable && !desktop.enabled && desktop.controlsHidden },
  { label: '桌面高清画布不正确', ok: desktop.render.dpr === 1.25 && desktop.canvas[0] === 1600 && desktop.canvas[1] === 900 },
  { label: '手机/桌面运行时有错误', ok: runtimeErrors.length === 0 },
], report);
client.close();
