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
    assert.match(readme, /下载悬浮图标/);
    assert.match(readme, /Local download support/);
    assert.doesNotMatch(readme, /本地工具入口/);
    assert.doesNotMatch(readme, /打开本地工具/);
    assert.doesNotMatch(readme, /Local Toolkit page/);
    assert.match(readme, /TikTok、Google 图片、X 和 Facebook/);
    assert.match(readme, /Alt\+1/);
    assert.match(readme, /Option\+1/);
    assert.doesNotMatch(readme, /默认只启用 Google 普通网页搜索/);
    assert.doesNotMatch(readme, /Alt\+Shift\+S/);
    assert.match(readme, /downloads\.open/);
    assert.match(readme, /npm test/);
    assert.match(readme, /npm run check:store/);
    assert.match(readme, /not currently licensed as open source/i);
    assert.doesNotMatch(readme, /MIT License/i);

    const privacy = await readFile("PRIVACY.md", "utf8");
    assert.match(privacy, /Multi Search Jump Local Toolkit/);
    assert.match(privacy, /declarativeNetRequest/);

    const usageGuide = await readFile("docs/USAGE.zh-CN.md", "utf8");
    assert.match(usageGuide, /默认启用 TikTok、Google 图片、X 和 Facebook/);
    assert.match(usageGuide, /支持下载的网站/);
    assert.match(usageGuide, /下载悬浮图标/);
    assert.match(usageGuide, /Alt\+1/);
    assert.match(usageGuide, /Option\+1/);
    assert.doesNotMatch(usageGuide, /默认只启用 Google 普通网页搜索/);
    assert.doesNotMatch(usageGuide, /Alt\+Shift\+S/);
    assert.doesNotMatch(usageGuide, /打开本地工具/);
  });
});
