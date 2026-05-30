import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("popup markup", () => {
  it("contains a focused search form and module script", async () => {
    const html = await readFile("popup.html", "utf8");

    assert.match(html, /<form[^>]+id="search-form"/);
    assert.match(html, /<input[^>]+id="search-input"/);
    assert.match(html, /<button[^>]+id="search-button"/);
    assert.match(html, /id="show-history-toggle"/);
    assert.match(html, /显示历史/);
    assert.match(html, /id="search-history"/);
    assert.match(html, /<button[^>]+id="pin-panel-button"/);
    assert.match(html, /<button[^>]+id="options-button"/);
    assert.doesNotMatch(html, /auto-close-toggle/);
    assert.doesNotMatch(html, /target-list/);
    assert.match(html, /<script[^>]+type="module"[^>]+src="popup\.js"/);
  });

  it("delegates browser actions through the shared search UI", async () => {
    const popupScript = await readFile("popup.js", "utf8");
    const sharedScript = await readFile("searchUi.js", "utf8");

    assert.match(popupScript, /initSearchUi/);
    assert.match(popupScript, /#search-history/);
    assert.match(popupScript, /#show-history-toggle/);
    assert.match(popupScript, /initPinButton/);
    assert.match(sharedScript, /chrome\.runtime\.sendMessage/);
    assert.match(sharedScript, /chrome\.runtime\.openOptionsPage/);
    assert.match(sharedScript, /chrome\.sidePanel\.open/);
    assert.doesNotMatch(sharedScript, /chrome\.tabs/);
    assert.doesNotMatch(sharedScript, /chrome\.tabGroups/);
  });
});
