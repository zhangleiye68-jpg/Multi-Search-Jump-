(() => {
  const ROOT_CLASS = "msj-tiktok-caption-root";
  const OPEN_CLASS = "is-open";
  const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
  const CAPTION_TEXT_SELECTOR = [
    "[data-e2e*='subtitle' i]",
    "[data-e2e*='caption' i]",
    "[class*='subtitle' i]",
    "[class*='caption' i]",
    "track[kind='captions']",
    "track[kind='subtitles']",
  ].join(",");
  const SUBTITLE_CONTAINER_KEYS = new Set([
    "subtitles",
    "subtitleInfo",
    "subtitleInfos",
  ]);
  const SUBTITLE_TEXT_KEYS = new Set([
    "text",
    "subtitleText",
  ]);
  const SUBTITLE_URL_KEYS = new Set([
    "url",
    "Url",
    "src",
  ]);
  const SUBTITLE_ENTRY_TYPES = Object.freeze({
    text: "text",
    url: "url",
  });
  const CAPTION_RESULT_SOURCES = Object.freeze({
    api: "api",
    detail: "detail",
    dom: "dom",
    hint: "hint",
    none: "none",
    script: "script",
  });
  const TIKTOK_API_MESSAGE_TYPE = "msj-tiktok-api-response";
  const TIKTOK_REHYDRATION_SCRIPT_ID = "__UNIVERSAL_DATA_FOR_REHYDRATION__";
  const TIKTOK_API_HINT_ITEM_LIMIT = 16;
  const SUBTITLE_FILE_IGNORED_LINE_PATTERN =
    /^(?:WEBVTT|NOTE\b|STYLE\b|REGION\b|\d+|[\d:,.]+\s+-->\s+[\d:,.]+.*)$/u;
  const DOM_CAPTION_EXCLUDED_SELECTOR = [
    "a",
    "button",
    "input",
    "textarea",
    "[contenteditable='true']",
    "[data-e2e*='comment' i]",
    "[data-e2e*='video-desc' i]",
    "[data-e2e*='music' i]",
  ].join(",");
  const tikTokApiItemCache = new Map();

  function normalizeCaptionText(value) {
    return String(value ?? "")
      .replace(/\s+/gu, " ")
      .trim();
  }

  function splitCaptionText(value) {
    return String(value ?? "")
      .split(/\n+/u)
      .map(normalizeCaptionText)
      .filter(Boolean);
  }

  function appendUniqueLine(lines, seen, value) {
    for (const line of splitCaptionText(value)) {
      const key = line.toLocaleLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      lines.push(line);
    }
  }

  function normalizeCaptionMatchKey(value) {
    return normalizeCaptionText(value)
      .toLocaleLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, "");
  }

  function isHiddenNode(node) {
    return (
      node?.hidden === true ||
      node?.getAttribute?.("aria-hidden") === "true"
    );
  }

  function isExtensionNode(node) {
    return Boolean(node?.closest?.(`.${ROOT_CLASS}`));
  }

  function isExcludedDomCaptionNode(node) {
    return Boolean(node?.closest?.(DOM_CAPTION_EXCLUDED_SELECTOR));
  }

  function getNodeRect(node) {
    const rect = node?.getBoundingClientRect?.();

    if (!rect) {
      return null;
    }

    const left = Number(rect.left ?? 0);
    const top = Number(rect.top ?? 0);
    const width = Number(rect.width ?? ((rect.right ?? 0) - left));
    const height = Number(rect.height ?? ((rect.bottom ?? 0) - top));

    if (width <= 0 || height <= 0) {
      return null;
    }

    return {
      bottom: Number(rect.bottom ?? top + height),
      height,
      left,
      right: Number(rect.right ?? left + width),
      top,
      width,
    };
  }

  function getViewportRect(root) {
    const windowRef =
      root?.defaultView ||
      root?.ownerDocument?.defaultView ||
      globalThis.window;
    const width = Number(windowRef?.innerWidth ?? 0);
    const height = Number(windowRef?.innerHeight ?? 0);

    if (width <= 0 || height <= 0) {
      return null;
    }

    return {
      bottom: height,
      height,
      left: 0,
      right: width,
      top: 0,
      width,
    };
  }

  function getRectIntersectionArea(rect, viewportRect) {
    if (!rect || !viewportRect) {
      return 0;
    }

    const width = Math.max(0, Math.min(rect.right, viewportRect.right) - Math.max(rect.left, viewportRect.left));
    const height = Math.max(0, Math.min(rect.bottom, viewportRect.bottom) - Math.max(rect.top, viewportRect.top));

    return width * height;
  }

  function getRectCenterDistance(rect, viewportRect) {
    if (!rect || !viewportRect) {
      return Number.POSITIVE_INFINITY;
    }

    const rectCenterX = rect.left + rect.width / 2;
    const rectCenterY = rect.top + rect.height / 2;
    const viewportCenterX = viewportRect.left + viewportRect.width / 2;
    const viewportCenterY = viewportRect.top + viewportRect.height / 2;

    return Math.hypot(rectCenterX - viewportCenterX, rectCenterY - viewportCenterY);
  }

  function isRectCenterInsideRect(rect, containerRect) {
    if (!rect || !containerRect) {
      return false;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return (
      centerX >= containerRect.left &&
      centerX <= containerRect.right &&
      centerY >= containerRect.top &&
      centerY <= containerRect.bottom
    );
  }

  function getActiveVideo(root) {
    let activeVideo = null;
    let activeVisibleArea = 0;
    let activeArea = 0;
    let activeDistance = Number.POSITIVE_INFINITY;
    const viewportRect = getViewportRect(root);

    for (const video of root?.querySelectorAll?.("video") ?? []) {
      const rect = getNodeRect(video);

      if (!rect) {
        continue;
      }

      const area = rect.width * rect.height;
      const visibleArea = viewportRect ? getRectIntersectionArea(rect, viewportRect) : area;
      const distance = getRectCenterDistance(rect, viewportRect);

      if (viewportRect && (visibleArea <= 0 || !isRectCenterInsideRect(rect, viewportRect))) {
        continue;
      }

      if (
        visibleArea > activeVisibleArea ||
        (visibleArea === activeVisibleArea && distance < activeDistance) ||
        (visibleArea === activeVisibleArea && distance === activeDistance && area > activeArea)
      ) {
        activeVisibleArea = visibleArea;
        activeArea = area;
        activeDistance = distance;
        activeVideo = video;
      }
    }

    return activeVideo;
  }

  function getActiveVideoRect(root) {
    return getNodeRect(getActiveVideo(root));
  }

  function getVideoSource(video) {
    const source = video?.querySelector?.("source");

    return normalizeCaptionText(
      video?.currentSrc ||
        video?.src ||
        video?.getAttribute?.("src") ||
        source?.src ||
        source?.getAttribute?.("src") ||
        "",
    );
  }

  function getActiveVideoLink(root) {
    const activeVideoRect = getActiveVideoRect(root);
    let closestHref = "";
    let closestDistance = Number.POSITIVE_INFINITY;

    if (!activeVideoRect) {
      return "";
    }

    for (const link of root?.querySelectorAll?.("a[href*='/video/']") ?? []) {
      const href = normalizeCaptionText(link?.href || link?.getAttribute?.("href") || "");
      const rect = getNodeRect(link);

      if (!href || !rect) {
        continue;
      }

      if (isNodeInsideRect(link, activeVideoRect)) {
        return href;
      }

      const distance = getRectDistance(activeVideoRect, rect);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestHref = href;
      }
    }

    return closestHref;
  }

  function normalizeTikTokAuthorId(value) {
    const authorId = normalizeCaptionText(value).replace(/^@/u, "");

    try {
      return decodeURIComponent(authorId).toLocaleLowerCase();
    } catch {
      return authorId.toLocaleLowerCase();
    }
  }

  function extractTikTokAuthorId(value) {
    const text = String(value ?? "");
    const match = text.match(/\/@([^/?#]+)/u);

    return normalizeTikTokAuthorId(match?.[1] ?? text);
  }

  function getActiveVideoAuthorId(root) {
    const activeVideoRect = getActiveVideoRect(root);
    let closestAuthorId = "";
    let closestDistance = Number.POSITIVE_INFINITY;

    if (!activeVideoRect) {
      return "";
    }

    for (const link of root?.querySelectorAll?.("a[href*='/@']") ?? []) {
      const href = normalizeCaptionText(link?.href || link?.getAttribute?.("href") || "");
      const authorId = extractTikTokAuthorId(href);
      const rect = getNodeRect(link);

      if (!authorId || !rect) {
        continue;
      }

      if (isNodeInsideRect(link, activeVideoRect)) {
        return authorId;
      }

      const distance = getRectDistance(activeVideoRect, rect);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestAuthorId = authorId;
      }
    }

    return closestAuthorId;
  }

  function isNodeInsideRect(node, containerRect) {
    const rect = getNodeRect(node);

    if (!rect || !containerRect) {
      return false;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return (
      centerX >= containerRect.left &&
      centerX <= containerRect.right &&
      centerY >= containerRect.top &&
      centerY <= containerRect.bottom
    );
  }

  function getRectDistance(leftRect, rightRect) {
    if (!leftRect || !rightRect) {
      return Number.POSITIVE_INFINITY;
    }

    const leftCenterX = leftRect.left + leftRect.width / 2;
    const leftCenterY = leftRect.top + leftRect.height / 2;
    const rightCenterX = rightRect.left + rightRect.width / 2;
    const rightCenterY = rightRect.top + rightRect.height / 2;

    return Math.hypot(leftCenterX - rightCenterX, leftCenterY - rightCenterY);
  }

  function hasChildWithSameText(node, text) {
    for (const child of node?.children ?? []) {
      if (normalizeCaptionText(child.textContent) === text) {
        return true;
      }
    }

    return false;
  }

  function isLikelyDomCaptionText(value) {
    const line = normalizeCaptionText(value);

    return line.length >= 2 && line.length <= 220;
  }

  function appendUniqueEntry(entries, seen, type, value) {
    const entryValue = String(value ?? "").trim();
    const normalizedValue = normalizeCaptionText(entryValue);
    const key = `${type}:${normalizedValue.toLocaleLowerCase()}`;

    if (!normalizedValue || seen.has(key)) {
      return;
    }

    seen.add(key);
    entries.push({ type, value: entryValue });
  }

  function getSubtitleEntryUrl(value) {
    if (!value || typeof value !== "object") {
      return "";
    }

    return (
      value.url ||
      value.Url ||
      value.src ||
      value.urlList?.[0] ||
      value.UrlList?.[0] ||
      ""
    );
  }

  function getTikTokItemId(item) {
    return normalizeCaptionText(
      item?.id ||
        item?.itemId ||
        item?.item_id ||
        item?.awemeId ||
        item?.aweme_id ||
        item?.video?.id ||
        "",
    );
  }

  function getTikTokItemAuthorId(item) {
    return normalizeTikTokAuthorId(
      item?.author?.uniqueId ||
        item?.author?.unique_id ||
        item?.author?.unique_id_str ||
        item?.authorInfo?.uniqueId ||
        item?.authorInfo?.unique_id ||
        "",
    );
  }

  function getEntryLanguage(value) {
    return normalizeCaptionText(
      value?.languageCode ||
        value?.language ||
        value?.LanguageCodeName ||
        value?.lang ||
        "",
    );
  }

  function isWebVttSubtitleEntry(value) {
    const format = normalizeCaptionText(value?.Format || value?.format);

    return !format || format.toLocaleLowerCase() === "webvtt";
  }

  function normalizeLanguageKey(value) {
    const language = getEntryLanguage({ languageCode: value })
      .toLocaleLowerCase()
      .replace(/_/gu, "-");

    if (language.startsWith("eng")) {
      return "en";
    }

    if (language.startsWith("cmn") || language.startsWith("zho")) {
      return "zh";
    }

    return language.split("-")[0] || language;
  }

  function isMatchingSubtitleLanguage(entry, targetLanguage) {
    const entryLanguage = getEntryLanguage(entry);
    const target = normalizeCaptionText(targetLanguage);

    if (!entryLanguage || !target) {
      return false;
    }

    const normalizedEntry = entryLanguage.toLocaleLowerCase();
    const normalizedTarget = target.toLocaleLowerCase();

    return (
      normalizedEntry === normalizedTarget ||
      normalizedEntry.startsWith(normalizedTarget) ||
      normalizedTarget.startsWith(normalizedEntry) ||
      normalizeLanguageKey(normalizedEntry) === normalizeLanguageKey(normalizedTarget)
    );
  }

  function findSubtitleUrlFromTikTokItem(item) {
    if (!item?.video) {
      return "";
    }

    const targetLanguages = [
      item.video.claInfo?.originalLanguageInfo?.language,
      item.video.claInfo?.originalLanguageInfo?.languageCode,
      item.textLanguage,
      item.language,
    ].filter(Boolean);
    const captionInfos = item.video.claInfo?.captionInfos ?? [];
    const subtitleInfos = item.video.subtitleInfos ?? [];
    const captionInfoList = Array.isArray(captionInfos) ? captionInfos : [];
    const subtitleInfoList = Array.isArray(subtitleInfos) ? subtitleInfos : [];
    const subtitleLists = [captionInfoList, subtitleInfoList];

    for (const targetLanguage of targetLanguages) {
      for (const subtitleList of subtitleLists) {
        for (const entry of subtitleList) {
          if (!isWebVttSubtitleEntry(entry) || !isMatchingSubtitleLanguage(entry, targetLanguage)) {
            continue;
          }

          const url = getSubtitleEntryUrl(entry);

          if (url) {
            return url;
          }
        }
      }
    }

    for (const subtitleList of subtitleLists) {
      for (const entry of subtitleList) {
        if (!isWebVttSubtitleEntry(entry) || entry?.variant !== "default") {
          continue;
        }

        const url = getSubtitleEntryUrl(entry);

        if (url) {
          return url;
        }
      }
    }

    for (const subtitleList of subtitleLists) {
      for (const entry of subtitleList) {
        if (!isWebVttSubtitleEntry(entry)) {
          continue;
        }

        const url = getSubtitleEntryUrl(entry);

        if (url) {
          return url;
        }
      }
    }

    return "";
  }

  function getSubtitleUrlsFromTikTokItem(item) {
    if (!item?.video) {
      return [];
    }

    const urls = [];
    const seen = new Set();
    const captionInfos = item.video.claInfo?.captionInfos ?? [];
    const subtitleInfos = item.video.subtitleInfos ?? [];

    for (const entry of [
      ...(Array.isArray(captionInfos) ? captionInfos : []),
      ...(Array.isArray(subtitleInfos) ? subtitleInfos : []),
    ]) {
      if (!isWebVttSubtitleEntry(entry)) {
        continue;
      }

      const url = getSubtitleEntryUrl(entry);

      if (url && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }

    return urls;
  }

  function collectTikTokItems(value, items, seen = new WeakSet()) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (seen.has(value)) {
      return;
    }

    seen.add(value);

    if (!Array.isArray(value) && value.video && getTikTokItemId(value)) {
      items.push(value);
    }

    if (value.itemStruct && typeof value.itemStruct === "object") {
      collectTikTokItems(value.itemStruct, items, seen);
    }

    for (const nextValue of Array.isArray(value) ? value : Object.values(value)) {
      collectTikTokItems(nextValue, items, seen);
    }
  }

  function ingestTikTokApiPayload(payload) {
    const items = [];

    collectTikTokItems(payload, items);

    for (const item of items) {
      const itemId = getTikTokItemId(item);

      if (itemId) {
        tikTokApiItemCache.set(itemId, item);
      }
    }

    return items.length;
  }

  function collectTikTokApiCaptionEntries(currentVideoId, entries, seen) {
    const item = tikTokApiItemCache.get(normalizeCaptionText(currentVideoId));
    const subtitleUrl = findSubtitleUrlFromTikTokItem(item);

    if (subtitleUrl) {
      appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.url, subtitleUrl);
    }
  }

  async function collectTikTokApiCaptionEntriesByHints(root, fetchCaption, entries, seen) {
    if (!fetchCaption || tikTokApiItemCache.size === 0) {
      return;
    }

    const hintKeys = collectDomCaptionHintLines(root)
      .map(normalizeCaptionMatchKey)
      .filter(Boolean);

    if (hintKeys.length === 0) {
      return;
    }

    const recentItems = Array.from(tikTokApiItemCache.values())
      .slice(-TIKTOK_API_HINT_ITEM_LIMIT)
      .reverse();

    for (const item of recentItems) {
      const preferredSubtitleUrl = findSubtitleUrlFromTikTokItem(item);

      if (!preferredSubtitleUrl) {
        continue;
      }

      for (const subtitleUrl of getSubtitleUrlsFromTikTokItem(item)) {
        const subtitleLines = await fetchSubtitleLines(subtitleUrl, fetchCaption);
        const hasHintLine = subtitleLines.some((line) => {
          const lineKey = normalizeCaptionMatchKey(line);

          return lineKey && hintKeys.some((hintKey) => lineKey.includes(hintKey) || hintKey.includes(lineKey));
        });

        if (hasHintLine) {
          appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.url, preferredSubtitleUrl);
          return;
        }
      }
    }
  }

  function collectTikTokApiCaptionEntriesByActiveContext(root, entries, seen) {
    if (tikTokApiItemCache.size === 0) {
      return;
    }

    const activeAuthorId = getActiveVideoAuthorId(root);

    if (!activeAuthorId) {
      return;
    }

    const matchingItems = Array.from(tikTokApiItemCache.values())
      .slice(-TIKTOK_API_HINT_ITEM_LIMIT)
      .reverse()
      .filter((item) => getTikTokItemAuthorId(item) === activeAuthorId);

    if (matchingItems.length !== 1) {
      return;
    }

    const subtitleUrl = findSubtitleUrlFromTikTokItem(matchingItems[0]);

    if (subtitleUrl) {
      appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.url, subtitleUrl);
    }
  }

  function collectDomCaptionEntries(root, entries, seen, { allowText = true } = {}) {
    const activeVideoRect = getActiveVideoRect(root);

    for (const node of root?.querySelectorAll?.(CAPTION_TEXT_SELECTOR) ?? []) {
      if (
        isHiddenNode(node) ||
        isExtensionNode(node) ||
        isExcludedDomCaptionNode(node)
      ) {
        continue;
      }

      const tagName = String(node?.tagName ?? "").toLocaleLowerCase();
      const sourceUrl = node.getAttribute?.("src");

      if (tagName === "track" && sourceUrl) {
        appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.url, sourceUrl);
        continue;
      }

      const text = normalizeCaptionText(node.textContent);

      if (
        allowText &&
        isLikelyDomCaptionText(text) &&
        !hasChildWithSameText(node, text) &&
        isNodeInsideRect(node, activeVideoRect)
      ) {
        appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.text, text);
      }
    }
  }

  function collectDomCaptionHintLines(root) {
    const hintEntries = [];
    const hintSeen = new Set();
    const lines = [];
    const lineSeen = new Set();

    collectDomCaptionEntries(root, hintEntries, hintSeen, { allowText: true });

    for (const entry of hintEntries) {
      if (entry.type === SUBTITLE_ENTRY_TYPES.text) {
        appendUniqueLine(lines, lineSeen, entry.value);
      }
    }

    return lines;
  }

  function getCaptionHintKeyFromRoot(root) {
    return collectDomCaptionHintLines(root)
      .map(normalizeCaptionMatchKey)
      .filter(Boolean)
      .join(",");
  }

  function getStringField(value, keys) {
    if (!value || typeof value !== "object") {
      return "";
    }

    for (const key of keys) {
      if (typeof value[key] === "string") {
        return value[key];
      }
    }

    return "";
  }

  function collectSubtitleEntry(value, entries, seen, { allowText }) {
    if (typeof value === "string") {
      if (allowText) {
        appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.text, value);
      }
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    if (allowText) {
      appendUniqueEntry(
        entries,
        seen,
        SUBTITLE_ENTRY_TYPES.text,
        getStringField(value, SUBTITLE_TEXT_KEYS),
      );
    }

    appendUniqueEntry(
      entries,
      seen,
      SUBTITLE_ENTRY_TYPES.url,
      getStringField(value, SUBTITLE_URL_KEYS),
    );
  }

  function collectSubtitleEntries(value, entries, seen, { allowText }) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectSubtitleEntry(item, entries, seen, { allowText });
      }
      return;
    }

    collectSubtitleEntry(value, entries, seen, { allowText });
  }

  function collectSubtitleContainers(value, entries, seen) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        collectSubtitleContainers(item, entries, seen);
      }
      return;
    }

    for (const [nextKey, nextValue] of Object.entries(value)) {
      const normalizedKey = nextKey.trim();

      if (SUBTITLE_CONTAINER_KEYS.has(normalizedKey)) {
        collectSubtitleEntries(nextValue, entries, seen, {
          allowText: normalizedKey === "subtitles",
        });
      } else {
        collectSubtitleContainers(nextValue, entries, seen);
      }
    }
  }

  function parseScriptJson(text) {
    const normalizedText = String(text ?? "").trim();

    if (!normalizedText || !/^[{[]/u.test(normalizedText)) {
      return null;
    }

    try {
      return JSON.parse(normalizedText);
    } catch {
      return null;
    }
  }

  function decodeHtmlText(value) {
    return String(value ?? "")
      .replace(/&quot;/giu, "\"")
      .replace(/&#34;/gu, "\"")
      .replace(/&amp;/giu, "&")
      .replace(/&lt;/giu, "<")
      .replace(/&gt;/giu, ">");
  }

  function getTikTokVideoDetailItem(payload) {
    return (
      payload?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct ||
      payload?.["webapp.video-detail"]?.itemInfo?.itemStruct ||
      payload?.itemInfo?.itemStruct ||
      payload?.itemStruct ||
      null
    );
  }

  function parseTikTokRehydrationItem(text) {
    const payload = parseScriptJson(text);

    if (payload) {
      return getTikTokVideoDetailItem(payload);
    }

    const scriptPattern = new RegExp(
      `<script\\b(?=[^>]*\\bid=["']${TIKTOK_REHYDRATION_SCRIPT_ID}["'])[^>]*>([\\s\\S]*?)<\\/script>`,
      "iu",
    );
    const scriptMatch = String(text ?? "").match(scriptPattern);
    const scriptPayload = parseScriptJson(decodeHtmlText(scriptMatch?.[1] ?? ""));

    return getTikTokVideoDetailItem(scriptPayload);
  }

  async function collectTikTokDetailCaptionEntries(currentPageUrl, currentVideoId, fetchCaption, entries, seen) {
    if (!currentPageUrl || !currentVideoId || !fetchCaption) {
      return;
    }

    try {
      const response = await fetchCaption(currentPageUrl);

      if (!response?.ok || !response.text) {
        return;
      }

      const item = parseTikTokRehydrationItem(await response.text());

      if (!item) {
        return;
      }

      const itemId = getTikTokItemId(item);

      if (currentVideoId && itemId && itemId !== currentVideoId) {
        return;
      }

      const subtitleUrl = findSubtitleUrlFromTikTokItem(item);

      if (subtitleUrl) {
        appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.url, subtitleUrl);
      }
    } catch {
      // Detail-page probing is a best-effort official subtitle lookup.
    }
  }

  function collectScriptCaptionEntries(root, entries, seen) {
    for (const script of root?.querySelectorAll?.("script") ?? []) {
      const payload = parseScriptJson(script.textContent);

      if (payload) {
        collectSubtitleContainers(payload, entries, seen);
      }
    }
  }

  function getDefaultFetchApi() {
    return globalThis.fetch?.bind(globalThis) ?? null;
  }

  function stripCaptionMarkup(line) {
    return normalizeCaptionText(
      String(line ?? "")
        .replace(/<[^>]+>/gu, "")
        .replace(/&nbsp;/giu, " ")
        .replace(/&amp;/giu, "&")
        .replace(/&lt;/giu, "<")
        .replace(/&gt;/giu, ">"),
    );
  }

  function parseSubtitleFile(text) {
    const lines = [];
    const seen = new Set();

    for (const rawLine of String(text ?? "").split(/\r?\n/u)) {
      const line = stripCaptionMarkup(rawLine);

      if (!line || SUBTITLE_FILE_IGNORED_LINE_PATTERN.test(line)) {
        continue;
      }

      appendUniqueLine(lines, seen, line);
    }

    return lines;
  }

  async function fetchSubtitleLines(url, fetchApi) {
    if (!url || !fetchApi) {
      return [];
    }

    try {
      const response = await fetchApi(url);

      if (!response?.ok || !response.text) {
        return [];
      }

      return parseSubtitleFile(await response.text());
    } catch {
      return [];
    }
  }

  async function resolveCaptionEntries(entries, fetchCaption) {
    const lines = [];
    const seen = new Set();

    for (const entry of entries) {
      if (entry.type === SUBTITLE_ENTRY_TYPES.text) {
        appendUniqueLine(lines, seen, entry.value);
        continue;
      }

      for (const line of await fetchSubtitleLines(entry.value, fetchCaption)) {
        appendUniqueLine(lines, seen, line);
      }
    }

    return lines;
  }

  function collectDomCaptionLines(root, fetchCaption, { allowText = true } = {}) {
    const domEntries = [];
    const domSeen = new Set();

    collectDomCaptionEntries(root, domEntries, domSeen, { allowText });

    return resolveCaptionEntries(domEntries, fetchCaption);
  }

  function collectScriptCaptionLines(root, fetchCaption) {
    const scriptEntries = [];
    const scriptSeen = new Set();

    collectScriptCaptionEntries(root, scriptEntries, scriptSeen);

    return resolveCaptionEntries(scriptEntries, fetchCaption);
  }

  async function extractCaptionResult(
    root = document,
    {
      currentVideoId = "",
      currentPageUrl = "",
      fetchCaption = getDefaultFetchApi(),
      allowDomTextCaptions = true,
      allowDomFallback = true,
      ignoreScriptCaptions = false,
      preferDomCaptions = false,
    } = {},
  ) {
    const apiEntries = [];
    const apiSeen = new Set();

    collectTikTokApiCaptionEntries(currentVideoId, apiEntries, apiSeen);

    if (apiEntries.length > 0) {
      const apiLines = await resolveCaptionEntries(apiEntries, fetchCaption);

      if (apiLines.length > 0) {
        return { lines: apiLines, source: CAPTION_RESULT_SOURCES.api };
      }
    }

    const detailEntries = [];
    const detailSeen = new Set();

    await collectTikTokDetailCaptionEntries(
      currentPageUrl,
      normalizeCaptionText(currentVideoId),
      fetchCaption,
      detailEntries,
      detailSeen,
    );

    if (detailEntries.length > 0) {
      const detailLines = await resolveCaptionEntries(detailEntries, fetchCaption);

      if (detailLines.length > 0) {
        return { lines: detailLines, source: CAPTION_RESULT_SOURCES.detail };
      }
    }

    if (!currentVideoId) {
      const hintKey = getCaptionHintKeyFromRoot(root);
      const hintEntries = [];
      const hintSeen = new Set();

      await collectTikTokApiCaptionEntriesByHints(root, fetchCaption, hintEntries, hintSeen);

      if (hintEntries.length > 0) {
        const hintLines = await resolveCaptionEntries(hintEntries, fetchCaption);

        if (hintLines.length > 0) {
          return { lines: hintLines, source: CAPTION_RESULT_SOURCES.hint };
        }
      }

      if (!hintKey) {
        const contextEntries = [];
        const contextSeen = new Set();

        collectTikTokApiCaptionEntriesByActiveContext(root, contextEntries, contextSeen);

        if (contextEntries.length > 0) {
          const contextLines = await resolveCaptionEntries(contextEntries, fetchCaption);

          if (contextLines.length > 0) {
            return { lines: contextLines, source: CAPTION_RESULT_SOURCES.api };
          }
        }
      }
    }

    if (allowDomFallback && preferDomCaptions) {
      const domLines = await collectDomCaptionLines(root, fetchCaption, {
        allowText: allowDomTextCaptions,
      });

      if (domLines.length > 0) {
        return { lines: domLines, source: CAPTION_RESULT_SOURCES.dom };
      }
    }

    if (!ignoreScriptCaptions) {
      const scriptLines = await collectScriptCaptionLines(root, fetchCaption);

      if (scriptLines.length > 0) {
        return { lines: scriptLines, source: CAPTION_RESULT_SOURCES.script };
      }
    }

    if (preferDomCaptions || !allowDomFallback) {
      return { lines: [], source: CAPTION_RESULT_SOURCES.none };
    }

    const domLines = await collectDomCaptionLines(root, fetchCaption, {
      allowText: allowDomTextCaptions,
    });

    return {
      lines: domLines,
      source: domLines.length > 0 ? CAPTION_RESULT_SOURCES.dom : CAPTION_RESULT_SOURCES.none,
    };
  }

  async function extractCaptionLines(root = document, options = {}) {
    return (await extractCaptionResult(root, options)).lines;
  }

  async function translateEnglishCaptionToChinese(line, fetchApi = getDefaultFetchApi()) {
    const normalizedLine = normalizeCaptionText(line);

    if (!normalizedLine || !fetchApi) {
      return "";
    }

    const url = new URL(GOOGLE_TRANSLATE_URL);
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", "zh-CN");
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", normalizedLine);

    try {
      const response = await fetchApi(url.toString());

      if (!response?.ok) {
        return "";
      }

      const payload = await response.json();
      const translatedText = Array.isArray(payload?.[0])
        ? payload[0].map((chunk) => chunk?.[0] ?? "").join("")
        : "";

      return normalizeCaptionText(translatedText);
    } catch {
      return "";
    }
  }

  async function translateCaptionLines(lines, translateCaption) {
    const translatedLines = await Promise.all(
      lines.map(async (line) => {
        const translation = normalizeCaptionText(await translateCaption(line));

        return translation ? { original: line, translation } : null;
      }),
    );

    return translatedLines.filter(Boolean);
  }

  function getDefaultSetInterval() {
    return globalThis.window?.setInterval?.bind(globalThis.window) ?? null;
  }

  function getDefaultClearInterval() {
    return globalThis.window?.clearInterval?.bind(globalThis.window) ?? null;
  }

  function getCaptionSourceKey(documentRef) {
    const video = documentRef?.querySelector?.("video");
    const videoSource = getVideoSource(video);
    const locationHref = normalizeCaptionText(
      documentRef?.location?.href || globalThis.location?.href || "",
    );

    return `${locationHref}|${videoSource}`;
  }

  function getCaptionSourceKeyFromRoot(root, documentRef) {
    const baseSourceKey = getCaptionSourceKey(documentRef);
    const activeVideoSource = getVideoSource(getActiveVideo(root));
    const activeVideoLink = getActiveVideoLink(root);
    const activeAuthorId = getActiveVideoAuthorId(root);

    return `${baseSourceKey}|${activeVideoSource}|${activeVideoLink}|${activeAuthorId}`;
  }

  function hasConcreteVideoSourceKey(sourceKey) {
    const parts = String(sourceKey ?? "")
      .split("|")
      .map(normalizeCaptionText)
      .filter(Boolean);

    return parts.length > 1 || parts.some((part) => /\/video\/\d{5,}/u.test(part));
  }

  function getPageUrlFromSourceKey(sourceKey) {
    const parts = String(sourceKey ?? "")
      .split("|")
      .map(normalizeCaptionText)
      .filter(Boolean);
    const videoPageUrl = parts.find((part) => /\/video\/\d{5,}/u.test(part));
    const pageUrl = videoPageUrl || parts[0] || "";

    return normalizeCaptionText(pageUrl);
  }

  function extractTikTokVideoId(value) {
    const text = String(value ?? "");
    const pathMatch = text.match(/\/video\/(\d{5,})/u);

    if (pathMatch) {
      return pathMatch[1];
    }

    const queryMatch = text.match(/[?&](?:item_id|itemId|aweme_id|awemeId|video_id)=([0-9]{5,})/u);

    return queryMatch?.[1] ?? "";
  }

  function handleTikTokApiMessage(event) {
    if (event?.origin && !/https:\/\/(?:[^/]+\.)?tiktok\.com$/u.test(event.origin)) {
      return;
    }

    if (event?.data?.type !== TIKTOK_API_MESSAGE_TYPE) {
      return;
    }

    ingestTikTokApiPayload(event.data.payload);
  }

  globalThis.window?.addEventListener?.("message", handleTikTokApiMessage);

  function createButton(documentRef) {
    const button = documentRef.createElement("button");
    button.className = "msj-tiktok-caption-button";
    button.type = "button";
    button.textContent = "CC";
    button.title = "查看 TikTok 字幕";
    button.setAttribute("aria-label", "查看 TikTok 字幕");
    return button;
  }

  function createPanel(documentRef) {
    const panel = documentRef.createElement("section");
    const header = documentRef.createElement("div");
    const title = documentRef.createElement("h2");
    const headerActions = documentRef.createElement("div");
    const bilingualLabel = documentRef.createElement("label");
    const bilingualText = documentRef.createElement("span");
    const bilingualToggle = documentRef.createElement("input");
    const bilingualTrack = documentRef.createElement("span");
    const closeButton = documentRef.createElement("button");
    const status = documentRef.createElement("p");
    const captionList = documentRef.createElement("div");
    const actions = documentRef.createElement("div");
    const refreshButton = documentRef.createElement("button");
    const copyButton = documentRef.createElement("button");

    panel.className = "msj-tiktok-caption-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "TikTok 字幕看板");
    header.className = "msj-tiktok-caption-header";
    title.textContent = "TikTok 字幕";
    headerActions.className = "msj-tiktok-caption-header-actions";
    bilingualLabel.className = "msj-tiktok-caption-bilingual";
    bilingualText.textContent = "双语";
    bilingualToggle.className = "msj-tiktok-caption-bilingual-input";
    bilingualToggle.type = "checkbox";
    bilingualToggle.checked = true;
    bilingualToggle.setAttribute("aria-label", "开启中文字幕");
    bilingualTrack.className = "msj-tiktok-caption-bilingual-track";
    closeButton.className = "msj-tiktok-caption-close";
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "关闭字幕看板");
    status.className = "msj-tiktok-caption-status";
    status.setAttribute("role", "status");
    captionList.className = "msj-tiktok-caption-list";
    actions.className = "msj-tiktok-caption-actions";
    refreshButton.type = "button";
    refreshButton.textContent = "刷新字幕";
    copyButton.type = "button";
    copyButton.textContent = "复制全部";

    bilingualLabel.append(bilingualText, bilingualToggle, bilingualTrack);
    headerActions.append(bilingualLabel, closeButton);
    header.append(title, headerActions);
    actions.append(refreshButton, copyButton);
    panel.append(header, status, captionList, actions);

    return {
      bilingualToggle,
      captionList,
      closeButton,
      copyButton,
      panel,
      refreshButton,
      status,
    };
  }

  function renderCaptionLines({ captionList, documentRef, lines }) {
    captionList.textContent = "";

    if (Array.isArray(captionList.children)) {
      captionList.children.length = 0;
    }

    for (const line of lines) {
      const item = documentRef.createElement("p");

      if (typeof line === "string") {
        item.textContent = line;
      } else {
        const original = documentRef.createElement("span");
        const translation = documentRef.createElement("span");

        original.className = "msj-tiktok-caption-original";
        translation.className = "msj-tiktok-caption-translation";
        original.lang = "en";
        translation.lang = "zh-CN";
        original.textContent = line.original;
        translation.textContent = line.translation;
        item.append(original, translation);
      }

      captionList.append(item);
    }
  }

  function createCaptionOverlay({
    document: documentRef = document,
    getRoot = () => documentRef,
    getSourceKey = () => getCaptionSourceKeyFromRoot(getRoot(), documentRef),
    getHintKey = () => getCaptionHintKeyFromRoot(getRoot()),
    navigator: navigatorRef = navigator,
    fetchCaption = getDefaultFetchApi(),
    setInterval: setIntervalRef = getDefaultSetInterval(),
    clearInterval: clearIntervalRef = getDefaultClearInterval(),
    autoRefreshIntervalMs = 800,
    autoRefreshRetryAttempts = 4,
    translateCaption = translateEnglishCaptionToChinese,
  } = {}) {
    const existingRoot = documentRef.querySelector?.(`.${ROOT_CLASS}`);

    if (existingRoot?.__msjTikTokCaptionOverlay) {
      return existingRoot.__msjTikTokCaptionOverlay;
    }

    const root = documentRef.createElement("div");
    const button = createButton(documentRef);
    const panelParts = createPanel(documentRef);
    let bilingualEnabled = panelParts.bilingualToggle.checked;
    let currentLines = [];
    let currentDisplayLines = [];
    let lastSourceKey = getSourceKey();
    let lastHintKey = getHintKey();
    let refreshRequestId = 0;
    let autoRefreshTimer = null;
    let pendingAutoRefreshAttempts = 0;

    root.classList.add(ROOT_CLASS);
    root.append(button, panelParts.panel);
    documentRef.body?.append(root);

    function setStatus(message) {
      panelParts.status.textContent = message;
    }

    function clearCaptions(message) {
      currentLines = [];
      currentDisplayLines = [];
      renderCaptionLines({
        captionList: panelParts.captionList,
        documentRef,
        lines: currentDisplayLines,
      });
      setStatus(message);
    }

    async function createDisplayLines(lines) {
      return bilingualEnabled ? await translateCaptionLines(lines, translateCaption) : lines;
    }

    async function refreshCaptions({ ignoreScriptCaptions = false } = {}) {
      const requestId = ++refreshRequestId;
      const nextSourceKey = getSourceKey();
      const nextHintKey = getHintKey();
      const shouldIgnoreScriptCaptions =
        ignoreScriptCaptions ||
        nextSourceKey !== lastSourceKey ||
        hasConcreteVideoSourceKey(nextSourceKey);

      lastSourceKey = nextSourceKey;
      lastHintKey = nextHintKey;
      setStatus("正在读取字幕。");

      try {
        const currentVideoId = extractTikTokVideoId(nextSourceKey);
        const captionResult = await extractCaptionResult(getRoot(), {
          currentPageUrl: getPageUrlFromSourceKey(nextSourceKey),
          currentVideoId,
          fetchCaption,
          allowDomTextCaptions: false,
          allowDomFallback: true,
          ignoreScriptCaptions: shouldIgnoreScriptCaptions,
          preferDomCaptions: true,
        });
        const nextLines = captionResult.lines;
        const displayLines = await createDisplayLines(nextLines);

        if (requestId !== refreshRequestId || getSourceKey() !== nextSourceKey) {
          return;
        }

        const hasDisplayLines = displayLines.length > 0;
        currentLines = nextLines;
        currentDisplayLines = displayLines;

        if (hasDisplayLines) {
          pendingAutoRefreshAttempts = 0;
        }

        renderCaptionLines({
          captionList: panelParts.captionList,
          documentRef,
          lines: displayLines,
        });

        setStatus(
          hasDisplayLines
            ? `已读取 ${displayLines.length} 条字幕。`
            : "未检测到可读取字幕。",
        );
      } catch (error) {
        if (requestId !== refreshRequestId) {
          return;
        }

        console.error(error);
        clearCaptions("字幕读取失败。");
      }
    }

    function refreshCaptionsIfSourceChanged() {
      if (panelParts.panel.hidden) {
        return Promise.resolve();
      }

      const nextSourceKey = getSourceKey();
      const nextHintKey = getHintKey();

      if (nextSourceKey === lastSourceKey) {
        if (currentDisplayLines.length > 0) {
          lastHintKey = nextHintKey;
          return Promise.resolve();
        }

        if (nextHintKey && nextHintKey !== lastHintKey) {
          lastHintKey = nextHintKey;
          pendingAutoRefreshAttempts = Math.max(
            pendingAutoRefreshAttempts,
            autoRefreshRetryAttempts,
          );
          return refreshCaptions({ ignoreScriptCaptions: true });
        }

        if (pendingAutoRefreshAttempts > 0 && currentDisplayLines.length === 0) {
          pendingAutoRefreshAttempts -= 1;
          return refreshCaptions({ ignoreScriptCaptions: true });
        }

        return Promise.resolve();
      }

      pendingAutoRefreshAttempts = autoRefreshRetryAttempts;
      lastHintKey = nextHintKey;
      refreshRequestId += 1;
      clearCaptions("正在读取字幕。");

      return refreshCaptions({ ignoreScriptCaptions: true });
    }

    function startAutoRefresh() {
      if (autoRefreshTimer || !setIntervalRef || autoRefreshIntervalMs <= 0) {
        return;
      }

      autoRefreshTimer = setIntervalRef(
        () => refreshCaptionsIfSourceChanged(),
        autoRefreshIntervalMs,
      );
    }

    function stopAutoRefresh() {
      if (!autoRefreshTimer) {
        return;
      }

      clearIntervalRef?.(autoRefreshTimer);
      autoRefreshTimer = null;
    }

    function setOpen(isOpen) {
      panelParts.panel.hidden = !isOpen;
      root.classList.toggle(OPEN_CLASS, isOpen);

      if (isOpen) {
        startAutoRefresh();
        return refreshCaptionsWithRetryWindow();
      }

      stopAutoRefresh();
      return Promise.resolve();
    }

    async function copyCaptions() {
      if (currentDisplayLines.length === 0) {
        setStatus("没有可复制的字幕。");
        return;
      }

      if (!navigatorRef.clipboard?.writeText) {
        setStatus("复制失败，请手动选择字幕。");
        return;
      }

      try {
        const copyText = currentDisplayLines
          .flatMap((line) =>
            typeof line === "string"
              ? [line]
              : [line.original, line.translation].filter(Boolean),
          )
          .join("\n");

        await navigatorRef.clipboard.writeText(copyText);
        setStatus("字幕已复制。");
      } catch (error) {
        console.error(error);
        setStatus("复制失败，请手动选择字幕。");
      }
    }

    function refreshCaptionsWithRetryWindow() {
      pendingAutoRefreshAttempts = Math.max(
        pendingAutoRefreshAttempts,
        autoRefreshRetryAttempts,
      );

      return refreshCaptions();
    }

    async function updateBilingualMode() {
      const requestId = ++refreshRequestId;

      bilingualEnabled = panelParts.bilingualToggle.checked;
      currentDisplayLines = await createDisplayLines(currentLines);

      if (requestId !== refreshRequestId) {
        return;
      }

      renderCaptionLines({
        captionList: panelParts.captionList,
        documentRef,
        lines: currentDisplayLines,
      });
      setStatus(
        currentDisplayLines.length > 0
          ? `已读取 ${currentDisplayLines.length} 条字幕。`
          : "未检测到可读取字幕。",
      );
    }

    button.addEventListener("click", () => setOpen(panelParts.panel.hidden));
    panelParts.bilingualToggle.addEventListener("change", updateBilingualMode);
    panelParts.closeButton.addEventListener("click", () => setOpen(false));
    panelParts.refreshButton.addEventListener("click", refreshCaptionsWithRetryWindow);
    panelParts.copyButton.addEventListener("click", copyCaptions);

    const overlay = {
      bilingualToggle: panelParts.bilingualToggle,
      button,
      captionList: panelParts.captionList,
      closeButton: panelParts.closeButton,
      copyButton: panelParts.copyButton,
      destroy() {
        stopAutoRefresh();
        root.remove();
      },
      navigator: navigatorRef,
      panel: panelParts.panel,
      refreshButton: panelParts.refreshButton,
      refreshCaptions,
      refreshCaptionsIfSourceChanged,
      root,
      status: panelParts.status,
    };

    root.__msjTikTokCaptionOverlay = overlay;
    return overlay;
  }

  globalThis.MultiSearchJumpTikTokCaptions = {
    createCaptionOverlay,
    extractCaptionLines,
    extractTikTokVideoId,
    getCaptionSourceKey,
    ingestTikTokApiPayload,
    normalizeCaptionText,
    translateEnglishCaptionToChinese,
  };
})();
