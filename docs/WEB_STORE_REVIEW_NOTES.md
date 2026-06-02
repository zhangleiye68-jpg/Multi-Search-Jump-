# Chrome Web Store Review Notes

## Current Scope

Multi Search Jump opens one typed or selected query across the user's enabled search platforms. This version also embeds a Local Toolkit page for locally downloading page-available media, comments, tables, and captions from supported platforms.

## Package

The Chrome extension is isolated in `extension/`. For Chrome Web Store upload, compress the contents of `extension/` so `manifest.json` sits at the root of the uploaded zip. Tests, development scripts, local documentation, and `.DS_Store` stay outside the upload directory.

The Local Toolkit increases the package size because it includes migrated bundle files, images, ffmpeg assets, and DNR rules.

## Permission Justifications

- `tabs`: opens search result tabs and activates the first result tab.
- `tabGroups`: groups the created search tabs under the searched query.
- `storage`: stores local settings and local search history.
- `sidePanel`: opens the extension's side panel search UI.
- `contextMenus`: adds the selected-text search item.
- `activeTab`: reads the active tab only when the user triggers selected-text search.
- `scripting`: injects a small selected-text reader only after the user triggers selected-text search.
- `downloads` / `downloads.open`: saves and opens Local Toolkit downloads.
- `cookies`: lets Local Toolkit work with data available to the current browser session on supported platforms.
- `unlimitedStorage`: stores larger Local Toolkit media lists, captions, and task state locally.
- `declarativeNetRequest`: blocks DataTool backend, paid, cloud upload, and cloud speech-to-text endpoints for local-free mode.
- `https://translate.googleapis.com/`: translation fallback for Chinese-to-English search queries and English-to-Chinese TikTok subtitle display.
- `https://www.tiktok.com/*` content script: shows a page-local subtitle button and reads captions already present on TikTok pages.
- Platform host permissions such as TikTok, Instagram, Xiaohongshu, YouTube, Facebook, Bilibili, Douyin, Taobao/Tmall, X, Vimeo, Kuaishou/Kwai, and AI chat sites: used by Local Toolkit content scripts to read page-available data and render local download controls.

## User Data Notes

- Search settings and search history are stored locally in `chrome.storage.local`.
- Search history can be deleted from the settings page.
- Chinese queries may be sent to Google Translate only when the translation switch is enabled.
- TikTok subtitles are read from the current page for temporary display and may be sent to Google Translate to show the Chinese line; they are not stored or added to search history.
- Local Toolkit state is stored locally. Downloaded files go to the browser downloads folder under `Multi Search Jump Local Toolkit/`.
- Local Toolkit does not log into DataTool, purchase access, upload files to DataTool cloud services, or restore cloud speech-to-text.
- The extension does not load or execute remote JavaScript.

## Review Risk

This version is not optimized for Chrome Web Store review. The Local Toolkit adds broad platform coverage, larger bundled assets, and powerful permissions. If store approval becomes the priority, prepare a narrower build or a detailed reviewer explanation for every host permission and content script.

## Store Listing Reminders

- Provide a privacy policy URL in the Chrome Web Store Developer Dashboard.
- Disclose local search history, optional translation query handling, Local Toolkit downloads, cookies, large local storage, DNR blocking, and platform page-data handling in the privacy fields.
- Upload required store assets such as screenshots and promotional images separately in the dashboard.
