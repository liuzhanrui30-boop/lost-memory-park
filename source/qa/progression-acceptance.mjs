import fs from 'node:fs';
import path from 'node:path';
import { assertAll, connect, sleep } from './cdp-client.mjs';

const port = process.argv[2] ?? '9223';
const url = process.argv[3] ?? 'http://127.0.0.1:4173/?debug=1';
const artifacts = process.argv[4] ?? 'qa-artifacts';
const client = await connect(port);
const { send, evaluate, errors } = client;

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url });
await sleep(1000);

const ui = await evaluate(`({
  title: document.title,
  version: document.querySelector('#title-screen .eyebrow')?.textContent,
  progress: document.querySelector('.map-chip span')?.textContent,
  stage: document.querySelector('.take-chip span')?.textContent,
  hasHeat: !!document.querySelector('.heat-chip') || !!document.getElementById('heat-hud'),
  hasCombo: !!document.querySelector('.combo-chip'),
  goal: document.querySelector('#segment-goal')?.textContent
})`);
const save = await evaluate('window.__lostMemoryParkDebug.save()');
const settingKeys = Object.keys(save.settings);

await evaluate(`document.querySelectorAll('.screen').forEach(element => element.classList.add('hidden')); document.getElementById('hud').classList.remove('hidden')`);
const authored = [];
for (let room = 0; room < 30; room += 1) {
  await evaluate(`window.__lostMemoryParkDebug.startRoom(${room})`);
  const snapshot = await evaluate('window.__lostMemoryParkDebug.snapshot()');
  if (snapshot.worldWidth === 3440) {
    authored.push({
      room,
      id: snapshot.id,
      chapter: Math.floor(authored.length / 6) + 1,
      progression: snapshot.progression,
      segments: snapshot.segments,
      sentries: snapshot.devices.sentries,
      pursuit: snapshot.devices.pursuit,
      buttonConflicts: snapshot.safety.buttonConflicts,
      requirements: snapshot.execution.switches.map(lock => lock.requires),
    });
  }
}

fs.mkdirSync(artifacts, { recursive: true });
await evaluate('window.__lostMemoryParkDebug.startRoom(5); window.__lostMemoryParkDebug.teleport(2450,470); window.__lostMemoryParkDebug.overlay(false)');
await sleep(120);
const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
fs.writeFileSync(path.join(artifacts, 'progression.png'), Buffer.from(image.data, 'base64'));
await evaluate('window.__lostMemoryParkDebug.startRoom(24); window.__lostMemoryParkDebug.teleport(940,185); window.__lostMemoryParkDebug.overlay(false)');
await sleep(160);
const buttonImage = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
fs.writeFileSync(path.join(artifacts, 'button-safety.png'), Buffer.from(buttonImage.data, 'base64'));
await evaluate('window.__lostMemoryParkDebug.teleport(1024,196)');
await sleep(120);
const buttonProbe = await evaluate('window.__lostMemoryParkDebug.snapshot()');

const chapters = [1, 2, 3, 4].map(chapter => authored.filter(room => room.chapter === chapter));
const runtimeErrors = errors.filter(error => !String(error.entry?.url ?? '').endsWith('/favicon.ico'));
const report = {
  suite: 'progression',
  ui,
  settingKeys,
  authored: {
    count: authored.length,
    steps: chapters.map(list => list.map(room => room.progression?.step)),
    tiers: chapters.map(list => list.map(room => room.progression?.tier)),
    sentries: chapters.map(list => list.map(room => room.sentries)),
    roles: [...new Set(authored.map(room => JSON.stringify(room.segments.roles)))],
    requirements: [...new Set(authored.flatMap(room => room.requirements))],
    pursuits: authored.filter(room => room.pursuit).length,
  },
  buttonProbe: { room: buttonProbe.id, pressed: buttonProbe.safety.buttons.find(button => button.id === 'button-0')?.pressed, conflicts: buttonProbe.safety.buttonConflicts },
  errors: runtimeErrors,
};

assertAll([
  { label: '页面标题不是递进闯关版', ok: ui.title === '失忆乐园 · 递进闯关版' },
  { label: '页面版本不是 v12.7', ok: ui.version?.includes('v12.7') },
  { label: '本关进度 HUD 缺失', ok: ui.progress === '本关进度' },
  { label: '本关阶段 HUD 缺失', ok: ui.stage === '本关阶段' },
  { label: '舞台热度重新出现', ok: !ui.hasHeat && !settingKeys.includes('heatHud') },
  { label: '险过连拍重新出现', ok: !ui.hasCombo },
  { label: '普通房间数量不是 24', ok: authored.length === 24 },
  { label: '章节不是 1–6 递进', ok: chapters.every(list => list.map(room => room.progression.step).join(',') === '1,2,3,4,5,6') },
  { label: '炮台压力阶梯不正确', ok: chapters.every(list => list.map(room => room.sentries).join(',') === '0,1,1,1,2,2') },
  { label: '关内四段角色不正确', ok: authored.every(room => JSON.stringify(room.segments.roles) === JSON.stringify(['learn', 'practice', 'test', 'finish'])) },
  { label: '章节终局追逐数量不是 4', ok: authored.filter(room => room.pursuit).length === 4 },
  { label: '动作锁仍依赖 combo', ok: !authored.flatMap(room => room.requirements).includes('combo') },
  { label: '仍有按钮与致命障碍重叠', ok: authored.every(room => room.buttonConflicts === 0) },
  { label: '最后的笑脸黄色按钮仍无法触发', ok: buttonProbe.id === 'last-smile' && buttonProbe.safety.buttons.find(button => button.id === 'button-0')?.pressed === true && buttonProbe.safety.buttonConflicts === 0 },
  { label: '页面存在运行时错误', ok: runtimeErrors.length === 0 },
], report);
client.close();
