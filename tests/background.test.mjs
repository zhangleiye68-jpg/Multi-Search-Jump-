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
});
