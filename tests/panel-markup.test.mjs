import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("side panel markup", () => {
  it("contains the popup-style search form, settings button, and caption board host", async () => {
    const html = await readFile("extension/side-panel/panel.html", "utf8");
    const css = await readFile("extension/side-panel/panel.css", "utf8");
    const script = await readFile("extension/side-panel/panel.js", "utf8");

    assert.match(html, /class="panel-search-area"/);
    assert.match(html, /<header[^>]+class="popup-header panel-header"[\s\S]*<\/header>/);
    assert.match(html, /class="popup-title"/);
    assert.match(html, /class="popup-actions"/);
    assert.match(html, /<form[^>]+id="search-form"/);
    assert.match(html, /class="search-input-shell"/);
    assert.match(html, /<textarea[^>]+id="search-input"/);
    assert.doesNotMatch(html, /<input[^>]+id="search-input"/);
    assert.match(html, /<button[^>]+id="search-button"/);
    assert.doesNotMatch(html, /id="search-history"/);
    assert.doesNotMatch(html, /class="search-history"/);
    assert.match(html, /<button[^>]+id="options-button"[^>]+class="header-icon-button"[^>]+aria-label="打开设置"/);
    assert.match(html, /class="panel-content"/);
    assert.match(html, /id="caption-board-section"/);
    assert.match(html, /id="caption-board-author-link"/);
    assert.match(html, /id="caption-board-author-avatar"/);
    assert.match(html, /id="caption-board-author-name"/);
    assert.match(html, /id="caption-board-details-copy-button"/);
    assert.match(html, /id="caption-board-list"/);
    assert.match(html, /id="caption-board-refresh-button"/);
    assert.match(html, /id="caption-board-copy-button"/);
    assert.match(html, /id="caption-board-floating-button"/);
    assert.match(
      html,
      /class="caption-board-heading"[\s\S]*id="caption-board-floating-button"[\s\S]*class="caption-board-mode-group"/,
    );
    assert.doesNotMatch(
      html,
      /class="caption-board-actions"[\s\S]*id="caption-board-floating-button"/,
    );
    assert.match(html, /data-caption-mode="original"/);
    assert.match(html, /data-caption-mode="bilingual"/);
    assert.match(html, /data-caption-mode="chinese"/);
    assert.doesNotMatch(html, /class="ghost-button"/);
    assert.match(html, /<script[^>]+type="module"[^>]+src="panel\.js"/);

    assert.match(css, /@import url\("\.\.\/popup\/popup\.css"\);/);
    assert.match(css, /\.panel-shell\s*{[\s\S]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\);/);
    assert.match(css, /\.panel-search-area\s*{[\s\S]*position:\s*sticky;[\s\S]*top:\s*0;/);
    assert.match(css, /\.panel-content\s*{[\s\S]*min-height:\s*0;[\s\S]*overflow:\s*hidden;/);
    assert.match(css, /\.caption-board-section\s*{/);
    assert.match(css, /\.caption-board-section\s*{[\s\S]*grid-template-rows:\s*auto auto auto minmax\(0,\s*auto\) minmax\(calc\(6\.296875em \+ 20px\),\s*1fr\) auto;/);
    assert.match(css, /\.caption-board-author\s*{/);
    assert.match(css, /\.caption-board-details-header\s*{[\s\S]*justify-content:\s*flex-start;/);
    assert.match(css, /\.caption-board-details-copy-button\s*{/);
    assert.match(css, /\.caption-board-details p\s*{[\s\S]*font-size:\s*0\.75em;/);
    assert.match(css, /\.caption-board-list\s*{/);
    assert.match(css, /\.caption-board-list\s*{[\s\S]*min-height:\s*calc\(6\.296875em \+ 20px\)/);
    assert.match(css, /\.caption-board-list p\s*{[\s\S]*font-size:\s*0\.8125em;/);
    assert.doesNotMatch(script, /historyList/);
    assert.match(script, /floatingButton:\s*document\.querySelector\("#caption-board-floating-button"\)/);
    assert.match(script, /authorLink:\s*document\.querySelector\("#caption-board-author-link"\)/);
  });
});
