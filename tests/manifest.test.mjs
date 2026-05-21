import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("extension manifest", () => {
  it("declares a Manifest V3 action popup with tabs permission", async () => {
    const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.name, "Multi Search Jump");
    assert.equal(manifest.action.default_popup, "popup.html");
    assert.deepEqual(manifest.background, {
      service_worker: "background.js",
      type: "module",
    });
    assert.deepEqual(manifest.permissions, ["tabs", "tabGroups", "storage"]);
  });

  it("references loadable PNG icons", async () => {
    const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
    const pngSignature = "89504e470d0a1a0a";

    for (const iconPath of Object.values(manifest.icons)) {
      const icon = await readFile(iconPath);
      assert.equal(icon.subarray(0, 8).toString("hex"), pngSignature);
    }
  });
});
