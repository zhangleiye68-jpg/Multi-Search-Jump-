const CHINESE_CHARACTER_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/u;
const TRANSLATOR_OPTIONS = Object.freeze({
  sourceLanguage: "zh",
  targetLanguage: "en",
});
const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";

function normalizeQueryValue(value) {
  return String(value ?? "").trim();
}

function getDefaultTranslatorApi() {
  return globalThis.Translator ?? null;
}

function getDefaultFetchApi() {
  return globalThis.fetch?.bind(globalThis) ?? null;
}

export function containsChinese(value) {
  return CHINESE_CHARACTER_PATTERN.test(String(value ?? ""));
}

export async function translateChineseQueryToEnglish(
  query,
  translatorApi = getDefaultTranslatorApi(),
) {
  const normalizedQuery = normalizeQueryValue(query);

  if (!normalizedQuery || !translatorApi?.create) {
    return normalizedQuery;
  }

  const translator = await translatorApi.create(TRANSLATOR_OPTIONS);

  try {
    return normalizeQueryValue(await translator.translate(normalizedQuery)) || normalizedQuery;
  } finally {
    translator.destroy?.();
  }
}

export async function translateChineseQueryWithGoogle(
  query,
  fetchApi = getDefaultFetchApi(),
) {
  const normalizedQuery = normalizeQueryValue(query);

  if (!normalizedQuery || !fetchApi) {
    return normalizedQuery;
  }

  const url = new URL(GOOGLE_TRANSLATE_URL);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "zh-CN");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", normalizedQuery);

  const response = await fetchApi(url.toString());

  if (!response?.ok) {
    return normalizedQuery;
  }

  const payload = await response.json();
  const translatedText = Array.isArray(payload?.[0])
    ? payload[0].map((chunk) => chunk?.[0] ?? "").join("")
    : "";

  return normalizeQueryValue(translatedText) || normalizedQuery;
}

export async function translateQueryForSearch(
  query,
  {
    enabled,
    fetchApi = getDefaultFetchApi(),
    translatorApi = getDefaultTranslatorApi(),
  } = {},
) {
  const normalizedQuery = normalizeQueryValue(query);

  if (!enabled || !containsChinese(normalizedQuery)) {
    return normalizedQuery;
  }

  try {
    const chromeTranslation = translatorApi?.create
      ? await translateChineseQueryToEnglish(normalizedQuery, translatorApi)
      : normalizedQuery;

    if (chromeTranslation && chromeTranslation !== normalizedQuery) {
      return chromeTranslation;
    }
  } catch {
    // Fall through to the web translation fallback.
  }

  try {
    return await translateChineseQueryWithGoogle(normalizedQuery, fetchApi);
  } catch {
    return normalizedQuery;
  }
}
