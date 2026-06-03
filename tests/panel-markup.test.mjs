import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("side panel markup", () => {
  it("contains the popup-style search form, settings button, and caption board host", async () => {
    const html = await readFile("extension/side-panel/panel.html", "utf8");
    const css = await readFile("extension/side-panel/panel.css", "utf8");

    assert.match(html, /<header[^>]+class="popup-header panel-header"[\s\S]*<\/header>/);
    assert.match(html, /class="popup-title"/);
    assert.match(html, /class="popup-actions"/);
    assert.match(html, /<form[^>]+id="search-form"/);
    assert.match(html, /class="search-input-shell"/);
    assert.match(html, /<textarea[^>]+id="search-input"/);
    assert.doesNotMatch(html, /<input[^>]+id="search-input"/);
    assert.match(html, /<button[^>]+id="search-button"/);
    assert.match(html, /id="search-history"/);
    assert.match(html, /<button[^>]+id="options-button"[^>]+class="header-icon-button"[^>]+aria-label="打开设置"/);
    assert.match(html, /id="caption-board-section"/);
    assert.match(html, /id="caption-board-list"/);
    assert.match(html, /id="caption-board-refresh-button"/);
    assert.match(html, /id="caption-board-copy-button"/);
    assert.match(html, /data-caption-mode="original"/);
    assert.match(html, /data-caption-mode="bilingual"/);
    assert.match(html, /data-caption-mode="chinese"/);
    assert.doesNotMatch(html, /class="ghost-button"/);
    assert.match(html, /<script[^>]+type="module"[^>]+src="panel\.js"/);

    assert.match(css, /@import url\("\.\.\/popup\/popup\.css"\);/);
    assert.match(css, /\.caption-board-section\s*{/);
    assert.match(css, /\.caption-board-list\s*{/);
  });
});
