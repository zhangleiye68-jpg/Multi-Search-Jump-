export const SEARCH_TARGETS = Object.freeze([
  Object.freeze({
    name: "Google",
    buildUrl: (query) => `https://www.google.com/search?q=${query}`,
  }),
  Object.freeze({
    name: "X",
    buildUrl: (query) => `https://x.com/search?q=${query}&src=typed_query`,
  }),
  Object.freeze({
    name: "Facebook",
    buildUrl: (query) => `https://www.facebook.com/search/top/?q=${query}`,
  }),
  Object.freeze({
    name: "TikTok",
    buildUrl: (query) => `https://www.tiktok.com/search?q=${query}`,
  }),
]);

export function normalizeQuery(value) {
  return String(value ?? "").trim();
}

export function buildSearchUrls(value) {
  const query = normalizeQuery(value);

  if (!query) {
    return [];
  }

  const encodedQuery = encodeURIComponent(query);
  return SEARCH_TARGETS.map((target) => target.buildUrl(encodedQuery));
}
