import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTEXT_MENU_ID,
  SEARCH_SELECTED_COMMAND,
  getSelectionFromActiveTab,
  openSearchForText,
  resetSelectionContextMenu,
} from "../selectionSearch.js";
import {
  ENABLED_TARGET_IDS_KEY,
  GOOGLE_SEARCH_TYPE_KEY,
  TARGET_ORDER_KEY,
} from "../searchSettings.js";
import { AUTO_CLOSE_PREVIOUS_KEY } from "../tabLauncher.js";

function createStorageArea(initialValues = {}) {
  const values = { ...initialValues };

  return {
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
        return [{ id: 123 }];
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

  it("opens selected text with saved site order and search settings", async () => {
    const calls = [];
    const storageArea = createStorageArea({
      [AUTO_CLOSE_PREVIOUS_KEY]: false,
      [ENABLED_TARGET_IDS_KEY]: ["facebook", "google"],
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
