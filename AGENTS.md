# AGENTS.md · AI 开发入口

本文件适用于 Codex、Claude Code、Gemini CLI、GitHub Copilot 和其他能够读取仓库的开发代理。

## 1. 开始工作前必须阅读

按顺序阅读：

1. `AI_HANDOFF.md`：当前版本、系统地图、硬约束和交付流程。
2. `README.md`：玩家入口、操作与内容规模。
3. `docs/01-游戏设计文档-GDD.md`：玩家承诺和设计边界。
4. 与任务对应的 `docs/02`–`docs/10` 文档。
5. `CONTRIBUTING.md`：测试和提交要求。

机器可读状态位于 `docs/project-state.json`。

## 2. 唯一源码与生成物

- **唯一源码目录：** `source/`
- **游戏逻辑：** `source/src/`
- **HTML/UI 结构：** `source/index.html`
- **样式与触控布局：** `source/src/style.css`
- **单元测试：** 与实现同目录的 `*.test.ts`
- **浏览器验收：** `source/qa/`
- **公开网页：** 根目录 `index.html`，它是生成物，禁止直接手改。

修改完成后使用 `cd source && npm run release:pages` 重新生成并同步根目录页面。

## 3. 当前不可破坏的产品决定

- 2D 横版 Canvas 视角；固定背景，摄影机只在死区外平滑横移，不做频繁震动。
- 核心操作只有左右移动、双跳、下穿薄板、重开和暂停。
- 不添加冲刺、攻击、记忆锚点、记忆回溯、随机传送门或跳过 Boss 的捷径。
- 不恢复“险过连拍”或“舞台热度”；二者已经删除，不是待办功能。
- 24 个普通房间必须保持每章 6 关：入门、练习、组合、变化、考核、终局。
- 每个普通房间必须保持 4 段：学习、练习、考验、终点。
- 检查点应按段落使用不同轮廓和清晰编号，不能重新统一成同一种外观。
- 障碍可以坑，但必须有可学习的信息、稳定通关窗口和安全重生点。
- 持续向右不能无伤通过普通房间；Boss 必须完成规定攻击波后才可推进。
- 死亡残影不能成为实体障碍；右键只删除点中的一具，Backspace 才全部清除。
- 桌面和手机必须使用同一套关卡；手机横屏保留多点触控和 1280×720 内部画布。
- 不使用其他商业游戏的角色、贴图、音乐、商标或具体地图。

## 4. 修改流程

```bash
git pull --ff-only
cd source
npm ci
npm test
npm run build
```

进行修改时：

1. 先找到系统的唯一状态所有者，不复制第二套状态。
2. 可计算的机制优先拆成纯函数。
3. 每个机制变更同时增加或更新测试。
4. 房间实体 ID 保持唯一；新增危险必须定义预警、窗口、重置和重生安全性。
5. 不直接修改打包后的根 `index.html`。

交付前：

```bash
cd source
npm run release:pages
npm run qa:browser      # 有 Chrome 时执行
git diff --check
git status --short
```

`npm run release:pages` 会执行测试、类型检查、构建、单文件内嵌和发布文件一致性校验。

## 5. 必须同步的文档

行为或范围改变时至少更新：

- `CHANGELOG.md`
- `README.md`
- `AI_HANDOFF.md`
- `docs/project-state.json`
- 对应的设计/技术文档

版本变更时同时更新：

- `source/package.json`
- `source/package-lock.json`
- 游戏首页版本文字
- 文档中的当前版本

## 6. GitHub 与部署规则

- 正式仓库：`https://github.com/liuzhanrui30-boop/lost-memory-park`
- 永久页面：`https://liuzhanrui30-boop.github.io/lost-memory-park/`
- 只更新用户个人仓库 `liuzhanrui30-boop/lost-memory-park`。
- **禁止修改 AMA 组织或其他组织中的任何仓库、设置和数据。**
- 推送 `main` 后，GitHub Actions 会重新测试、构建并自动部署 GitHub Pages。
- 不提交 `node_modules/`、`dist/`、浏览器临时档案、密钥或本机绝对路径。

## 7. 完成定义

只有同时满足以下条件才可宣布完成：

- 测试通过；
- TypeScript 与生产构建通过；
- 根 `index.html` 与源码构建 SHA-256 一致；
- 新行为有测试或浏览器验收证据；
- 当前文档已更新；
- 变更已提交并推送个人仓库；
- GitHub Pages 部署成功且公开网址可打开。
