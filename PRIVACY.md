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

这些数据保存在你的浏览器本地。你可以在插件设置页管理或清空搜索历史。

### 可能发送到第三方服务的数据

- 当「将中文翻译成英文后搜索」开启时，中文搜索词可能会发送给 Chrome Translator 或 Google Translate 接口，用于生成英文搜索词。
- 当 TikTok 字幕面板显示中文翻译行时，字幕文本可能会发送给 Google Translate 接口。
- 搜索时，插件会打开你启用的网站搜索结果页；搜索词会作为 URL 查询参数发送给对应网站。

### 不会做的事情

- 不追踪用户。
- 不上传搜索历史到项目服务器。
- 不加载或执行远程 JavaScript。
- 不绕过平台登录、付费或访问限制。

## English

Multi Search Jump primarily runs locally in your browser.

The extension stores settings and search history in `chrome.storage.local`. It may send query text or caption text to translation services only when the related translation options are enabled. Search terms are also sent to the search platforms you enable as URL query parameters.

The extension does not track users, upload search history to a project server, load remote JavaScript, or bypass platform access restrictions.
