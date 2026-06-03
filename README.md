# Multi Search Jump

## 中文

Multi Search Jump 是一个 Chrome/Edge 浏览器扩展。你输入一次关键词，它会按照你启用的网站顺序，同时打开多个搜索结果页，并把这些标签页组织成一组。

这个仓库是完整的产品仓库，不只是插件文件集合。浏览器真正加载的扩展本体只在 `extension/` 目录里；根目录的文档、测试和脚本用于说明、维护和检查。

### 核心功能

- 一次输入，多平台搜索：Google、X、Facebook、TikTok、Instagram、Reddit、小红书、抖音、微博、知乎、哔哩哔哩。
- 新安装默认启用 TikTok、Google 图片、X 和 Facebook，并按这个顺序打开；可在设置页开启更多网站并调整顺序。
- 支持 Google 图片搜索、过去 24 小时结果、中文关键词转英文后搜索。
- 支持插件弹窗、浏览器侧边栏、设置页直接搜索。
- 支持选中文字后右键搜索，或使用 `Alt+1` 快捷键搜索，Mac 默认是 `Option+1`。
- 本地保存搜索历史；历史不去重，可以在设置页管理。
- 在 TikTok 页面显示字幕辅助面板，读取页面中已经存在或页面接口返回的字幕，并可显示中文翻译行。
- 在支持网站页面显示本地下载悬浮图标，用于在本机下载页面可获得的媒体、评论、表格和字幕内容。

### 仓库结构

```text
extension/                 浏览器加载的扩展本体
  manifest.json            Manifest V3 配置
  popup/                   插件弹窗
  side-panel/              浏览器侧边栏
  options/                 设置页
  src/                     扩展运行代码
  assets/icons/            插件图标
  assets/localToolkit/      本地工具所需图片、ffmpeg 和辅助资源
  rules/                    本地工具的网络拦截规则
tests/                     Node 原生测试
scripts/                   结构检查和图标生成脚本
docs/                      使用说明、维护说明、审核说明
.github/workflows/ci.yml   GitHub 自动测试
PRIVACY.md                 隐私和数据说明
CHANGELOG.md               更新记录
```

### 从 GitHub 下载并安装

1. 在 GitHub 仓库页面点击 `Code`。
2. 点击 `Download ZIP` 下载仓库。
3. 解压 ZIP 文件。
4. 打开 Chrome 或 Edge 的扩展管理页：
   - Chrome：`chrome://extensions`
   - Edge：`edge://extensions`
5. 开启「开发者模式」。
6. 点击「加载已解压的扩展程序」。
7. 选择解压后仓库里的 `extension/` 文件夹。
8. 浏览器右上角出现 Multi Search Jump 图标后，安装完成。

不要选择仓库根目录，也不要选择 ZIP 文件本身。浏览器需要加载的是 `extension/` 文件夹，因为 `manifest.json` 在这个目录里。

安装后不要移动或删除这个仓库文件夹。浏览器会持续从 `extension/` 读取插件文件。

### 使用说明

完整中文使用说明见 [docs/USAGE.zh-CN.md](docs/USAGE.zh-CN.md)。

常用流程：

1. 点击浏览器右上角的 Multi Search Jump 图标。
2. 输入关键词。
3. 按 Enter，或点击「搜索」。
4. 插件会打开已启用网站的搜索结果页。

支持下载的网站：

1. 点击浏览器右上角的 Multi Search Jump 图标。
2. 点击右上角的设置按钮。
3. 在「显示」模块的「支持下载的网站」里查看支持列表。
4. 「下载悬浮图标」开关控制支持网站页面上的本地下载入口。

本地下载能力保持本地免费边界：不登录 DataTool、不购买、不上传云端、不恢复云端语音转文字。它只能处理浏览器当前页面和平台接口本身能提供的数据。

### 开发和检查

这个项目不需要构建步骤。修改扩展后，在浏览器扩展管理页点击「刷新」即可重新加载。

本地检查命令：

```bash
npm test
npm run check:store
```

- `npm test` 运行 Node 原生测试。
- `npm run check:store` 检查 `extension/` 是否保持可上传的扩展结构，并避免远程脚本等 Web Store 风险。

GitHub Actions 会在 push 和 pull request 时自动运行这两条检查。

### Chrome Web Store 打包

如果要上传 Chrome Web Store，只压缩 `extension/` 目录里面的内容，并确保压缩包根层能直接看到 `manifest.json`。

不要把 `tests/`、`scripts/`、`docs/`、`README.md`、`.github/` 或 `.DS_Store` 放进 Web Store 上传包。

注意：本地工具套件会新增 `downloads`、`downloads.open`、`cookies`、`unlimitedStorage`、`declarativeNetRequest` 和多个平台 host permissions。这些权限用于本地下载、读取当前浏览器会话下的平台页面数据、保存较大的本地资源，以及阻断 DataTool 云端/付费/上传相关接口；如果上传商店，需要在审核说明里单独解释。

更多审核说明见 [docs/WEB_STORE_REVIEW_NOTES.md](docs/WEB_STORE_REVIEW_NOTES.md)。

### 隐私和授权

隐私说明见 [PRIVACY.md](PRIVACY.md)。

This repository is not currently licensed as open source. Unless a license is added later, the code is visible for review and installation, but copying, modifying, redistributing, or republishing it is not granted by default.

## English

Multi Search Jump is a Chrome/Edge extension that opens one query across the search platforms you enable, then groups the result tabs together.

The browser-loadable extension lives only in `extension/`. The repository root contains documentation, tests, and maintenance tooling for GitHub.

### Features

- Search Google, X, Facebook, TikTok, Instagram, Reddit, Xiaohongshu, Douyin, Weibo, Zhihu, and Bilibili from one query.
- Enable, disable, and reorder search targets from the options page.
- New installs enable TikTok, Google Images, X, and Facebook by default, in that order.
- Use Google web search, Google image search, recent 24-hour results, and optional Chinese-to-English query translation.
- Search from the popup, side panel, options page, selected text context menu, or `Alt+1` (`Option+1` on macOS).
- Keep local search history without deduplication.
- Show a TikTok subtitle helper panel that reads captions already available on the page or returned by page APIs, with optional Chinese translation lines.
- Show a local download floating icon on supported sites for page-available media, comments, tables, and captions.

### Install From GitHub

1. Click `Code` on the GitHub repository page.
2. Choose `Download ZIP`.
3. Unzip the downloaded archive.
4. Open `chrome://extensions` or `edge://extensions`.
5. Enable developer mode.
6. Click `Load unpacked`.
7. Select the unzipped repository's `extension/` folder.

Select `extension/`, not the repository root and not the ZIP file. That folder contains `manifest.json`.

### Development Checks

```bash
npm test
npm run check:store
```

There is no build step. After changing extension files, refresh the extension from the browser extensions page.

Local download support keeps the local-free boundary: no DataTool login, purchase flow, cloud upload, or cloud speech-to-text restoration. It only works with data available to the current browser page/session.

### License

This repository is not currently licensed as open source. Code visibility on GitHub does not grant permission to copy, modify, redistribute, or republish the project unless a license is added later.
