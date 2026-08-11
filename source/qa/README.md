# 浏览器验收脚本

这些脚本是正式源码的一部分，用于验证单元测试覆盖不到的真实浏览器行为：

- `progression-acceptance.mjs`：24 个普通房间、每章六级递进、关内四段、HUD 与已删除系统。
- `mobile-acceptance.mjs`：844×390 手机横屏、多点触控、滑动换向、下穿、暂停、竖屏提示与桌面回切。
- `performance-profile.mjs`：最终高压房间的平均帧率和 P99 帧间隔。

安装依赖后执行：

```bash
cd source
npm ci
npm run qa:browser
```

脚本会自动启动预览服务与无头 Chrome。若没有安装在常见位置，通过环境变量指定：

```bash
CHROME_BIN=/path/to/chrome npm run qa:browser
```

截图输出到 `source/qa-artifacts/`，该目录不会提交到 Git。
