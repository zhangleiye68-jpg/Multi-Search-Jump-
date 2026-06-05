import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { describe, it } from "node:test";

const PATCH_FILE = "extension/src/localToolkit/localToolkitDownloadUiPatch.js";
const PATCH_MANIFEST_PATH = "src/localToolkit/localToolkitDownloadUiPatch.js";
const GREEN_DOWNLOAD_ICON_RESOURCE = "assets/localToolkit/image/download-green.svg";
const GREEN_DOWNLOAD_ICON_FILE = `extension/${GREEN_DOWNLOAD_ICON_RESOURCE}`;

async function loadPatchApi() {
  const source = await readFile(PATCH_FILE, "utf8");
  const context = vm.createContext({
    console,
    globalThis: {},
    setTimeout,
    clearTimeout,
  });

  vm.runInContext(source, context, { filename: PATCH_FILE });
  return context.globalThis.__DATATOOL_LOCAL_DOWNLOAD_UI_PATCH__;
}

async function loadFreeModeRoot() {
  const source = await readFile("extension/src/localToolkit/localToolkitFreeMode.js", "utf8");
  const passthroughFetch = async () => new Response(JSON.stringify({ passthrough: true }));
  const context = vm.createContext({
    console,
    Event,
    Response,
    URL,
    setTimeout,
    globalThis: {
      fetch: passthroughFetch,
    },
  });

  vm.runInContext(source, context, { filename: "extension/src/localToolkit/localToolkitFreeMode.js" });
  return context.globalThis;
}

function createFakeStyle() {
  const values = {};
  return {
    values,
    setProperty(name, value) {
      values[name] = value;
    },
  };
}

function createFakeElement({ className = "", src = "" } = {}) {
  const element = {
    children: [],
    parentElement: null,
    attributes: { class: className },
    style: createFakeStyle(),
    nodeType: 1,
    currentSrc: src,
    src,
    ownerDocument: null,
    getAttribute(name) {
      return this.attributes[name] || "";
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
      if (name === "src") this.src = value;
    },
    matches(selector) {
      const currentClass = this.attributes.class || "";
      if (selector.includes(".x-extension") && currentClass.split(/\s+/u).includes("x-extension")) return true;
      if (selector.includes('[class*="download"][class*="button"]')) {
        return /download/u.test(currentClass) && /button/u.test(currentClass);
      }
      if (selector.includes('[class*="download"][class*="btn"]')) {
        return /download/u.test(currentClass) && /btn/u.test(currentClass);
      }
      if (selector.includes(".overview_download_button")) {
        return currentClass.split(/\s+/u).includes("overview_download_button");
      }
      if (selector.includes(".overview_new_download_button")) {
        return currentClass.split(/\s+/u).includes("overview_new_download_button");
      }
      return false;
    },
    querySelectorAll(selector) {
      const results = [];
      const visit = (node) => {
        for (const child of node.children || []) {
          if (selector.includes('img[src*="/assets/localToolkit/image/') && child.src) {
            results.push(child);
          } else if (
            selector.includes('[class*="download"][class*="button"]') ||
            selector.includes('[class*="download"][class*="btn"]') ||
            selector.includes(".overview_download_button") ||
            selector.includes(".overview_new_download_button")
          ) {
            if (child.matches(selector)) results.push(child);
          } else if (selector.includes(".x-extension") && child.matches(selector)) {
            results.push(child);
          }
          visit(child);
        }
      };
      visit(this);
      return results;
    },
  };

  for (const child of element.children) child.parentElement = element;
  return element;
}

function appendFakeChild(parent, child) {
  parent.children.push(child);
  child.parentElement = parent;
  child.ownerDocument = parent.ownerDocument;
  return child;
}

