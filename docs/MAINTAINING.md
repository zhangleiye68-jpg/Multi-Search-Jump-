# Multi Search Jump 维护说明

这份文档给后续维护仓库的人看。日常原则很简单：`extension/` 是浏览器加载和商店上传的扩展本体，其他目录负责说明、测试和检查。

## 日常修改流程

1. 修改功能代码时，只改 `extension/` 里对应模块。
2. 修改说明时，优先改 `README.md` 和 `docs/USAGE.zh-CN.md`。
3. 运行检查：

```bash
npm test
npm run check:store
```

4. 在 Chrome 或 Edge 扩展管理页刷新插件，手动确认核心流程可用。

## 目录职责

- `extension/`：唯一可加载的扩展目录。Chrome/Edge 加载未打包扩展时选择这个目录。
- `tests/`：Node 原生测试，覆盖 manifest、搜索目标、设置、历史、弹窗、侧边栏、选中文字搜索和 TikTok 字幕逻辑。
- `scripts/check-extension-structure.mjs`：检查扩展目录完整性和 Web Store 相关风险。
- `scripts/generate-icons.mjs`：生成插件图标。
- `docs/`：用户说明、维护说明、Web Store 审核说明。
- `.github/workflows/ci.yml`：GitHub 自动运行测试和结构检查。

## 发布和打包

当前主推安装方式是从 GitHub 下载仓库 ZIP，然后在浏览器中加载解压后的 `extension/` 文件夹。

如果需要上传 Chrome Web Store：

1. 只压缩 `extension/` 目录里的内容。
2. 确认压缩包根层直接包含 `manifest.json`。
3. 不要把 `tests/`、`scripts/`、`docs/`、`.github/`、`README.md` 或 `.DS_Store` 放进上传包。
4. 上传前运行 `npm test` 和 `npm run check:store`。

## 版本记录

功能更新后同步修改：

- `extension/manifest.json` 的 `version`
- `package.json` 的 `version`
- `CHANGELOG.md`
- 必要时更新 `README.md` 和 `docs/USAGE.zh-CN.md`

## 授权状态

当前仓库暂不添加开源 License。公开展示代码不等于授权别人复制、改造或二次发布。若未来决定开源，再新增正式 License 文件并同步更新 README。
