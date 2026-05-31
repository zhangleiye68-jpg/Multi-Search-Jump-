import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("popup markup", () => {
  it("contains a focused search form and module script", async () => {
    const html = await readFile("extension/popup/popup.html", "utf8");

    assert.match(html, /<form[^>]+id="search-form"/);
    assert.match(html, /<textarea[^>]+id="search-input"/);
    assert.doesNotMatch(html, /<input[^>]+id="search-input"/);
    assert.match(html, /<button[^>]+id="search-button"/);
    assert.match(html, /<header[^>]+class="popup-header"[\s\S]*id="options-button"[\s\S]*<\/header>/);
    assert.doesNotMatch(html, /<div[^>]+class="search-input-shell"[\s\S]*id="options-button"[\s\S]*<\/div>/);
    assert.match(html, /<button[^>]+id="options-button"[^>]+aria-label="打开设置"/);
    assert.match(html, /⚙/);
    assert.doesNotMatch(html, /id="show-history-toggle"/);
    assert.doesNotMatch(html, /显示历史/);
    assert.doesNotMatch(html, /id="pin-panel-button"/);
    assert.doesNotMatch(html, />固定</);
    assert.doesNotMatch(html, />设置</);
    assert.match(html, /id="search-history"/);
    assert.doesNotMatch(html, /auto-close-toggle/);
    assert.doesNotMatch(html, /target-list/);
    assert.match(html, /<script[^>]+type="module"[^>]+src="popup\.js"/);
  });

  it("delegates browser actions through the shared search UI", async () => {
    const popupScript = await readFile("extension/popup/popup.js", "utf8");
    const sharedScript = await readFile("extension/src/searchUi.js", "utf8");

    assert.match(popupScript, /initSearchUi/);
    assert.match(popupScript, /#search-history/);
    assert.match(popupScript, /useHistoryVisibilityPreference: true/);
    assert.doesNotMatch(popupScript, /#show-history-toggle/);
    assert.doesNotMatch(popupScript, /initPinButton/);
    assert.match(sharedScript, /chrome\.runtime\.sendMessage/);
    assert.match(sharedScript, /chrome\.runtime\.openOptionsPage/);
    assert.match(sharedScript, /chrome\.sidePanel\.open/);
    assert.doesNotMatch(sharedScript, /chrome\.tabs/);
    assert.doesNotMatch(sharedScript, /chrome\.tabGroups/);
  });

  it("styles the settings button as a header action", async () => {
    const css = await readFile("extension/popup/popup.css", "utf8");
    const settingsButtonRule = css.match(/\.settings-icon-button\s*{(?<body>[\s\S]*?)}/);

    assert.match(css, /\.popup-header\s*{[\s\S]*justify-content: space-between/);
    assert.ok(settingsButtonRule?.groups?.body);
    assert.doesNotMatch(settingsButtonRule.groups.body, /position: absolute/);
    assert.match(css, /\.settings-icon-button\s*{[\s\S]*width: 32px/);
    assert.doesNotMatch(css, /padding: 9px 42px 9px 11px/);
  });
});
