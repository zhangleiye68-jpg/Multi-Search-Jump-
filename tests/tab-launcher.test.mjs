import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTO_CLOSE_PREVIOUS_KEY,
  LAST_SEARCH_SESSION_KEY,
  getAutoClosePrevious,
  openManagedSearchTabs,
  closeLastSearchGroup,
  openGroupedSearchTabs,
  setAutoClosePrevious,
} from "../extension/src/tabLauncher.js";

function createStorageArea(initialValues = {}) {
  const values = { ...initialValues };

  return {
    values,
    async get(key) {
      return { [key]: values[key] };
    },
    async set(nextValues) {
      Object.assign(values, nextValues);
    },
    async remove(key) {
      delete values[key];
    },
  };
}

describe("tab launcher", () => {
  it("creates every search tab in a named group before activating the first one", async () => {
    const calls = [];
    const tabsApi = {
      async create(options) {
        const id = calls.length + 101;
        calls.push(["create", options]);
        return { id };
      },
      async group(options) {
        calls.push(["group", options]);
        return 77;
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
    const storageArea = createStorageArea();

    await openGroupedSearchTabs({
      tabsApi,
      tabGroupsApi,
      storageArea,
      urls: ["https://a.example", "https://b.example"],
      title: "Search: ai",
    });

    assert.deepEqual(calls, [
      ["create", { url: "https://a.example", active: false }],
      ["create", { url: "https://b.example", active: false }],
      ["group", { tabIds: [101, 102] }],
      ["updateGroup", 77, { title: "Search: ai", color: "cyan", collapsed: false }],
      ["update", 101, { active: true }],
    ]);
    assert.deepEqual(storageArea.values[LAST_SEARCH_SESSION_KEY], {
      groupId: 77,
      tabIds: [101, 102],
      title: "Search: ai",
    });
  });

  it("does not create a group when there are no URLs to open", async () => {
    const calls = [];
    const tabsApi = {
      async create(options) {
        calls.push(["create", options]);
      },
      async group(options) {
        calls.push(["group", options]);
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
    const storageArea = createStorageArea();

    const result = await openGroupedSearchTabs({
      tabsApi,
      tabGroupsApi,
      storageArea,
      urls: [],
      title: "Search",
    });

    assert.equal(result, null);
    assert.deepEqual(calls, []);
  });

  it("closes the saved search group and clears the saved session", async () => {
    const calls = [];
    const storageArea = createStorageArea({
      [LAST_SEARCH_SESSION_KEY]: {
        groupId: 77,
        tabIds: [101, 102],
        title: "Search: ai",
      },
    });
    const tabsApi = {
      async query(options) {
        calls.push(["query", options]);
        return [{ id: 101 }, { id: 102 }];
      },
      async remove(tabIds) {
        calls.push(["remove", tabIds]);
      },
    };

    const result = await closeLastSearchGroup({ tabsApi, storageArea });

    assert.deepEqual(calls, [
      ["query", { groupId: 77 }],
      ["remove", [101, 102]],
    ]);
    assert.deepEqual(result, { closedCount: 2 });
    assert.equal(storageArea.values[LAST_SEARCH_SESSION_KEY], undefined);
  });

  it("falls back to saved live tab IDs when the group is already gone", async () => {
    const calls = [];
    const storageArea = createStorageArea({
      [LAST_SEARCH_SESSION_KEY]: {
        groupId: 77,
        tabIds: [101, 102],
        title: "Search: ai",
      },
    });
    const tabsApi = {
      async query(options) {
        calls.push(["query", options]);
        return [];
      },
      async get(id) {
        calls.push(["get", id]);

        if (id === 102) {
          throw new Error("No tab");
        }

        return { id };
      },
      async remove(tabIds) {
        calls.push(["remove", tabIds]);
      },
    };

    const result = await closeLastSearchGroup({ tabsApi, storageArea });

    assert.deepEqual(calls, [
      ["query", { groupId: 77 }],
      ["get", 101],
      ["get", 102],
      ["remove", [101]],
    ]);
    assert.deepEqual(result, { closedCount: 1 });
    assert.equal(storageArea.values[LAST_SEARCH_SESSION_KEY], undefined);
  });

  it("defaults to closing the previous search before a new search", async () => {
    const storageArea = createStorageArea();

    assert.equal(await getAutoClosePrevious(storageArea), true);
  });

  it("persists the auto-close preference", async () => {
    const storageArea = createStorageArea();

    await setAutoClosePrevious(storageArea, false);

    assert.equal(storageArea.values[AUTO_CLOSE_PREVIOUS_KEY], false);
    assert.equal(await getAutoClosePrevious(storageArea), false);
  });

  it("opens the new managed search before closing the previous saved group when enabled", async () => {
    const calls = [];
    const storageArea = createStorageArea({
      [LAST_SEARCH_SESSION_KEY]: {
        groupId: 77,
        tabIds: [201, 202],
        title: "Search: old",
      },
    });
    const tabsApi = {
      async query(options) {
        calls.push(["query", options]);
        return [{ id: 201 }, { id: 202 }];
      },
      async remove(tabIds) {
        calls.push(["remove", tabIds]);
      },
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

    await openManagedSearchTabs({
      tabsApi,
      tabGroupsApi,
      storageArea,
      urls: ["https://new.example"],
      title: "Search: new",
      autoClosePrevious: true,
    });

    assert.deepEqual(calls, [
      ["create", { url: "https://new.example", active: false }],
      ["group", { tabIds: [301] }],
      ["updateGroup", 88, { title: "Search: new", color: "cyan", collapsed: false }],
      ["update", 301, { active: true }],
      ["query", { groupId: 77 }],
      ["remove", [201, 202]],
    ]);
    assert.deepEqual(storageArea.values[LAST_SEARCH_SESSION_KEY], {
      groupId: 88,
      tabIds: [301],
      title: "Search: new",
    });
  });

  it("keeps the previous group before opening a new managed search when disabled", async () => {
    const calls = [];
    const storageArea = createStorageArea({
      [LAST_SEARCH_SESSION_KEY]: {
        groupId: 77,
        tabIds: [201, 202],
        title: "Search: old",
      },
    });
    const tabsApi = {
      async query(options) {
        calls.push(["query", options]);
        return [{ id: 201 }, { id: 202 }];
      },
      async remove(tabIds) {
        calls.push(["remove", tabIds]);
      },
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

    await openManagedSearchTabs({
      tabsApi,
      tabGroupsApi,
      storageArea,
      urls: ["https://new.example"],
      title: "Search: new",
      autoClosePrevious: false,
    });

    assert.deepEqual(calls, [
      ["create", { url: "https://new.example", active: false }],
      ["group", { tabIds: [301] }],
      ["updateGroup", 88, { title: "Search: new", color: "cyan", collapsed: false }],
      ["update", 301, { active: true }],
    ]);
  });
});
