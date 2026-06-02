import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("options markup", () => {
  it("contains persistent toggles and target ordering UI", async () => {
    const html = await readFile("extension/options/options.html", "utf8");

    assert.match(html, /class="options-layout"/);
    assert.match(html, /<nav[^>]+class="options-sidebar"/);
    assert.match(
      html,
      /href="#settings-search"[\s\S]*>搜索<[\s\S]*href="#settings-display"[\s\S]*>显示<[\s\S]*href="#settings-shortcuts"[\s\S]*>快捷键<[\s\S]*href="#settings-targets"[\s\S]*>搜索网站<[\s\S]*href="#settings-history"[\s\S]*>历史记录<[\s\S]*href="#settings-guide"[\s\S]*>使用说明</,
    );
    assert.match(
      html,
      /options-nav-index">01<[\s\S]*options-nav-index">02<[\s\S]*options-nav-index">03<[\s\S]*options-nav-index">04<[\s\S]*options-nav-index">05<[\s\S]*options-nav-index">06</,
    );
    assert.match(
      html,
      /module-index">01<[\s\S]*id="settings-search-heading"[\s\S]*module-index">02<[\s\S]*id="settings-display-heading"[\s\S]*module-index">03<[\s\S]*id="settings-shortcuts-heading"[\s\S]*module-index">04<[\s\S]*id="settings-targets-heading"[\s\S]*module-index">05<[\s\S]*id="settings-history-heading"[\s\S]*module-index">06<[\s\S]*id="settings-guide-heading"/,
    );
    assert.match(
      html,
      /subsection-index">1\.1<[\s\S]*id="options-search-heading"[\s\S]*subsection-index">1\.2<[\s\S]*id="search-behavior-heading"[\s\S]*subsection-index">1\.3<[\s\S]*id="google-search-heading"[\s\S]*subsection-index">2\.1<[\s\S]*id="popup-display-heading"[\s\S]*subsection-index">2\.2<[\s\S]*id="side-panel-heading"[\s\S]*subsection-index">2\.3<[\s\S]*id="tiktok-caption-heading"[\s\S]*subsection-index">3\.1<[\s\S]*id="selection-shortcut-heading"[\s\S]*subsection-index">4\.1<[\s\S]*id="target-order-heading"[\s\S]*subsection-index">5\.1<[\s\S]*id="history-management-heading"[\s\S]*subsection-index">6\.1<[\s\S]*id="usage-guide-heading"/,
    );
    assert.match(html, /id="settings-search"/);
    assert.match(html, /id="settings-display"/);
    assert.match(html, /id="settings-shortcuts"/);
    assert.match(html, /id="settings-targets"/);
    assert.match(html, /id="settings-history"/);
    assert.match(html, /id="settings-guide"/);
    assert.match(html, /id="options-search-form"/);
    assert.match(html, /<textarea[^>]+id="options-search-input"/);
    assert.doesNotMatch(html, /<input[^>]+id="options-search-input"/);
    assert.match(html, /id="options-search-button"/);
    assert.match(html, /id="options-search-history"/);
    assert.match(html, /id="options-search-status"/);
    assert.match(html, /id="auto-close-toggle"/);
    assert.match(html, /id="close-last-search-group-button"/);
    assert.match(html, /关闭上次结果/);
    assert.match(html, /id="google-image-toggle"/);
    assert.match(html, /id="google-recent-24h-toggle"/);
    assert.match(html, /过去 24 小时/);
    assert.match(html, /id="translate-chinese-toggle"/);
    assert.match(html, /将中文翻译成英文后搜索/);
    assert.match(html, /id="show-popup-history-toggle"/);
    assert.match(html, /显示历史/);
    assert.match(
      html,
      /<label class="switch-setting" for="side-panel-button">[\s\S]*<input id="side-panel-button" type="checkbox">[\s\S]*class="switch-track"/,
    );
    assert.doesNotMatch(html, /<button id="side-panel-button"/);
    assert.match(html, /侧边栏显示/);
    assert.match(html, /id="tiktok-non-english-warning-toggle"/);
    assert.match(html, /非英语警示/);
    assert.match(html, /非英内容/);
    assert.match(html, /id="local-toolkit-page-button"/);
    assert.match(html, /id="local-toolkit-floating-icon-toggle"/);
    assert.match(html, /工具箱图标/);
    assert.match(html, /绿色工具箱/);
    assert.doesNotMatch(html, />Local Toolkit</);
    assert.doesNotMatch(html, />固定</);
    assert.match(html, /id="shortcut-settings-button"/);
    assert.match(html, /id="target-order-list"/);
    assert.match(html, /历史记录/);
    assert.match(html, /id="history-filter-input"/);
    assert.match(html, /id="clear-history-button"/);
    assert.match(html, /id="history-table-body"/);
    assert.match(html, /id="all-search-history"/);
    assert.match(html, /直接搜索/);
    assert.match(html, /搜索行为/);
    assert.match(html, /Google 搜索类型/);
    assert.match(html, /小窗口/);
    assert.match(html, /侧边栏/);
    assert.match(html, /选中文字搜索/);
    assert.match(html, /网站开关与排序/);
    assert.match(html, /历史管理/);
    assert.match(html, /新安装后，默认只启用 Google 普通网页搜索/);
    assert.match(html, /手动关闭上一次由插件打开的搜索结果标签组/);
    assert.match(html, /小窗口只显示最近 5 条/);
    assert.match(html, /设置页底部会显示全部历史记录/);
    assert.match(html, /浏览器内部页面/);
    assert.match(html, /class="setting-help"/);
    assert.match(html, /data-tooltip="开启后，搜索 B 前会自动关闭搜索 A 的标签组。"/);
    assert.doesNotMatch(html, /<span class="setting-note">开启后，搜索 B 前会自动关闭搜索 A 的标签组。<\/span>/);
    assert.match(html, /<script[^>]+type="module"[^>]+src="options\.js"/);
  });

  it("styles options as a single scrolling page with sidebar navigation", async () => {
    const css = await readFile("extension/options/options.css", "utf8");

    assert.match(css, /\.options-layout\s*{[\s\S]*grid-template-columns: 168px minmax\(0, 1fr\)/);
    assert.match(css, /\.options-sidebar\s*{[\s\S]*position: sticky/);
    assert.match(css, /\.options-nav-index/);
    assert.match(css, /\.module-index/);
    assert.match(css, /\.subsection-index/);
    assert.match(css, /\.settings-subsection\s*{[\s\S]*padding-left: 24px/);
    assert.match(css, /\.settings-subsection > :not\(\.subsection-heading\)\s*{[\s\S]*margin-left: 24px/);
    assert.match(css, /\.subsection-heading\s*{[\s\S]*display: flex/);
    assert.match(css, /\.options-nav-link\.is-active/);
    assert.match(css, /\.settings-module\s*{[\s\S]*scroll-margin-top/);
    assert.match(css, /\.setting-help:hover::after/);
    assert.match(css, /\.setting-help:focus-visible::after/);
    assert.match(css, /\.usage-guide\s*{/);
    assert.match(css, /\.usage-guide-block h4\s*{/);
    assert.match(css, /@media \(max-width: 760px\)/);
  });

  it("renders numbered custom pointer-drag rows with compact switches", async () => {
    const source = await readFile("extension/options/options.js", "utf8");

    assert.match(source, /class="target-index"/);
    assert.match(source, /initSearchUi/);
    assert.match(source, /#options-search-form/);
    assert.match(source, /#options-search-history/);
    assert.match(source, /#options-search-status/);
    assert.match(source, /#translate-chinese-toggle/);
    assert.match(source, /translateChineseToEnglish/);
    assert.match(source, /#google-recent-24h-toggle/);
    assert.match(source, /googleRecent24Hours/);
    assert.match(source, /data-options-nav/);
    assert.match(source, /IntersectionObserver/);
    assert.match(source, /scrollIntoView/);
    assert.match(source, /aria-current/);
    assert.match(source, /is-active/);
    assert.match(source, /#show-popup-history-toggle/);
    assert.match(source, /getShowPopupSearchHistory/);
    assert.match(source, /saveShowPopupSearchHistory/);
    assert.match(source, /#side-panel-button/);
    assert.match(source, /#local-toolkit-page-button/);
    assert.match(source, /#local-toolkit-floating-icon-toggle/);
    assert.match(source, /getLocalToolkitFloatingIconEnabled/);
    assert.match(source, /saveLocalToolkitFloatingIconEnabled/);
    assert.match(source, /#tiktok-non-english-warning-toggle/);
    assert.match(source, /initLocalToolkitButton/);
    assert.match(source, /tiktokCaptionNonEnglishWarningEnabled/);
    assert.match(source, /initPinButton/);
    assert.match(source, /closeOnSuccess: false/);
    assert.match(source, /#all-search-history/);
    assert.match(source, /#history-filter-input/);
    assert.match(source, /#clear-history-button/);
    assert.match(source, /#history-table-body/);
    assert.match(source, /clearSearchHistory/);
    assert.match(source, /getSearchHistory/);
    assert.match(source, /removeSearchHistoryRecord/);
    assert.match(source, /closeOnSuccess: false/);
    assert.match(source, /target-section-row/);
    assert.match(source, /已开启/);
    assert.match(source, /未开启/);
    assert.match(source, /pointerdown/);
    assert.match(source, /pointermove/);
    assert.match(source, /pointerup/);
    assert.match(source, /setPointerCapture/);
    assert.match(source, /requestAnimationFrame/);
    assert.match(source, /dragPreviewRows/);
    assert.match(source, /target-drop-line/);
    assert.match(source, /style\.transform/);
    assert.match(source, /isTargetEnabled/);
    assert.match(source, /normalizeSearchSettings/);
    assert.match(source, /initCloseLastSearchGroupButton/);
    assert.match(source, /#close-last-search-group-button/);
    assert.match(source, /persistToken/);
    assert.match(source, /设置已更新/);
    assert.match(source, /class="target-toggle/);
    assert.match(source, /class="target-toggle-track"/);
    assert.match(source, /class="target-toggle-thumb"/);
    assert.doesNotMatch(source, /draggable="true"/);
    assert.doesNotMatch(source, /dragstart/);
    assert.doesNotMatch(source, /dragover/);
    assert.doesNotMatch(source, /addEventListener\("dragstart"/);
    assert.doesNotMatch(source, /addEventListener\("dragover"/);
    assert.doesNotMatch(source, /addEventListener\("drop"/);
    assert.doesNotMatch(source, /class="move-up"/);
    assert.doesNotMatch(source, /class="move-down"/);
    assert.doesNotMatch(source, /is-drop-before/);
    assert.doesNotMatch(source, /is-drop-after/);
    assert.doesNotMatch(source, /is-drop-target/);
    assert.doesNotMatch(source, /target-toggle-state/);
    assert.doesNotMatch(source, /\? "开" : "关"/);
    assert.doesNotMatch(source, /class="target-enabled"[\s\S]*type="checkbox"/);
  });
});
