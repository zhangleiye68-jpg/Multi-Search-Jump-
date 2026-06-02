import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { describe, it } from "node:test";

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("usage guide docs", () => {
  it("keeps Markdown as the only standalone usage guide artifact", async () => {
    assert.equal(await fileExists("Multi Search Jump 插件使用说明.md"), true);
    assert.equal(await fileExists("Multi Search Jump 插件使用说明.html"), false);
  });
});
