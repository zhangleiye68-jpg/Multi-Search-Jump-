const CHINESE_CHARACTER_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/u;
const TRANSLATOR_OPTIONS = Object.freeze({
  sourceLanguage: "zh",
  targetLanguage: "en",
});

function normalizeQueryValue(value) {
  return String(value ?? "").trim();
}

function getDefaultTranslatorApi() {
  return globalThis.Translator ?? null;
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

export async function translateQueryForSearch(
  query,
  {
    enabled,
    translatorApi = getDefaultTranslatorApi(),
  } = {},
) {
  const normalizedQuery = normalizeQueryValue(query);

  if (!enabled || !containsChinese(normalizedQuery)) {
    return normalizedQuery;
  }

  try {
    return await translateChineseQueryToEnglish(normalizedQuery, translatorApi);
  } catch {
    return normalizedQuery;
  }
}
