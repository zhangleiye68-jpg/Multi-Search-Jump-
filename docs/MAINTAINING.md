# Multi Search Jump 维护说明

这份文档给后续维护仓库的人看。日常原则很简单：`extension/` 是浏览器加载和商店上传的扩展本体，其他目录负责说明、测试和检查。

## 日常修改流程

1. 修改功能代码时，只改 `extension/` 里对应模块。
2. 修改说明时，优先改 `README.md` 和 `docs/USAGE.zh-CN.md`。
3. 如果改动本地工具套件，同步检查 `extension/local-toolkit/`、`extension/src/localToolkit/`、`extension/assets/localToolkit/`、`extension/rules/` 和 `extension/manifest.json`。
4. 运行检查：

```bash
npm test
npm run check:store
```

5. 在 Chrome 或 Edge 扩展管理页刷新插件，手动确认核心流程可用。

## 目录职责

- `extension/`：唯一可加载的扩展目录。Chrome/Edge 加载未打包扩展时选择这个目录。
- `extension/local-toolkit/`：本地工具套件页面入口。
- `extension/src/localToolkit/`：从 DataTool 本地免费版迁移来的本地工具运行脚本和平台脚本。
- `extension/assets/localToolkit/`：本地工具需要的图片、ffmpeg 和辅助资源。
- `extension/rules/`：本地工具使用的 DNR 规则，当前用于阻断 DataTool 云端、付费、上传和云端语音转文字相关接口。
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

本地工具套件会让上传包包含更大的资源文件，并新增 `downloads`、`downloads.open`、`cookies`、`unlimitedStorage`、`declarativeNetRequest` 和多个平台 host permissions。当前第一版优先本地可用，不把 Chrome Web Store 审核优化作为硬约束。

## 本地工具迁移边界

本地工具来自 `/Users/kc/Downloads/datatool-local-free` 的本地免费版打包产物。本仓库采用嵌入打包产物路线，不做平台逻辑源码级重写。

维护时保持这些边界：

- 不恢复 DataTool 登录、购买、会员、云端上传或云端语音转文字。
- 下载命名统一经过 `extension/src/localToolkitDownloadNames.js`。
- 新入口通过 `extension/src/localToolkitUi.js` 打开 `local-toolkit/local-toolkit.html`。
- 如果替换 DataTool bundle，旧 hash 文件名要继续改成清晰命名，并同步 manifest、结构检查和文档。

## 版本记录

功能更新后同步修改：

- `extension/manifest.json` 的 `version`
- `package.json` 的 `version`
- `CHANGELOG.md`
- 必要时更新 `README.md` 和 `docs/USAGE.zh-CN.md`

## 授权状态

当前仓库暂不添加开源 License。公开展示代码不等于授权别人复制、改造或二次发布。若未来决定开源，再新增正式 License 文件并同步更新 README。
