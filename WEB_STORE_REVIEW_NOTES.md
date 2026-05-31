# Chrome Web Store Review Notes

## Single Purpose

Multi Search Jump opens one typed or selected query across the user's enabled search platforms.

## Package

Run `npm run package:store` to create `dist/Multi Search Jump.zip`. The upload zip is built from an allowlist of extension runtime files, so tests, development scripts, local documentation, and `.DS_Store` are not included.

## Permission Justifications

- `tabs`: opens search result tabs and activates the first result tab.
- `tabGroups`: groups the created search tabs under the searched query.
- `storage`: stores local settings and local search history.
- `sidePanel`: opens the extension's side panel search UI.
- `contextMenus`: adds the selected-text search item.
- `activeTab`: reads the active tab only when the user triggers selected-text search.
- `scripting`: injects a small selected-text reader only after the user triggers selected-text search.
- `https://translate.googleapis.com/`: optional Chinese-to-English translation fallback; used only when the translation setting is enabled and the query contains Chinese.

## User Data Notes

- Search settings and search history are stored locally in `chrome.storage.local`.
- Search history can be deleted from the settings page.
- Chinese queries may be sent to Google Translate only when the translation switch is enabled.
- The extension does not load or execute remote JavaScript.

## Store Listing Reminders

- Provide a privacy policy URL in the Chrome Web Store Developer Dashboard.
- Disclose local search history and optional translation query handling in the privacy fields.
- Upload required store assets such as screenshots and promotional images separately in the dashboard.
