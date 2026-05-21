import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("options markup", () => {
  it("contains persistent toggles and target ordering UI", async () => {
    const html = await readFile("options.html", "utf8");

    assert.match(html, /id="auto-close-toggle"/);
    assert.match(html, /id="google-image-toggle"/);
    assert.match(html, /id="shortcut-settings-button"/);
    assert.match(html, /id="target-order-list"/);
    assert.match(html, /<script[^>]+type="module"[^>]+src="options\.js"/);
  });
});
