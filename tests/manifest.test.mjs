import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("extension manifest", () => {
  it("keeps the visible extension and package versions aligned", async () => {
    const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));

    assert.equal(manifest.version, "1.0.0");
    assert.equal(packageJson.version, "1.0.0");
  });

  it("declares a Manifest V3 action popup with tabs permission", async () => {
    const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));

    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.name, "Multi Search Jump");
    assert.equal(manifest.action.default_popup, "popup/popup.html");
    assert.deepEqual(manifest.background, {
      service_worker: "src/background.js",
      type: "module",
    });
    assert.deepEqual(manifest.options_ui, {
      page: "options/options.html",
      open_in_tab: true,
    });
    assert.deepEqual(manifest.side_panel, {
      default_path: "side-panel/panel.html",
    });
    assert.ok(
      manifest.content_scripts.some((script) =>
        script.matches.includes("https://www.tiktok.com/*") &&
        script.css?.includes("src/tiktokCaptionOverlay.css") &&
        script.js.includes("src/tiktokCaptionCore.js") &&
        script.js.includes("src/tiktokCaptionContent.js") &&
        script.run_at === "document_start",
      ),
    );
    assert.ok(
      manifest.content_scripts.some((script) =>
        script.matches.includes("https://www.tiktok.com/*") &&
        script.js.includes("src/tiktokCaptionBridge.js") &&
        script.run_at === "document_start" &&
        script.world === "MAIN",
      ),
    );
    assert.deepEqual(manifest.permissions.slice(0, 7), [
      "tabs",
      "tabGroups",
      "storage",
      "sidePanel",
      "contextMenus",
      "activeTab",
      "scripting",
    ]);
    for (const hostPermission of [
      "https://translate.googleapis.com/",
      "https://*.tiktok.com/*",
      "https://*.tiktokcdn.com/*",
      "https://*.tiktokcdn-us.com/*",
      "https://*.tiktokcdn-eu.com/*",
      "https://*.tiktokv.com/*",
      "https://*.byteoversea.com/*",
      "https://*.byteimg.com/*",
      "https://*.ibyteimg.com/*",
    ]) {
      assert.ok(manifest.host_permissions.includes(hostPermission));
    }
    assert.deepEqual(manifest.commands["search-selected-text"], {
      suggested_key: {
        default: "Alt+1",
        mac: "Option+1",
      },
      description: "Search selected text with Multi Search Jump",
    });
  });

  it("references loadable PNG icons", async () => {
    const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
    const pngSignature = "89504e470d0a1a0a";

    for (const iconPath of Object.values(manifest.icons)) {
      const icon = await readFile(`extension/${iconPath}`);
      assert.equal(icon.subarray(0, 8).toString("hex"), pngSignature);
    }
  });
});
