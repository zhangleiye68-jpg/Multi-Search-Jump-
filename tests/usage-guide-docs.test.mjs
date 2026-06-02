import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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
  it("keeps repository-facing documentation in GitHub-friendly locations", async () => {
    assert.equal(await fileExists("README.md"), true);
    assert.equal(await fileExists("docs/USAGE.zh-CN.md"), true);
    assert.equal(await fileExists("docs/MAINTAINING.md"), true);
    assert.equal(await fileExists("docs/WEB_STORE_REVIEW_NOTES.md"), true);
    assert.equal(await fileExists("PRIVACY.md"), true);
    assert.equal(await fileExists("CHANGELOG.md"), true);
    assert.equal(await fileExists(".github/workflows/ci.yml"), true);

    assert.equal(await fileExists("Multi Search Jump 插件使用说明.md"), false);
    assert.equal(await fileExists("Multi Search Jump 插件使用说明.html"), false);
  });

  it("describes installation, verification, bilingual usage, and current licensing posture", async () => {
    const readme = await readFile("README.md", "utf8");

    assert.match(readme, /## 中文/);
    assert.match(readme, /## English/);
    assert.match(readme, /extension\//);
    assert.match(readme, /npm test/);
    assert.match(readme, /npm run check:store/);
    assert.match(readme, /not currently licensed as open source/i);
    assert.doesNotMatch(readme, /MIT License/i);
  });
});
