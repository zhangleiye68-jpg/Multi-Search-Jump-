import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { openSearchTabs } from "../tabLauncher.js";

describe("tab launcher", () => {
  it("creates every search tab in the background before activating the first one", async () => {
    const calls = [];
    const tabsApi = {
      async create(options) {
        const id = calls.length + 101;
        calls.push(["create", options]);
        return { id };
      },
      async update(id, options) {
        calls.push(["update", id, options]);
      },
    };

    await openSearchTabs(tabsApi, ["https://a.example", "https://b.example"]);

    assert.deepEqual(calls, [
      ["create", { url: "https://a.example", active: false }],
      ["create", { url: "https://b.example", active: false }],
      ["update", 101, { active: true }],
    ]);
  });

  it("does nothing when there are no URLs to open", async () => {
    const calls = [];
    const tabsApi = {
      async create(options) {
        calls.push(["create", options]);
      },
      async update(id, options) {
        calls.push(["update", id, options]);
      },
    };

    await openSearchTabs(tabsApi, []);

    assert.deepEqual(calls, []);
  });
});
