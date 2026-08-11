# 参与开发

AI 开发代理还必须先阅读根目录 [`AGENTS.md`](AGENTS.md) 和 [`AI_HANDOFF.md`](AI_HANDOFF.md)。机器可读的当前版本、内容规模和命令位于 [`docs/project-state.json`](docs/project-state.json)。

## 修改前

1. 阅读 `docs/01-游戏设计文档-GDD.md`，确认修改不破坏玩家承诺。
2. 阅读对应技术文档，找到系统的唯一状态所有者。
3. 不直接编辑根目录 `index.html`；它是构建产物。

## 开发流程

```bash
cd source
npm ci
npm test
npm run dev
```

完成修改后：

```bash
npm run release:pages
npm run qa:browser
```

没有 Chrome 的环境至少必须执行 `npm test`、`npm run build` 与 `npm run check:release`。

## 代码规则

- TypeScript strict 模式必须通过。
- 机制计算优先写成纯函数并添加同目录 `.test.ts`。
- 房间实体必须有唯一 `id`。
- 新陷阱必须说明预警、可通关窗口、重置规则和检查点安全性。
- 不新增冲刺、攻击、随机传送门或跳过 Boss 阶段的捷径。
- 不引用受版权保护的角色、音乐、贴图或具体关卡布局。
- 不恢复险过连拍或舞台热度；旧存档字段仅用于兼容读取。
- 根目录 `index.html` 必须由 `npm run release:pages` 生成，禁止手工修补。
- 行为改变时同步更新 `CHANGELOG.md`、`AI_HANDOFF.md`、`docs/project-state.json` 和对应文档。

## 验收清单

- [ ] `npm test` 全部通过。
- [ ] `npm run build` 成功。
- [ ] 1280×720、1440×900、1920×1080 窗口无裁切。
- [ ] 键盘焦点丢失时自动暂停音频与游戏。
- [ ] 重生点不会立即受到伤害。
- [ ] 右方向持续输入不能无伤穿过普通房间。
- [ ] Boss 必须完成攻击波数后才能进入下一阶段。
- [ ] 高清画布为 1.25–1.5 倍，性能无明显回退。
- [ ] `npm run check:release` 确认根页面与源码构建 SHA-256 一致。
- [ ] 变更只推送 `liuzhanrui30-boop/lost-memory-park`，未操作 AMA 组织数据。
- [ ] GitHub Actions 成功，永久链接已显示新构建。
