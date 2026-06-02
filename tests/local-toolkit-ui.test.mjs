import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getLocalToolkitFloatingIconEnabled,
  getLocalToolkitPageUrl,
  initLocalToolkitButton,
  openLocalToolkitPage,
  saveLocalToolkitFloatingIconEnabled,
} from "../extension/src/localToolkitUi.js";

function createButtonHarness() {
  let clickHandler = null;

  return {
    addEventListener(type, handler) {
      if (type === "click") {
        clickHandler = handler;
      }
    },
    async click() {
      await clickHandler?.();
    },
  };
}

describe("local toolkit UI", () => {
  it("builds the local toolkit extension page URL", () => {
    const runtimeApi = {
      getURL(path) {
        return `chrome-extension://abc/${path}`;
      },
    };

    assert.equal(
      getLocalToolkitPageUrl(runtimeApi),
      "chrome-extension://abc/local-toolkit/local-toolkit.html",
    );
  });

  it("opens the local toolkit page from a button", async () => {
    const button = createButtonHarness();
    const createdTabs = [];
    const tabsApi = {
      async create(options) {
        createdTabs.push(options);
      },
    };
    const runtimeApi = {
      getURL(path) {
        return `chrome-extension://abc/${path}`;
      },
    };

    initLocalToolkitButton(button, { runtimeApi, tabsApi });
    await button.click();

    assert.deepEqual(createdTabs, [
      {
        active: true,
        url: "chrome-extension://abc/local-toolkit/local-toolkit.html",
      },
    ]);
  });

  it("opens the same page through the direct helper", async () => {
    const createdTabs = [];
    const tabsApi = {
      async create(options) {
        createdTabs.push(options);
      },
    };
    const runtimeApi = {
      getURL(path) {
        return `chrome-extension://abc/${path}`;
      },
    };

    await openLocalToolkitPage(tabsApi, runtimeApi);

    assert.deepEqual(createdTabs, [
      {
        active: true,
        url: "chrome-extension://abc/local-toolkit/local-toolkit.html",
      },
    ]);
  });

  it("stores the floating toolkit icon switch in the DataTool-compatible key", async () => {
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
