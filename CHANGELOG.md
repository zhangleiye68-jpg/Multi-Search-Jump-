# Changelog

## 1.0.0 - 2026-06-06

- Set both the extension manifest version and package version to `1.0.0`.
- Added `INSTALL.zh-CN.md` as an external Markdown installation and usage guide for package handoff.

## 0.2.0 - 2026-06-02

- Embedded the DataTool local-free toolkit as `extension/local-toolkit/` without replacing the existing search popup, side panel, options page, history, or TikTok subtitle behavior.
- Added Local Toolkit bundle paths under `extension/src/localToolkit/`, `extension/assets/localToolkit/`, and `extension/rules/`.
- Added Local Toolkit entry buttons in the popup and options page.
- Added Local Toolkit download filename normalization for browser downloads.
- Added Local Toolkit permissions, host permissions, web accessible resources, and backend blocking DNR rules.
- Added a GitHub-ready repository structure with bilingual README, privacy notes, maintenance notes, and changelog.
- Moved the Chinese usage guide into `docs/USAGE.zh-CN.md`.
- Moved Chrome Web Store review notes into `docs/WEB_STORE_REVIEW_NOTES.md`.
- Added GitHub Actions checks for `npm test` and `npm run check:store`.

## Earlier Work

- Built the Manifest V3 extension with popup search, side panel search, options page settings, grouped search tabs, selected-text search, local history, optional query translation, and TikTok subtitle helper behavior.
