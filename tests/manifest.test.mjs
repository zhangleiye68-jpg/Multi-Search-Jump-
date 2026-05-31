import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("extension manifest", () => {
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
    assert.deepEqual(manifest.content_scripts, [
      {
        matches: ["https://www.tiktok.com/*"],
        css: ["src/tiktokCaptionOverlay.css"],
        js: ["src/tiktokCaptionCore.js", "src/tiktokCaptionContent.js"],
        run_at: "document_idle",
      },
    ]);
    assert.deepEqual(manifest.permissions, [
      "tabs",
      "tabGroups",
      "storage",
      "sidePanel",
      "contextMenus",
      "activeTab",
      "scripting",
    ]);
    assert.deepEqual(manifest.host_permissions, ["https://translate.googleapis.com/"]);
    assert.deepEqual(manifest.commands["search-selected-text"], {
      suggested_key: {
        default: "Alt+Shift+S",
        mac: "Alt+Shift+S",
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
