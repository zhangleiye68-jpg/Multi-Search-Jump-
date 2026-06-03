import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { initCloseLastSearchGroupButton } from "../extension/src/searchSessionUi.js";

function createClassList() {
  const values = new Set();

  return {
    contains(value) {
      return values.has(value);
    },
    toggle(value, enabled) {
      if (enabled) {
        values.add(value);
      } else {
        values.delete(value);
      }
    },
  };
}

function createButtonHarness() {
  let clickHandler = null;

  return {
    disabled: false,
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

function createStorageArea(initialValues = {}) {
  const values = { ...initialValues };

  return {
    values,
    async get(key) {
      return { [key]: values[key] };
    },
    async remove(key) {
      delete values[key];
    },
  };
}

describe("search session UI", () => {
  it("closes the last search group from a settings action button", async () => {
    const closeButton = createButtonHarness();
    const statusMessage = {
      classList: createClassList(),
      textContent: "",
    };
    const calls = [];
    const storageArea = createStorageArea({
      lastSearchSession: {
        groupId: 22,
        tabIds: [41, 42],
        title: "Search: old",
      },
    });
    const tabsApi = {
      async query(options) {
        calls.push(["query", options]);
        return [{ id: 41 }, { id: 42 }];
      },
      async remove(tabIds) {
        calls.push(["remove", tabIds]);
      },
    };

    initCloseLastSearchGroupButton(closeButton, statusMessage, {
      storageArea,
      tabsApi,
    });

    await closeButton.click();

    assert.deepEqual(calls, [
      ["query", { groupId: 22 }],
      ["remove", [41, 42]],
    ]);
    assert.equal(closeButton.disabled, false);
    assert.equal(statusMessage.textContent, "已关闭 2 个上次搜索标签。");
    assert.equal(statusMessage.classList.contains("is-error"), false);
    assert.equal(storageArea.values.lastSearchSession, undefined);
  });

  it("reports when there is no last search group to close", async () => {
    const closeButton = createButtonHarness();
    const statusMessage = {
      classList: createClassList(),
      textContent: "",
    };
    const storageArea = createStorageArea();
    const tabsApi = {
      async query() {
        throw new Error("query should not be called without a saved session");
      },
      async remove() {
        throw new Error("remove should not be called without a saved session");
      },
    };

    initCloseLastSearchGroupButton(closeButton, statusMessage, {
      storageArea,
      tabsApi,
    });

    await closeButton.click();

    assert.equal(closeButton.disabled, false);
    assert.equal(statusMessage.textContent, "没有可关闭的上次搜索结果。");
    assert.equal(statusMessage.classList.contains("is-error"), false);
  });
});