describe("local toolkit download UI patch", () => {
  it("normalizes download quality labels without paid wording", async () => {
    const api = await loadPatchApi();

    assert.equal(api.normalizeLocalToolkitQualityLabel("1920x1080"), "1080P");
    assert.equal(api.normalizeLocalToolkitQualityLabel("1080x1920"), "1080P");
    assert.equal(api.normalizeLocalToolkitQualityLabel("1080p"), "1080P");
    assert.equal(api.normalizeLocalToolkitQualityLabel("720p"), "720P");
    assert.equal(api.normalizeLocalToolkitQualityLabel("4k"), "4K");
    assert.equal(api.normalizeLocalToolkitDownloadText("mp4 (原画) PRO"), "MP4");
    assert.equal(api.normalizeLocalToolkitDownloadText("mp4 (1920x1080)"), "MP4 (1080P)");
  });

  it("uses the approved green theme tokens for download UI", async () => {
    const source = await readFile(PATCH_FILE, "utf8");
    const api = await loadPatchApi();

    assert.equal(api.DOWNLOAD_GREEN_THEME.primary, "#16A34A");
    assert.equal(api.DOWNLOAD_GREEN_THEME.hover, "#15803D");
    assert.equal(api.DOWNLOAD_GREEN_THEME.light, "#DCFCE7");
    assert.equal(api.DOWNLOAD_GREEN_THEME.border, "#BBF7D0");
    assert.equal(api.DOWNLOAD_GREEN_THEME.text, "#166534");
    assert.equal(api.replaceLegacyDownloadColor("color:#3470FF;background:rgb(64, 158, 255)"), "color:#16A34A;background:rgb(22, 163, 74)");
    assert.match(source, /download-green\.svg/);
    assert.match(source, /replaceLocalToolkitFloatingIcon/);
    assert.match(source, /overview_new_download_button/);
    assert.match(source, /overview_download_button/);
    assert.doesNotMatch(source, /#(?:3470ff|3470FF|409EFF|4986F9|7b68ee)/);
  });

  it("uses the requested teal down-arrow ball for replaced floating download icons", async () => {
    const source = await readFile(PATCH_FILE, "utf8");
    const svg = await readFile(GREEN_DOWNLOAD_ICON_FILE, "utf8");

    assert.match(source, /DOWNLOAD_FLOATING_BALL_THEME/u);
    assert.match(source, /box-shadow",\s*"none"/u);
    assert.match(source, /padding",\s*"0"/u);
    assert.match(svg, /<circle[^>]+fill="#3ADDBB"/u);
    assert.match(svg, /stroke="#FFFFFF"/u);
    assert.match(svg, /stroke-linecap="round"/u);
    assert.match(svg, /stroke-linejoin="round"/u);
    assert.doesNotMatch(svg, /linearGradient|<defs|stroke="#BBF7D0"|stroke="#DCFCE7"/u);
    assert.doesNotMatch(svg, /<rect|#000000|M38 91|h52/u);
  });

  it("keeps X dynamic download buttons clickable after replacing their floating icon", async () => {
    const api = await loadPatchApi();
    const root = createFakeElement();
    const surface = appendFakeChild(root, createFakeElement({ className: "x-extension" }));
    const button = appendFakeChild(surface, createFakeElement({ className: "dt-single-download-button" }));
    const image = appendFakeChild(
      button,
      createFakeElement({ src: "chrome-extension://id/assets/localToolkit/image/dt.png" }),
    );

    assert.equal(api.replaceLocalToolkitFloatingIcon(root), true);
    assert.equal(image.getAttribute("src"), "chrome-extension://id/assets/localToolkit/image/download-green.svg");
    assert.equal(button.style.values["box-shadow"], "none");
    assert.equal(button.style.values.padding, "0");
    assert.equal(button.style.values.overflow, "visible");
  });

  it("removes only redundant plain MP4 entries when real quality options exist", async () => {
    const api = await loadPatchApi();

    assert.deepEqual(
      api.filterRedundantPlainMp4DownloadLabels(["MP4", "MP4 (1080P)", "MP4 (720P)", "MP4 (576P)", "MP3", "封面图片"]),
      ["MP4 (1080P)", "MP4 (720P)", "MP4 (576P)", "MP3", "封面图片"],
    );
    assert.deepEqual(api.filterRedundantPlainMp4DownloadLabels(["MP4", "MP3"]), ["MP4", "MP3"]);
    assert.equal(api.isRedundantPlainMp4DownloadLabel("MP4"), true);
    assert.equal(api.isQualityMp4DownloadLabel("MP4 (1080P)"), true);
    assert.equal(api.isQualityMp4DownloadLabel("MP4"), false);
  });

  it("removes unused bulk/comment download entrypoints without replacing their icons", async () => {
    const source = await readFile(PATCH_FILE, "utf8");
    const api = await loadPatchApi();

    assert.equal(api.isUnusedBulkDownloadEntrypointText("Batch Download"), true);
    assert.equal(api.isUnusedBulkDownloadEntrypointText("Comment Download"), true);
    assert.equal(api.isUnusedBulkDownloadEntrypointText("获取评论"), true);
    assert.equal(api.isUnusedBulkDownloadEntrypointText("MP4 (1080P)"), false);
    assert.equal(api.shouldReplaceLegacyDownloadIconSrc("chrome-extension://id/assets/localToolkit/image/tiktok.png", false), false);
    assert.equal(api.shouldReplaceLegacyDownloadIconSrc("chrome-extension://id/assets/localToolkit/image/tiktok.png", true), true);
    assert.equal(api.shouldReplaceLegacyDownloadIconSrc("chrome-extension://id/assets/localToolkit/image/dt.png", false), false);
    assert.match(source, /removeUnusedBulkDownloadEntrypoints/);
    assert.match(source, /tiktok-user-btn-group/);
    assert.match(source, /dy-comment-btn-group/);
    assert.doesNotMatch(source, /isTikTokDownloadIcon/);
  });

  it("injects the download UI patch in both toolkit worlds", async () => {
    const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
    const isolatedToolkitEntry = manifest.content_scripts.find((script) =>
      script.js?.includes("src/localToolkit/localToolkitContent.js"),
    );
    const mainFreeModeEntry = manifest.content_scripts.find((script) =>
      script.world === "MAIN" &&
      script.run_at === "document_start" &&
      script.js?.includes("src/localToolkit/localToolkitFreeMode.js"),
    );

    assert.ok(isolatedToolkitEntry?.js.includes(PATCH_MANIFEST_PATH));
    assert.ok(mainFreeModeEntry?.js.includes(PATCH_MANIFEST_PATH));
    assert.ok(
      isolatedToolkitEntry.js.indexOf("src/localToolkit/localToolkitFreeMode.js") <
        isolatedToolkitEntry.js.indexOf(PATCH_MANIFEST_PATH),
    );
    assert.ok(
      mainFreeModeEntry.js.indexOf("src/localToolkit/localToolkitFreeMode.js") <
        mainFreeModeEntry.js.indexOf(PATCH_MANIFEST_PATH),
    );

    const resources = manifest.web_accessible_resources.flatMap((entry) => entry.resources);
    assert.ok(resources.includes("assets/localToolkit/image/*.svg"));
    assert.ok(resources.includes(GREEN_DOWNLOAD_ICON_RESOURCE) || resources.includes("assets/localToolkit/image/*.svg"));
  });

  it("keeps original video download access open without paid wording", async () => {
    const freeModeSource = await readFile("extension/src/localToolkit/localToolkitFreeMode.js", "utf8");
    const patchSource = await readFile(PATCH_FILE, "utf8");
    const freeModeRoot = await loadFreeModeRoot();
    const originalParse = await freeModeRoot
      .fetch("https://www.datatool.vip/api/video/parse-original-video")
      .then((response) => response.json());

    assert.match(freeModeSource, /parse-original-video/);
    assert.match(freeModeSource, /unlimited:\s*true/);
    assert.equal(originalParse.success, false);
    assert.equal(originalParse.data.localOnly, true);
    assert.equal(originalParse.data.unlimited, true);
    assert.doesNotMatch(JSON.stringify(originalParse), /pricing|donat|paywall/i);
    assert.match(patchSource, /stripLocalToolkitProBadges/);
    assert.match(patchSource, /normalizeLocalToolkitDownloadText/);
    assert.doesNotMatch(patchSource, /\bPRO\b(?! badge)/);
    assert.doesNotMatch(patchSource, /pricing|donation-center/);
  });
});
