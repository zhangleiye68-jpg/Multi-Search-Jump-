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
      /href="#settings-search"[\s\S]*>搜索<[\s\S]*href="#settings-captions"[\s\S]*>字幕<[\s\S]*href="#settings-download"[\s\S]*>下载<[\s\S]*href="#settings-guide"[\s\S]*>使用说明</,
    );
    assert.doesNotMatch(html, /options-nav-index|module-index|subsection-index/);
    assert.match(html, /id="settings-search"/);
    assert.match(html, /id="settings-captions"/);
    assert.match(html, /id="settings-download"/);
    assert.match(html, /id="settings-guide"/);
    assert.doesNotMatch(html, /id="settings-display"/);
    assert.doesNotMatch(html, /id="settings-shortcuts"/);
    assert.doesNotMatch(html, /id="settings-targets"/);
    assert.doesNotMatch(html, /id="settings-history"/);
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
    assert.match(
      html,
      /id="settings-search"[\s\S]*id="options-search-form"[\s\S]*id="auto-close-toggle"[\s\S]*id="target-order-list"[\s\S]*id="show-popup-history-toggle"[\s\S]*id="side-panel-button"[\s\S]*id="shortcut-settings-button"[\s\S]*id="all-search-history"[\s\S]*<\/section>[\s\S]*id="settings-captions"/,
    );
    assert.match(html, /id="show-popup-history-toggle"/);
    assert.match(html, /显示历史/);
    assert.match(
      html,
      /<label class="switch-setting" for="side-panel-button">[\s\S]*<input id="side-panel-button" type="checkbox">[\s\S]*class="switch-track"/,
    );
    assert.doesNotMatch(html, /<button id="side-panel-button"/);
    assert.match(html, /侧边栏显示/);
    assert.match(html, /id="shortcut-settings-button"/);
    assert.match(html, /id="target-order-list"/);
    assert.match(html, /历史记录/);
    assert.match(html, /id="history-filter-input"/);
    assert.match(html, /id="clear-history-button"/);
    assert.match(html, /id="history-table-body"/);
    assert.match(html, /id="all-search-history"/);
    assert.match(
      html,
      /id="settings-captions"[\s\S]*id="tiktok-auto-open-toggle"[\s\S]*id="tiktok-card-metrics-toggle"[\s\S]*id="tiktok-non-english-warning-toggle"[\s\S]*<\/section>[\s\S]*id="settings-download"/,
    );
    assert.match(html, /id="tiktok-auto-open-toggle"/);
    assert.match(html, /自动打开字幕板/);
    assert.match(html, /id="tiktok-card-metrics-toggle"/);
    assert.match(html, /视频列表显示数据指标/);
    assert.match(html, /权重评价、每小时点赞量、总播放量、每小时播放量和发布时长/);
    assert.match(html, /id="tiktok-non-english-warning-toggle"/);
    assert.match(html, /非英语警示/);
    assert.match(html, /非英内容/);
    assert.doesNotMatch(html, /id="local-toolkit-page-button"/);
    assert.match(
      html,
      /id="settings-download"[\s\S]*id="local-toolkit-floating-icon-toggle"[\s\S]*id="settings-download-sites"[\s\S]*<\/section>[\s\S]*id="settings-guide"/,
    );
    assert.match(html, /id="local-toolkit-floating-icon-toggle"/);
    assert.match(html, /下载悬浮图标/);
    assert.match(html, /支持下载的网站/);
    assert.match(html, /TikTok/);
    assert.match(html, /Douyin/);
    assert.match(html, /Instagram/);
    assert.match(html, /X \/ Twitter/);
    assert.match(html, /Facebook/);
    assert.match(html, /Bilibili/);
    assert.match(html, /小红书/);
    assert.match(html, /Kwai/);
    assert.match(html, /快手/);
    assert.match(html, /新片场/);
    assert.match(html, /Vimeo/);
    assert.doesNotMatch(html, /绿色工具箱/);
    assert.doesNotMatch(html, /打开工具箱/);
    assert.doesNotMatch(html, />Local Toolkit</);
    assert.doesNotMatch(html, />固定</);
    assert.match(html, /直接搜索/);
    assert.match(html, /搜索行为/);
    assert.match(html, /Google 搜索类型/);
    assert.match(html, /小窗口/);
    assert.match(html, /侧边栏/);
    assert.match(html, /选中文字搜索/);
    assert.match(html, /搜索网站与顺序/);
    assert.match(html, /历史记录/);
    assert.match(html, /支持的窗口/);
    assert.match(html, /插件小窗口按钮/);
    assert.match(html, /侧边栏按钮/);
    assert.match(html, /设置页按钮和开关/);
    assert.match(html, /TikTok 页面按钮/);
    assert.match(html, /下载页面入口/);
    assert.doesNotMatch(html, /<h3 id="usage-search-heading">常用搜索<\/h3>/);
    assert.doesNotMatch(html, /<h3 id="usage-entry-heading">搜索入口与网站<\/h3>/);
    assert.match(html, /新安装后，默认启用 TikTok、Google 图片、X 和 Facebook/);
    assert.match(html, /手动关闭上一次由插件打开的搜索结果标签组/);
    assert.match(html, /小窗口只显示最近 5 条/);
    assert.match(html, /「搜索」里的「历史记录」会显示全部历史记录/);
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
    assert.doesNotMatch(css, /\.options-nav-index/);
    assert.doesNotMatch(css, /\.module-index/);
    assert.doesNotMatch(css, /\.subsection-index/);
    assert.doesNotMatch(css, /\.settings-subsection/);
    assert.match(css, /\.settings-groups\s*{/);
    assert.match(css, /\.settings-group\s*{/);
    assert.match(css, /\.settings-group-heading\s*{/);
    assert.match(css, /\.guide-module\s*{/);
    assert.match(css, /\.options-nav-link\.is-active/);
    assert.match(css, /\.settings-module\s*{[\s\S]*scroll-margin-top/);
    assert.match(css, /\.setting-help:hover::after/);
    assert.match(css, /\.setting-help:focus-visible::after/);
    assert.match(css, /\.usage-guide\s*{/);
    assert.match(css, /\.usage-guide-block h3\s*{/);
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
    assert.doesNotMatch(source, /#local-toolkit-page-button/);
    assert.match(source, /#local-toolkit-floating-icon-toggle/);
    assert.match(source, /getLocalToolkitFloatingIconEnabled/);
    assert.match(source, /saveLocalToolkitFloatingIconEnabled/);
    assert.match(source, /#tiktok-auto-open-toggle/);
    assert.match(source, /TIKTOK_AUTO_OPEN_KEY/);
    assert.match(source, /tiktokCaptionAutoOpenEnabled/);
    assert.match(source, /#tiktok-card-metrics-toggle/);
    assert.match(source, /TIKTOK_CARD_METRICS_ENABLED_KEY/);
    assert.match(source, /tiktokCardMetricsEnabled/);
    assert.match(source, /#tiktok-non-english-warning-toggle/);
    assert.match(source, /result\[TIKTOK_NON_ENGLISH_WARNING_KEY\] !== false/);
    assert.match(source, /result\[TIKTOK_AUTO_OPEN_KEY\] === true/);
    assert.doesNotMatch(source, /initLocalToolkitButton/);
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
