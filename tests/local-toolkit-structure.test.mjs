import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { describe, it } from "node:test";

const LOCAL_TOOLKIT_FILES = Object.freeze([
  "extension/src/localToolkitDownloadNames.js",
  "extension/src/localToolkitUi.js",
  "extension/src/localToolkit/localToolkitBackground.js",
  "extension/src/localToolkit/localToolkitContent.js",
  "extension/src/localToolkit/localToolkitContent.css",
  "extension/src/localToolkit/localToolkitContentElements.css",
  "extension/src/localToolkit/localToolkitDownloadUiPatch.js",
  "extension/src/localToolkit/localToolkitFreeMode.js",
  "extension/src/localToolkit/localToolkitPageBridge.js",
  "extension/src/localToolkit/localToolkitRelay.js",
  "extension/src/localToolkit/platforms/platformAiChat.js",
  "extension/src/localToolkit/platforms/platformBilibili.js",
  "extension/src/localToolkit/platforms/platformCommon.js",
  "extension/src/localToolkit/platforms/platformDouyin.js",
  "extension/src/localToolkit/platforms/platformFacebook.js",
  "extension/src/localToolkit/platforms/platformInstagram.js",
  "extension/src/localToolkit/platforms/platformKuaishou.js",
  "extension/src/localToolkit/platforms/platformKwai.js",
  "extension/src/localToolkit/platforms/platformSharedButtons.js",
  "extension/src/localToolkit/platforms/platformTaobao.js",
  "extension/src/localToolkit/platforms/platformTikTok.js",
  "extension/src/localToolkit/platforms/platformVimeo.js",
  "extension/src/localToolkit/platforms/platformX.js",
  "extension/src/localToolkit/platforms/platformXiaohongshu.js",
  "extension/src/localToolkit/platforms/platformXinpianchang.js",
  "extension/src/localToolkit/platforms/platformYouTube.js",
  "extension/assets/localToolkit/ffmpeg/814.ffmpeg.js",
  "extension/assets/localToolkit/ffmpeg/ffmpeg-core.js",
  "extension/assets/localToolkit/ffmpeg/ffmpeg-core.wasm",
  "extension/assets/localToolkit/ffmpeg/ffmpeg-worker.js",
  "extension/assets/localToolkit/image/download-green.svg",
  "extension/assets/localToolkit/image/dt.png",
  "extension/assets/localToolkit/image/tiktok.png",
  "extension/rules/localToolkitBackendBlock.json",
]);

const OLD_HASHED_REFERENCES = Object.freeze([
  "popup.588cc70c.js",
  "popup.4b1cbc3c.css",
  "contents.e02f0287.js",
  "contents.4be03896.css",
  "contents.4dd1ecda.css",
  "inject.6070000c.js",
  "datatoolBackgroundTrans.926adca8.js",
  "ttIndex.39a00fb9.js",
  "xhsIndex.6f5c2efb.js",
  "youtubeIndex.e5ae459c.js",
]);

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function flattenManifestContentScriptFiles(manifest) {
  return manifest.content_scripts.flatMap((script) => [
    ...(script.js ?? []),
    ...(script.css ?? []),
  ]);
}

