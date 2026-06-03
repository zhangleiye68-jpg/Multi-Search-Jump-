import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTEXT_MENU_ID,
  SEARCH_SELECTED_COMMAND,
  getSelectionFromActiveTab,
  openSearchForText,
  resetSelectionContextMenu,
} from "../extension/src/selectionSearch.js";
import {
  ENABLED_TARGET_IDS_KEY,
  GOOGLE_RECENT_24H_KEY,
  GOOGLE_SEARCH_TYPE_KEY,
  TARGET_ORDER_KEY,
  TRANSLATE_CHINESE_TO_ENGLISH_KEY,
} from "../extension/src/searchSettings.js";
import { SEARCH_HISTORY_KEY } from "../extension/src/searchHistory.js";
import { AUTO_CLOSE_PREVIOUS_KEY } from "../extension/src/tabLauncher.js";

function createStorageArea(initialValues = {}) {
  const values = { ...initialValues };

  return {
    values,
    async get(keys) {
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, values[key]]));
      }

      return { [keys]: values[keys] };
    },
    async set(nextValues) {
      Object.assign(values, nextValues);
    },
  };
}

describe("selection search", () => {
  it("creates the selection context menu item", async () => {
    const calls = [];
    const contextMenusApi = {
      async removeAll() {
        calls.push(["removeAll"]);
      },
      create(options) {
        calls.push(["create", options]);
      },
    };

    await resetSelectionContextMenu(contextMenusApi);

    assert.deepEqual(calls, [
      ["removeAll"],
      [
        "create",
        {
          contexts: ["selection"],
          id: CONTEXT_MENU_ID,
          title: "用 Multi Search Jump 搜索 “%s”",
        },
      ],
    ]);
  });

  it("reads selected text from the active tab for the shortcut command", async () => {
    const tabsApi = {
      async query(options) {
        assert.deepEqual(options, { active: true, currentWindow: true });
        return [{ id: 123, url: "https://example.com/" }];
      },
    };
    const scriptingApi = {
      async executeScript(options) {
        assert.equal(options.target.tabId, 123);
        return [{ result: "  maga  " }];
      },
    };

    assert.equal(await getSelectionFromActiveTab({ scriptingApi, tabsApi }), "maga");
  });

  it("skips shortcut selection reading on Chrome internal pages", async () => {
    const tabsApi = {
      async query() {
        return [{ id: 123, url: "chrome://extensions/shortcuts" }];
      },
    };
    const scriptingApi = {
      async executeScript() {
        assert.fail("should not inject scripts into Chrome internal pages");
      },
    };

    assert.equal(await getSelectionFromActiveTab({ scriptingApi, tabsApi }), "");
  });

  it("skips shortcut selection reading when Chrome does not expose the active tab URL", async () => {
    const tabsApi = {
      async query() {
        return [{ id: 123 }];
      },
    };
    const scriptingApi = {
      async executeScript() {
        assert.fail("should not inject scripts without a scriptable tab URL");
      },
    };

    assert.equal(await getSelectionFromActiveTab({ scriptingApi, tabsApi }), "");
  });

  it("silently ignores blocked selection injection on Chrome internal pages", async () => {
    const tabsApi = {
      async query() {
        return [{ id: 123, url: "https://example.com/" }];
      },
    };
    const scriptingApi = {
      async executeScript() {
        throw new Error("Cannot access a chrome:// URL");
      },
    };

    assert.equal(await getSelectionFromActiveTab({ scriptingApi, tabsApi }), "");
  });

  it("opens selected text with saved site order and search settings", async () => {
    const calls = [];
    const storageArea = createStorageArea({
      [AUTO_CLOSE_PREVIOUS_KEY]: false,
      [ENABLED_TARGET_IDS_KEY]: ["facebook", "google"],
      [GOOGLE_RECENT_24H_KEY]: false,
      [GOOGLE_SEARCH_TYPE_KEY]: "web",
      [TARGET_ORDER_KEY]: ["facebook", "google", "x", "tiktok"],
    });
    const tabsApi = {
      async create(options) {
        const id = 301 + calls.filter(([type]) => type === "create").length;
        calls.push(["create", options]);
        return { id };
      },
      async group(options) {
        calls.push(["group", options]);
        return 88;
      },
      async update(id, options) {
        calls.push(["update", id, options]);
      },
    };
    const tabGroupsApi = {
      async update(id, options) {
        calls.push(["updateGroup", id, options]);
      },
    };

    const result = await openSearchForText({
      query: "maga",
      storageArea,
      tabGroupsApi,
      tabsApi,
    });

    assert.deepEqual(result, {
      count: 2,
      opened: true,
      title: "Search: maga",
    });
    assert.deepEqual(calls, [
      ["create", { url: "https://www.facebook.com/search/top/?q=maga", active: false }],
      ["create", { url: "https://www.google.com/search?q=maga", active: false }],
      ["group", { tabIds: [301, 302] }],
      ["updateGroup", 88, { title: "Search: maga", color: "cyan", collapsed: false }],
      ["update", 301, { active: true }],
    ]);
    assert.equal(storageArea.values[SEARCH_HISTORY_KEY][0].query, "maga");
  });

  it("uses the translated query for selected Chinese text when enabled", async () => {
    const calls = [];
    const storageArea = createStorageArea({
      [ENABLED_TARGET_IDS_KEY]: ["google"],
      [GOOGLE_RECENT_24H_KEY]: false,
      [GOOGLE_SEARCH_TYPE_KEY]: "web",
      [TRANSLATE_CHINESE_TO_ENGLISH_KEY]: true,
    });
    const tabsApi = {
      async create(options) {
        calls.push(["create", options]);
        return { id: 301 };
      },
      async group(options) {
        calls.push(["group", options]);
        return 88;
      },
      async update(id, options) {
        calls.push(["update", id, options]);
      },
    };
    const tabGroupsApi = {
      async update(id, options) {
        calls.push(["updateGroup", id, options]);
      },
    };

    const result = await openSearchForText({
      query: "红色连衣裙",
      storageArea,
      tabGroupsApi,
      tabsApi,
      translateQuery: async () => "red dress",
    });

    assert.deepEqual(result, {
      count: 1,
      opened: true,
      title: "Search: red dress",
    });
    assert.deepEqual(calls[0], [
      "create",
      { url: "https://www.google.com/search?q=red%20dress", active: false },
    ]);
    assert.equal(storageArea.values[SEARCH_HISTORY_KEY][0].query, "red dress");
  });

  it("uses the default web translation fallback for selected Chinese text", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async () => ({
      ok: true,
      async json() {
        return [[[ "red dress", "红色连衣裙" ]]];
      },
    });

    try {
      const storageArea = createStorageArea({
        [ENABLED_TARGET_IDS_KEY]: ["google"],
        [GOOGLE_RECENT_24H_KEY]: false,
        [GOOGLE_SEARCH_TYPE_KEY]: "web",
        [TRANSLATE_CHINESE_TO_ENGLISH_KEY]: true,
      });
      const tabsApi = {
        async create(options) {
          calls.push(["create", options]);
          return { id: 301 };
        },
        async group() {
          return 88;
        },
        async update() {},
      };
      const tabGroupsApi = {
        async update() {},
      };

      await openSearchForText({
        query: "红色连衣裙",
        storageArea,
        tabGroupsApi,
        tabsApi,
      });

      assert.deepEqual(calls[0], [
        "create",
        { url: "https://www.google.com/search?q=red%20dress", active: false },
      ]);
      assert.equal(storageArea.values[SEARCH_HISTORY_KEY][0].query, "red dress");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("falls back to selected Chinese text when translation fails", async () => {
    const calls = [];
    const storageArea = createStorageArea({
      [ENABLED_TARGET_IDS_KEY]: ["google"],
      [GOOGLE_RECENT_24H_KEY]: false,
      [GOOGLE_SEARCH_TYPE_KEY]: "web",
      [TRANSLATE_CHINESE_TO_ENGLISH_KEY]: true,
    });
    const tabsApi = {
      async create(options) {
        calls.push(["create", options]);
        return { id: 301 };
      },
      async group() {
        return 88;
      },
      async update() {},
    };
    const tabGroupsApi = {
      async update() {},
    };

    await openSearchForText({
      query: "红色连衣裙",
      storageArea,
      tabGroupsApi,
      tabsApi,
      translateQuery: async () => {
        throw new Error("translation failed");
      },
    });

    assert.deepEqual(calls[0], [
      "create",
      { url: "https://www.google.com/search?q=%E7%BA%A2%E8%89%B2%E8%BF%9E%E8%A1%A3%E8%A3%99", active: false },
    ]);
    assert.equal(storageArea.values[SEARCH_HISTORY_KEY][0].query, "红色连衣裙");
  });

  it("ignores blank selected text", async () => {
    const result = await openSearchForText({
      query: "   ",
      storageArea: createStorageArea(),
      tabGroupsApi: {},
      tabsApi: {},
    });

    assert.deepEqual(result, {
      opened: false,
      reason: "empty-selection",
    });
  });

  it("exports the shortcut command name used by the manifest", () => {
    assert.equal(SEARCH_SELECTED_COMMAND, "search-selected-text");
  });
});
