import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("popup markup", () => {
  it("contains a focused search form and module script", async () => {
    const html = await readFile("popup.html", "utf8");

    assert.match(html, /<form[^>]+id="search-form"/);
    assert.match(html, /<input[^>]+id="search-input"/);
    assert.match(html, /<button[^>]+id="search-button"/);
    assert.match(html, /<input[^>]+id="auto-close-toggle"/);
    assert.match(html, /id="auto-close-state"/);
    assert.match(html, /<script[^>]+type="module"[^>]+src="popup\.js"/);
  });
});
