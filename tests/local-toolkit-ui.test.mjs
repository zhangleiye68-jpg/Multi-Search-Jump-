import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getLocalToolkitFloatingIconEnabled,
  saveLocalToolkitFloatingIconEnabled,
} from "../extension/src/localToolkitUi.js";

describe("local toolkit UI", () => {
  it("stores the download floating icon switch in the DataTool-compatible key", async () => {
    const values = {};
    const storageArea = {
      async get(key) {
        return { [key]: values[key] };
      },
      async set(nextValues) {
        Object.assign(values, nextValues);
      },
    };

    assert.equal(await getLocalToolkitFloatingIconEnabled(storageArea), true);

    assert.equal(await saveLocalToolkitFloatingIconEnabled(storageArea, false), false);
    assert.deepEqual(values, { dt_show_floating_icon: 0 });
    assert.equal(await getLocalToolkitFloatingIconEnabled(storageArea), false);

    assert.equal(await saveLocalToolkitFloatingIconEnabled(storageArea, true), true);
    assert.deepEqual(values, { dt_show_floating_icon: 1 });
  });
});
