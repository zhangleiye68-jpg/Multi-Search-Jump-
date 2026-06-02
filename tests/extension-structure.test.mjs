import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EXTENSION_DIR,
  EXTENSION_DISPLAY_NAME,
  EXTENSION_FILES,
  readManifest,
  validateStoreManifest,
  validateStoreSources,
} from "../scripts/check-extension-structure.mjs";

describe("Chrome extension structure", () => {
  it("keeps uploadable extension files under a dedicated extension directory", () => {
    assert.equal(EXTENSION_DIR, "extension");
    assert.equal(EXTENSION_DISPLAY_NAME, "Multi Search Jump");
    assert.ok(EXTENSION_FILES.includes("manifest.json"));
    assert.ok(EXTENSION_FILES.includes("src/background.js"));
    assert.ok(EXTENSION_FILES.includes("src/tiktokCaptionCore.js"));
    assert.ok(EXTENSION_FILES.includes("src/tiktokCaptionContent.js"));
    assert.ok(EXTENSION_FILES.includes("src/tiktokCaptionBridge.js"));
    assert.ok(EXTENSION_FILES.includes("src/tiktokCaptionOverlay.css"));
    assert.ok(EXTENSION_FILES.includes("assets/icons/icon128.png"));
  });

  it("keeps development files out of the extension directory allowlist", () => {
    assert.ok(!EXTENSION_FILES.some((file) => file.startsWith("tests/")));
    assert.ok(!EXTENSION_FILES.some((file) => file.startsWith("scripts/")));
    assert.ok(!EXTENSION_FILES.includes(".DS_Store"));
    assert.ok(!EXTENSION_FILES.includes("package.json"));
    assert.ok(!EXTENSION_FILES.includes("WEB_STORE_REVIEW_NOTES.md"));
  });

  it("includes every manifest-referenced runtime file", async () => {
    const manifest = await readManifest();

    assert.deepEqual(validateStoreManifest(manifest), []);
  });

  it("does not use remote hosted code patterns", async () => {
    assert.deepEqual(await validateStoreSources(), []);
  });
});
