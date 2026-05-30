import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("options markup", () => {
  it("contains persistent toggles and target ordering UI", async () => {
    const html = await readFile("options.html", "utf8");

    assert.match(html, /id="options-search-form"/);
    assert.match(html, /id="options-search-input"/);
    assert.match(html, /id="options-search-button"/);
    assert.match(html, /id="options-search-history"/);
    assert.match(html, /id="options-search-status"/);
    assert.match(html, /id="auto-close-toggle"/);
    assert.match(html, /id="google-image-toggle"/);
    assert.match(html, /id="translate-chinese-toggle"/);
    assert.match(html, /将中文翻译成英文后搜索/);
    assert.match(html, /id="shortcut-settings-button"/);
    assert.match(html, /id="target-order-list"/);
    assert.match(html, /历史记录/);
    assert.match(html, /id="history-filter-input"/);
    assert.match(html, /id="clear-history-button"/);
    assert.match(html, /id="history-table-body"/);
    assert.match(html, /id="all-search-history"/);
    assert.match(html, /<script[^>]+type="module"[^>]+src="options\.js"/);
  });

  it("renders numbered custom pointer-drag rows with compact switches", async () => {
    const source = await readFile("options.js", "utf8");

    assert.match(source, /class="target-index"/);
    assert.match(source, /initSearchUi/);
    assert.match(source, /#options-search-form/);
    assert.match(source, /#options-search-history/);
    assert.match(source, /#options-search-status/);
    assert.match(source, /#translate-chinese-toggle/);
    assert.match(source, /translateChineseToEnglish/);
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
