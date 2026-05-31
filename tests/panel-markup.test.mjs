import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("side panel markup", () => {
  it("contains the fixed search form and settings button", async () => {
    const html = await readFile("extension/side-panel/panel.html", "utf8");

    assert.match(html, /<form[^>]+id="search-form"/);
    assert.match(html, /<textarea[^>]+id="search-input"/);
    assert.doesNotMatch(html, /<input[^>]+id="search-input"/);
    assert.match(html, /<button[^>]+id="search-button"/);
    assert.match(html, /id="search-history"/);
    assert.match(html, /<button[^>]+id="options-button"/);
    assert.match(html, /<script[^>]+type="module"[^>]+src="panel\.js"/);
  });
});
