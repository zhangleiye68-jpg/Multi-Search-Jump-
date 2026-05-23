import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SEARCH_HISTORY_KEY,
  addSearchHistoryRecord,
  getRecentSearchHistory,
  getSearchHistory,
  removeSearchHistoryRecord,
} from "../searchHistory.js";

function createStorageArea(initialValues = {}) {
  const values = { ...initialValues };

  return {
    values,
    async get(keys) {
      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(requestedKeys.map((key) => [key, values[key]]));
    },
    async set(nextValues) {
      Object.assign(values, nextValues);
    },
  };
}

describe("search history", () => {
  it("stores every search event while exposing the recent five", async () => {
    const storageArea = createStorageArea();

    for (const query of [
      "alpha",
      "beta",
      "gamma",
      "delta",
      "epsilon",
      "zeta",
      "alpha",
    ]) {
      await addSearchHistoryRecord(storageArea, query);
    }

    assert.equal(storageArea.values[SEARCH_HISTORY_KEY].length, 7);
    assert.deepEqual(
      (await getRecentSearchHistory(storageArea)).map((record) => record.query),
      ["alpha", "zeta", "epsilon", "delta", "gamma"],
    );
  });

  it("keeps repeated queries as separate permanent records", async () => {
    const storageArea = createStorageArea();

    await addSearchHistoryRecord(storageArea, "alpha");
    await addSearchHistoryRecord(storageArea, "beta");
    await addSearchHistoryRecord(storageArea, " alpha ");

    assert.deepEqual(
      (await getSearchHistory(storageArea)).map((record) => record.query),
      ["alpha", "beta", "alpha"],
    );
  });

  it("removes one permanent history record by id", async () => {
    const storageArea = createStorageArea({
      [SEARCH_HISTORY_KEY]: [
        { id: "one", query: "alpha", searchedAt: 3 },
        { id: "two", query: "beta", searchedAt: 2 },
        { id: "three", query: "alpha", searchedAt: 1 },
      ],
    });

    await removeSearchHistoryRecord(storageArea, "one");

    assert.deepEqual(
      storageArea.values[SEARCH_HISTORY_KEY].map((record) => record.query),
      ["beta", "alpha"],
    );
  });

  it("can remove older history records that do not have stored ids", async () => {
    const storageArea = createStorageArea({
      [SEARCH_HISTORY_KEY]: [
        { query: "alpha", searchedAt: 3 },
        { query: "beta", searchedAt: 2 },
      ],
    });

    const [firstRecord] = await getSearchHistory(storageArea);

    await removeSearchHistoryRecord(storageArea, firstRecord.id);

    assert.deepEqual(
      storageArea.values[SEARCH_HISTORY_KEY].map((record) => record.query),
      ["beta"],
    );
  });
});
