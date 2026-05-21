export const SEARCH_TARGETS = Object.freeze([
  Object.freeze({
    id: "google",
    name: "Google",
    buildUrl: (query, settings = {}) => {
      if (settings.googleSearchType === "web") {
        return `https://www.google.com/search?q=${query}`;
      }

      return `https://www.google.com/search?tbm=isch&q=${query}`;
    },
  }),
  Object.freeze({
    id: "x",
    name: "X",
    buildUrl: (query) => `https://x.com/search?q=${query}&src=typed_query`,
  }),
  Object.freeze({
    id: "facebook",
    name: "Facebook",
    buildUrl: (query) => `https://www.facebook.com/search/top/?q=${query}`,
  }),
  Object.freeze({
    id: "tiktok",
    name: "TikTok",
    buildUrl: (query) => `https://www.tiktok.com/search?q=${query}`,
  }),
]);

const TARGETS_BY_ID = new Map(SEARCH_TARGETS.map((target) => [target.id, target]));
const DEFAULT_TARGET_ORDER = SEARCH_TARGETS.map((target) => target.id);

export function normalizeQuery(value) {
  return String(value ?? "").trim();
}

export function getSearchTargetById(id) {
  return TARGETS_BY_ID.get(id) ?? null;
}

export function getOrderedSearchTargets(settings = {}) {
  const targetOrder = Array.isArray(settings.targetOrder)
    ? settings.targetOrder
    : DEFAULT_TARGET_ORDER;
  const orderedIds = [
    ...targetOrder.filter((id) => TARGETS_BY_ID.has(id)),
    ...DEFAULT_TARGET_ORDER.filter((id) => !targetOrder.includes(id)),
  ];
  const enabledIds = new Set(
    Array.isArray(settings.enabledTargetIds)
      ? settings.enabledTargetIds
      : DEFAULT_TARGET_ORDER,
  );

  return orderedIds
    .filter((id) => enabledIds.has(id))
    .map((id) => TARGETS_BY_ID.get(id));
}

export function buildSearchUrls(value, settings = {}) {
  const query = normalizeQuery(value);

  if (!query) {
    return [];
  }

  const encodedQuery = encodeURIComponent(query);
  return getOrderedSearchTargets(settings).map((target) => target.buildUrl(encodedQuery, settings));
}
