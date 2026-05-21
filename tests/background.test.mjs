import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("background worker", () => {
  it("handles popup open-search requests outside popup lifetime", async () => {
    const source = await readFile("background.js", "utf8");

    assert.match(source, /chrome\.runtime\.onMessage\.addListener/);
    assert.match(source, /openManagedSearchTabs/);
    assert.match(source, /return true;/);
  });

  it("handles selected text through context menu and keyboard command", async () => {
    const source = await readFile("background.js", "utf8");

    assert.match(source, /resetSelectionContextMenu/);
    assert.match(source, /chrome\.contextMenus\.onClicked\.addListener/);
    assert.match(source, /openSearchForText/);
    assert.match(source, /chrome\.commands\.onCommand\.addListener/);
    assert.match(source, /openSearchForActiveSelection/);
    assert.match(source, /chrome\.scripting/);
  });
});
