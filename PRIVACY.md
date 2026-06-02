# Privacy

## 中文

Multi Search Jump 主要在本地运行，用来打开搜索结果页和辅助管理搜索设置。

### 本地保存的数据

插件会使用 `chrome.storage.local` 保存：

- 搜索网站开关和排序
- Google 搜索类型和过去 24 小时开关
- 是否新搜索前关闭上次结果
- 是否在小窗口显示历史
- 搜索历史记录
- TikTok 字幕面板的位置、大小和显示设置
- 本地工具套件的页面设置、媒体列表、下载配置和临时任务状态

这些数据保存在你的浏览器本地。你可以在插件设置页管理或清空搜索历史。

本地工具下载的文件会保存到你的浏览器下载目录，默认位于 `Multi Search Jump Local Toolkit/` 文件夹下。下载文件、搜索历史和页面数据不会自动写入这个 GitHub 仓库，也不会修改仓库里的代码或文档文件。

### 可能发送到第三方服务的数据

- 当「将中文翻译成英文后搜索」开启时，中文搜索词可能会发送给 Chrome Translator 或 Google Translate 接口，用于生成英文搜索词。
- 当 TikTok 字幕面板显示中文翻译行时，字幕文本可能会发送给 Google Translate 接口。
- 搜索时，插件会打开你启用的网站搜索结果页；搜索词会作为 URL 查询参数发送给对应网站。
- 使用本地工具时，插件会在你当前访问的平台页面中读取页面可获得的数据，并可能调用对应平台本身的接口。可获得的数据取决于当前网页、平台接口和你在浏览器中的登录状态。

### 不会做的事情

- 不追踪用户。
- 不上传搜索历史到项目服务器。
- 不把本地工具下载内容上传到项目服务器。
- 不登录 DataTool，不购买会员，不恢复 DataTool 云端上传或云端语音转文字。
- 不加载或执行远程 JavaScript。
- 不绕过平台登录、付费或访问限制。

### 新增权限说明

本地工具套件会使用 `downloads`、`downloads.open`、`cookies`、`unlimitedStorage` 和 `declarativeNetRequest`。

- `downloads` / `downloads.open`：保存并打开本地下载文件。
- `cookies`：在当前浏览器会话下读取平台页面可访问的数据。
- `unlimitedStorage`：保存较大的本地媒体列表、字幕或任务状态。
- `declarativeNetRequest`：阻断 DataTool 云端、付费、上传和云端语音转文字相关接口，使本地工具保持本地免费边界。

## English

Multi Search Jump primarily runs locally in your browser.

The extension stores settings, search history, and Local Toolkit state in `chrome.storage.local`. Local Toolkit downloads are saved to the browser downloads folder under `Multi Search Jump Local Toolkit/`; they are not written back into this GitHub repository.

It may send query text or caption text to translation services only when the related translation options are enabled. Search terms are also sent to the search platforms you enable as URL query parameters. The Local Toolkit may read data available on the current platform page/session and may call that platform's own page APIs.

The extension does not track users, upload search history or Local Toolkit downloads to a project server, log into DataTool, restore DataTool cloud uploads or cloud speech-to-text, load remote JavaScript, or bypass platform access restrictions.