describe("local toolkit structure", () => {
  it("keeps the migrated toolkit in clear Multi Search Jump paths", async () => {
    for (const file of LOCAL_TOOLKIT_FILES) {
      assert.equal(await fileExists(file), true, `${file} should exist`);
    }
  });

  it("declares the local toolkit platform scripts in the manifest", async () => {
    const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
    const manifestFiles = flattenManifestContentScriptFiles(manifest);

    assert.equal(manifest.action.default_popup, "popup/popup.html");
    assert.ok(manifestFiles.includes("src/localToolkit/localToolkitFreeMode.js"));
    assert.ok(manifestFiles.includes("src/localToolkit/localToolkitContent.js"));
    assert.ok(manifestFiles.includes("src/localToolkit/localToolkitDownloadUiPatch.js"));
    assert.ok(manifestFiles.includes("src/localToolkit/localToolkitRelay.js"));
    assert.ok(manifestFiles.includes("src/localToolkit/platforms/platformTikTok.js"));
    assert.ok(manifestFiles.includes("src/localToolkit/platforms/platformXiaohongshu.js"));
    assert.ok(manifestFiles.includes("src/localToolkit/platforms/platformYouTube.js"));
    assert.ok(manifestFiles.includes("src/tiktokCaptionBridge.js"));

    const mainWorldScripts = manifest.content_scripts.filter((script) => script.world === "MAIN");
    assert.ok(
      mainWorldScripts.some((script) => script.js.includes("src/localToolkit/platforms/platformTikTok.js")),
    );
    assert.ok(
      mainWorldScripts.some((script) => script.js.includes("src/tiktokCaptionBridge.js")),
    );
    const mainFreeModeIndex = manifest.content_scripts.findIndex((script) =>
      script.world === "MAIN" &&
      script.run_at === "document_start" &&
      script.js?.includes("src/localToolkit/localToolkitFreeMode.js"),
    );
    const firstMainPlatformIndex = manifest.content_scripts.findIndex((script) =>
      script.world === "MAIN" &&
      script.js?.some((file) => file.startsWith("src/localToolkit/platforms/")),
    );

    assert.ok(mainFreeModeIndex >= 0, "open access mode should run in the main world");
    assert.ok(
      mainFreeModeIndex < firstMainPlatformIndex,
      "open access mode should run before platform toolkit scripts",
    );

    const mainDownloadUiPatchIndex = manifest.content_scripts.findIndex((script) =>
      script.world === "MAIN" &&
      script.run_at === "document_start" &&
      script.js?.includes("src/localToolkit/localToolkitDownloadUiPatch.js"),
    );

    assert.ok(mainDownloadUiPatchIndex >= 0, "download UI patch should run in the main world");
    assert.ok(
      mainFreeModeIndex <= mainDownloadUiPatchIndex && mainDownloadUiPatchIndex < firstMainPlatformIndex,
      "download UI patch should run after open access mode and before platform toolkit scripts",
    );
  });

  it("keeps the local toolkit relay entry focused on message relay only", async () => {
    const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
    const relayEntry = manifest.content_scripts.find((script) =>
      script.js?.includes("src/localToolkit/localToolkitRelay.js"),
    );

    assert.ok(relayEntry, "local toolkit relay entry missing");
    assert.deepEqual(relayEntry.js, ["src/localToolkit/localToolkitRelay.js"]);
  });

  it("keeps the packed local toolkit background out of the core service worker", async () => {
    const source = await readFile("extension/src/background.js", "utf8");

    assert.match(source, /installLocalToolkitDownloadNaming\(chrome\.downloads\)/);
    assert.doesNotMatch(source, /import "\.\/localToolkit\/localToolkitFreeMode\.js";/);
    assert.doesNotMatch(source, /import "\.\/localToolkit\/localToolkitBackground\.js";/);
    assert.doesNotMatch(source, /\bimport\s*\(/);
  });

  it("merges DataTool local permissions and host permissions without changing the default popup", async () => {
    const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));

    assert.equal(manifest.action.default_popup, "popup/popup.html");

    for (const permission of [
      "downloads",
      "downloads.open",
      "unlimitedStorage",
      "cookies",
      "declarativeNetRequest",
    ]) {
      assert.ok(manifest.permissions.includes(permission), `${permission} permission missing`);
    }

    for (const hostPermission of [
      "https://www.tiktok.com/*",
      "https://www.xiaohongshu.com/*",
      "https://www.youtube.com/*",
      "https://www.instagram.com/*",
      "https://www.douyin.com/*",
      "https://www.taobao.com/*",
      "https://*.douyinvod.com/*",
    ]) {
      assert.ok(
        manifest.host_permissions.includes(hostPermission),
        `${hostPermission} host permission missing`,
      );
    }
  });

  it("exposes local toolkit bridge/assets and parses backend blocking rules", async () => {
    const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
    const resources = manifest.web_accessible_resources.flatMap((entry) => entry.resources);

    assert.ok(resources.includes("src/localToolkit/localToolkitFreeMode.js"));
    assert.ok(resources.includes("src/localToolkit/localToolkitPageBridge.js"));
    assert.ok(resources.includes("assets/localToolkit/image/*.png"));
    assert.ok(resources.includes("assets/localToolkit/image/*.svg"));
    assert.ok(resources.includes("assets/localToolkit/ffmpeg/*.wasm"));
    assert.deepEqual(manifest.declarative_net_request.rule_resources, [
      {
        id: "local_toolkit_backend_block",
        enabled: true,
        path: "rules/localToolkitBackendBlock.json",
      },
    ]);

    const rules = JSON.parse(await readFile("extension/rules/localToolkitBackendBlock.json", "utf8"));
    assert.ok(rules.some((rule) => rule.condition.urlFilter === "||api.datatool.vip/"));
    assert.ok(rules.some((rule) => rule.condition.urlFilter === "||dashscope.aliyuncs.com/"));
  });

  it("does not reference old hashed DataTool bundle names in source-controlled entry files", async () => {
    const filesToCheck = [
      "extension/manifest.json",
      "extension/src/background.js",
      "scripts/check-extension-structure.mjs",
    ];

    for (const file of filesToCheck) {
      const source = await readFile(file, "utf8");

      for (const oldName of OLD_HASHED_REFERENCES) {
        assert.doesNotMatch(source, new RegExp(oldName.replaceAll(".", "\\.")), `${file} references ${oldName}`);
      }
    }
  });

  it("keeps visible shell files free of the old DataTool brand", async () => {
    const filesToCheck = [
      "extension/popup/popup.html",
      "extension/options/options.html",
      "extension/side-panel/panel.html",
    ];

    for (const file of filesToCheck) {
      const source = await readFile(file, "utf8");

      assert.doesNotMatch(source, /DataTool|DATATOOL|datatool/, `${file} exposes the old brand`);
    }
  });

  it("does not ship a standalone local toolkit page surface", async () => {
    for (const file of [
      "extension/local-toolkit/local-toolkit.html",
      "extension/local-toolkit/local-toolkit.css",
      "extension/local-toolkit/local-toolkit.js",
      "extension/local-toolkit/local-toolkit-brand.js",
    ]) {
      assert.equal(await fileExists(file), false, `${file} should not be shipped`);
    }
  });

  it("keeps download support information in the unified options page", async () => {
    const html = await readFile("extension/options/options.html", "utf8");

    assert.match(html, /id="settings-download-sites"/);
    assert.match(html, /支持下载的网站/);
    assert.match(html, /下载悬浮图标/);
    assert.doesNotMatch(html, /绿色工具箱/);
    assert.doesNotMatch(html, /打开工具箱/);
  });

  it("removes cloud-only speech-to-text buttons from the local toolkit surface", async () => {
    const css = await readFile("extension/src/localToolkit/localToolkitContentElements.css", "utf8");

    assert.match(css, /\.dt-subtitle-btn\s*{[\s\S]*display:\s*none\s*!important/);
    assert.match(css, /\.dt-subtitle-btn\s*{[\s\S]*visibility:\s*hidden\s*!important/);
  });
});
