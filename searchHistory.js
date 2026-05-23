import { normalizeQuery } from "./searchTargets.js";

export const SEARCH_HISTORY_KEY = "searchHistory";
export const RECENT_SEARCH_HISTORY_LIMIT = 5;

function createSearchHistoryId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getStoredRecordId(value) {
  if (!value || typeof value !== "object") {
    return "";
  }

  return typeof value.id === "string" ? value.id.trim() : "";
}

function normalizeSearchHistoryRecord(value, index = 0) {
  const query = normalizeQuery(typeof value === "string" ? value : value?.query);
  const searchedAt = Number.isFinite(value?.searchedAt) ? value.searchedAt : 0;

  if (!query) {
    return null;
  }

  return {
    id: getStoredRecordId(value) || `legacy-${index}-${searchedAt}`,
    query,
    searchedAt,
  };
}

export function normalizeSearchHistory(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const records = [];

  for (const [index, valueItem] of value.entries()) {
    const record = normalizeSearchHistoryRecord(valueItem, index);

    if (!record) {
      continue;
    }

    records.push(record);
  }

  return records;
}

export async function getSearchHistory(storageArea) {
  const result = await storageArea.get(SEARCH_HISTORY_KEY);
  return normalizeSearchHistory(result[SEARCH_HISTORY_KEY]);
}

export async function getRecentSearchHistory(
  storageArea,
  limit = RECENT_SEARCH_HISTORY_LIMIT,
) {
  return (await getSearchHistory(storageArea)).slice(0, limit);
}

export async function addSearchHistoryRecord(storageArea, value) {
  const query = normalizeQuery(value);

  if (!query) {
    return getSearchHistory(storageArea);
  }

  const history = await getSearchHistory(storageArea);
  const nextHistory = [
    {
      id: createSearchHistoryId(),
      query,
      searchedAt: Date.now(),
    },
    ...history,
  ];

  await storageArea.set({
    [SEARCH_HISTORY_KEY]: nextHistory,
  });

  return nextHistory;
}

export async function removeSearchHistoryRecord(storageArea, value) {
  const recordKey = typeof value === "string" ? value : "";
  const query = normalizeQuery(value);

  if (!recordKey && !query) {
    return getSearchHistory(storageArea);
  }

  let hasRemoved = false;
  const nextHistory = [];

  for (const record of await getSearchHistory(storageArea)) {
    const shouldRemove =
      !hasRemoved && (record.id === recordKey || record.query === query);

    if (shouldRemove) {
      hasRemoved = true;
      continue;
    }

    nextHistory.push(record);
  }

  await storageArea.set({
    [SEARCH_HISTORY_KEY]: nextHistory,
  });

  return nextHistory;
}
