import { assertAll, connect, sleep } from './cdp-client.mjs';

const port = process.argv[2] ?? '9223';
const url = process.argv[3] ?? 'http://127.0.0.1:4173/?debug=1';
const client = await connect(port);
const { send, evaluate } = client;

await send('Performance.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(800);
await evaluate(`document.querySelectorAll('.screen').forEach(element => element.classList.add('hidden')); document.getElementById('hud').classList.remove('hidden'); window.__lostMemoryParkDebug.startRoom(27); window.__lostMemoryParkDebug.teleport(1820,280); window.__lostMemoryParkDebug.overlay(false)`);
await sleep(500);
const start = await send('Performance.getMetrics');
const runtimeStart = await evaluate('window.__lostMemoryParkDebug.snapshot()');
const frames = await evaluate(`new Promise(resolve => {
  const samples = [];
  let last = performance.now();
  function frame(now) {
    samples.push(now - last);
    last = now;
    if (samples.length >= 240) {
      const sorted = samples.slice(5).sort((a, b) => a - b);
      const average = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
      resolve({ average, p95: sorted[Math.floor(sorted.length * .95)], p99: sorted[Math.floor(sorted.length * .99)], maximum: Math.max(...sorted), fps: 1000 / average });
    } else requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})`);
const end = await send('Performance.getMetrics');
const runtimeEnd = await evaluate('window.__lostMemoryParkDebug.snapshot()');
const asMap = result => Object.fromEntries(result.metrics.map(metric => [metric.name, metric.value]));
const before = asMap(start);
const after = asMap(end);
const report = {
  suite: 'performance',
  ...frames,
  taskMs: (after.TaskDuration - before.TaskDuration) * 1000,
  scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
  layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000,
  styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
  runtime: {
    drawMs: runtimeEnd.render.drawMs,
    updateMs: runtimeEnd.render.updateMs,
    particles: runtimeEnd.render.particles,
    drawSamples: runtimeEnd.render.drawFrames - runtimeStart.render.drawFrames,
    updateSamples: runtimeEnd.render.updates - runtimeStart.render.updates,
  },
};
assertAll([
  { label: '平均帧率低于 55 FPS', ok: report.fps >= 55 },
  { label: 'P99 帧间隔超过 28ms', ok: report.p99 <= 28 },
  { label: 'Canvas 平均绘制超过 6ms', ok: report.runtime.drawMs <= 6 },
  { label: '固定步更新超过 3ms', ok: report.runtime.updateMs <= 3 },
  { label: '粒子数量突破硬上限', ok: report.runtime.particles <= 70 },
], report);
client.close();
