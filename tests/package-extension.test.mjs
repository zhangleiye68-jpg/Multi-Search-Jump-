import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EXTENSION_DISPLAY_NAME,
  EXTENSION_FILES,
  PACKAGE_FILE_NAME,
  readManifest,
  validateStoreManifest,
  validateStoreSources,
} from "../scripts/package-extension.mjs";

describe("Chrome Web Store package", () => {
  it("uses the extension name for the upload zip filename", () => {
    assert.equal(EXTENSION_DISPLAY_NAME, "Multi Search Jump");
    assert.equal(PACKAGE_FILE_NAME, "Multi Search Jump.zip");
  });

  it("keeps the upload package limited to extension runtime files", () => {
    assert.ok(EXTENSION_FILES.includes("manifest.json"));
    assert.ok(EXTENSION_FILES.includes("background.js"));
    assert.ok(EXTENSION_FILES.includes("icons/icon128.png"));
    assert.ok(!EXTENSION_FILES.some((file) => file.startsWith("tests/")));
    assert.ok(!EXTENSION_FILES.some((file) => file.startsWith("scripts/")));
    assert.ok(!EXTENSION_FILES.includes(".DS_Store"));
    assert.ok(!EXTENSION_FILES.includes("package.json"));
  });

  it("includes every manifest-referenced runtime file", async () => {
    const manifest = await readManifest();

    assert.deepEqual(validateStoreManifest(manifest), []);
  });

  it("does not use remote hosted code patterns", async () => {
    assert.deepEqual(await validateStoreSources(), []);
  });
});
