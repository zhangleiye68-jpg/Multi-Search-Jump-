# Chrome Web Store Review Notes

## Single Purpose

Multi Search Jump opens one typed or selected query across the user's enabled search platforms.

## Package

The Chrome extension is isolated in `extension/`. For Chrome Web Store upload, compress the contents of `extension/` so `manifest.json` sits at the root of the uploaded zip. Tests, development scripts, local documentation, and `.DS_Store` stay outside the upload directory.

## Permission Justifications

- `tabs`: opens search result tabs and activates the first result tab.
- `tabGroups`: groups the created search tabs under the searched query.
- `storage`: stores local settings and local search history.
- `sidePanel`: opens the extension's side panel search UI.
- `contextMenus`: adds the selected-text search item.
- `activeTab`: reads the active tab only when the user triggers selected-text search.
- `scripting`: injects a small selected-text reader only after the user triggers selected-text search.
- `https://translate.googleapis.com/`: translation fallback for Chinese-to-English search queries and English-to-Chinese TikTok subtitle display.
- `https://www.tiktok.com/*` content script: shows a page-local subtitle button and reads captions already present on TikTok pages.

## User Data Notes

- Search settings and search history are stored locally in `chrome.storage.local`.
- Search history can be deleted from the settings page.
- Chinese queries may be sent to Google Translate only when the translation switch is enabled.
- TikTok subtitles are read from the current page for temporary display and may be sent to Google Translate to show the Chinese line; they are not stored or added to search history.
- The extension does not load or execute remote JavaScript.

## Store Listing Reminders

- Provide a privacy policy URL in the Chrome Web Store Developer Dashboard.
- Disclose local search history and optional translation query handling in the privacy fields.
- Upload required store assets such as screenshots and promotional images separately in the dashboard.
