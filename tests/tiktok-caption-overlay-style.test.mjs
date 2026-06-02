import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("TikTok caption overlay style", () => {
  it("styles Chinese captions, warning, potential states, and resize affordance", async () => {
    const css = await readFile("extension/src/tiktokCaptionOverlay.css", "utf8");
    const source = await readFile("extension/src/tiktokCaptionCore.js", "utf8");

    assert.match(css, /\.msj-tiktok-caption-translation\s*{[\s\S]*color:\s*#000000/);
    assert.match(css, /\.msj-tiktok-caption-translation\s*{[\s\S]*font-weight:\s*800/);
    assert.match(css, /\.msj-tiktok-language-warning\.is-visible\s*{[\s\S]*color:\s*#d92d20/);
    assert.match(css, /\.msj-tiktok-potential\.is-high\s*{[\s\S]*color:\s*#d92d20/);
    assert.match(css, /\.msj-tiktok-potential\.is-mid\s*{[\s\S]*color:\s*#15803d/);
    assert.match(css, /\.msj-tiktok-potential\.is-low\s*{[\s\S]*color:\s*#6b7280/);
    assert.match(css, /\.msj-tiktok-caption-resize-handle\.is-top\s*{/);
    assert.match(css, /\.msj-tiktok-caption-resize-handle\.is-right\s*{/);
    assert.match(css, /\.msj-tiktok-caption-resize-handle\.is-bottom\s*{/);
    assert.match(css, /\.msj-tiktok-caption-resize-handle\.is-left\s*{/);
    assert.match(css, /\.msj-tiktok-caption-actions\s*{[\s\S]*flex-wrap:\s*wrap/);
    assert.match(source, /⚠ 非英内容/);
    assert.match(source, /tiktokCaptionDisplayMode/);
    assert.match(source, /tiktokCaptionPanelFrame/);
    assert.match(source, /tiktokCaptionButtonPosition/);
  });
});
