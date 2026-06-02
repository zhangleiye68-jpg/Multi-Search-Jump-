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
  const DISPLAY_MODES = Object.freeze({
    bilingual: "bilingual",
    chinese: "chinese",
    original: "original",
  });
  const DISPLAY_MODE_LABELS = Object.freeze({
    [DISPLAY_MODES.original]: "原版",
    [DISPLAY_MODES.bilingual]: "原+中",
    [DISPLAY_MODES.chinese]: "中文",
  });
  const DISPLAY_MODE_STORAGE_KEY = "tiktokCaptionDisplayMode";
  const NON_ENGLISH_WARNING_STORAGE_KEY = "tiktokCaptionNonEnglishWarningEnabled";
  const BUTTON_POSITION_STORAGE_KEY = "tiktokCaptionButtonPosition";
  const PANEL_FRAME_STORAGE_KEY = "tiktokCaptionPanelFrame";
  const DETAILS_HEIGHT_STORAGE_KEY = "tiktokCaptionDetailsHeight";
  const DEFAULT_DISPLAY_MODE = DISPLAY_MODES.bilingual;
  const DEFAULT_NON_ENGLISH_WARNING_ENABLED = true;
  const MIN_PANEL_WIDTH = 280;
  const MIN_PANEL_HEIGHT = 260;
  const DEFAULT_PANEL_WIDTH = 360;
  const DEFAULT_PANEL_HEIGHT = 560;
  const DEFAULT_DETAILS_HEIGHT = 84;
  const MIN_DETAILS_HEIGHT = 56;
  const MAX_DETAILS_HEIGHT = 220;
  const LONG_CAPTION_DETAILS_LINE_THRESHOLD = 4;
  const BUTTON_SIZE = 44;
  const DRAG_THRESHOLD_PX = 6;
  const HIGH_POTENTIAL_K_PER_HOUR = 50 / 12;
  const MID_POTENTIAL_K_PER_HOUR = 2.5;
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

    const candidateLinks = [
      ...(root?.querySelectorAll?.("a[href*='/video/']") ?? []),
      ...(root?.querySelectorAll?.("a[href*='/photo/']") ?? []),
    ];

    for (const link of candidateLinks) {
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

  function getTikTokItemLanguage(item) {
    return normalizeCaptionText(
      item?.video?.claInfo?.originalLanguageInfo?.language ||
        item?.video?.claInfo?.originalLanguageInfo?.languageCode ||
        item?.textLanguage ||
        item?.language ||
        item?.video?.subtitleInfos?.[0]?.languageCode ||
        item?.video?.subtitleInfos?.[0]?.LanguageCodeName ||
        "",
    );
  }

  function parseMetricNumber(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    const text = normalizeCaptionText(value);

    if (!text) {
      return 0;
    }

    const match = text.match(/^([\d,.]+)\s*([kKmMwW万]?)$/u);

    if (!match) {
      const numeric = Number(text.replace(/,/gu, ""));
      return Number.isFinite(numeric) ? numeric : 0;
    }

    const numeric = Number(match[1].replace(/,/gu, ""));
    const unit = match[2].toLocaleLowerCase();

    if (!Number.isFinite(numeric)) {
      return 0;
    }

    if (unit === "k") {
      return numeric * 1000;
    }

    if (unit === "m") {
      return numeric * 1000000;
    }

    if (unit === "w" || unit === "万") {
      return numeric * 10000;
    }

    return numeric;
  }

  function getFirstMetricValue(...values) {
    for (const value of values) {
      const metric = parseMetricNumber(value);

      if (metric > 0) {
        return metric;
      }
    }

    return 0;
  }

  function getTikTokItemPlayCount(item) {
    return getFirstMetricValue(
      item?.stats?.playCount,
      item?.stats?.play_count,
      item?.statsV2?.playCount,
      item?.statsV2?.play_count,
      item?.statistics?.playCount,
      item?.statistics?.play_count,
      item?.itemStats?.playCount,
      item?.itemStats?.play_count,
      item?.playCount,
      item?.play_count,
    );
  }

  function getTikTokItemLikeCount(item) {
    return getFirstMetricValue(
      item?.stats?.diggCount,
      item?.stats?.digg_count,
      item?.stats?.likeCount,
      item?.stats?.like_count,
      item?.stats?.heartCount,
      item?.stats?.heart_count,
      item?.statsV2?.diggCount,
      item?.statsV2?.digg_count,
      item?.statsV2?.likeCount,
      item?.statsV2?.like_count,
      item?.statsV2?.heartCount,
      item?.statsV2?.heart_count,
      item?.statistics?.diggCount,
      item?.statistics?.digg_count,
      item?.statistics?.likeCount,
      item?.statistics?.like_count,
      item?.statistics?.heartCount,
      item?.statistics?.heart_count,
      item?.itemStats?.diggCount,
      item?.itemStats?.likeCount,
      item?.diggCount,
      item?.digg_count,
      item?.likeCount,
      item?.like_count,
      item?.heartCount,
      item?.heart_count,
    );
  }

  function getTikTokItemCreateTimeMs(item) {
    const rawCreateTime =
      item?.createTime ||
      item?.create_time ||
      item?.createTimeMs ||
      item?.create_time_ms ||
      0;
    const numericCreateTime = Number(rawCreateTime);

    if (!Number.isFinite(numericCreateTime) || numericCreateTime <= 0) {
      return 0;
    }

    return numericCreateTime > 100000000000 ? numericCreateTime : numericCreateTime * 1000;
  }

  function getTikTokTextValue(value) {
    if (typeof value === "string") {
      return normalizeCaptionText(value);
    }

    return normalizeCaptionText(value?.text || value?.title || value?.desc || "");
  }

  function getTikTokItemTitle(item) {
    return getTikTokTextValue(
      item?.imagePost?.title ||
        item?.image_post?.title ||
        item?.photoMode?.title ||
        item?.title ||
        "",
    );
  }

  function getTikTokItemDescription(item) {
    const title = getTikTokItemTitle(item);
    const description = getTikTokTextValue(
      item?.desc ||
        item?.description ||
        item?.shareInfo?.desc ||
        item?.shareInfo?.title ||
        "",
    );
    const lines = [];

    if (title) {
      lines.push(title);
    }

    if (description && description !== title) {
      lines.push(description);
    }

    return lines.join("\n");
  }

  function isTikTokImageItem(item) {
    return Boolean(item?.imagePost || item?.image_post || item?.photoMode);
  }

  function getTikTokImageCaptionText(item) {
    const lines = [];
    const seen = new Set();

    appendUniqueLine(lines, seen, getTikTokItemDescription(item));
    appendUniqueLine(lines, seen, item?.imagePost?.text);
    appendUniqueLine(lines, seen, item?.image_post?.text);
    appendUniqueLine(lines, seen, item?.photoMode?.text);

    return lines.join("\n");
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

    if (
      !Array.isArray(value) &&
      !value.video &&
      getTikTokItemId(value) &&
      (value.imagePost || value.image_post || value.photoMode || value.desc || value.description)
    ) {
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

    if (!subtitleUrl && isTikTokImageItem(item)) {
      appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.text, getTikTokImageCaptionText(item));
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

      if (!subtitleUrl && isTikTokImageItem(item)) {
        appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.text, getTikTokImageCaptionText(item));
      }
    } catch {
      // Detail-page probing is a best-effort official subtitle lookup.
    }
  }

  function getCachedTikTokItem(currentVideoId) {
    const normalizedVideoId = normalizeCaptionText(currentVideoId);

    if (!normalizedVideoId) {
      return null;
    }

    return tikTokApiItemCache.get(normalizedVideoId) ?? null;
  }

  async function fetchTikTokDetailItem(currentPageUrl, currentVideoId, fetchCaption) {
    if (!currentPageUrl || !currentVideoId || !fetchCaption) {
      return null;
    }

    try {
      const response = await fetchCaption(currentPageUrl);

      if (!response?.ok || !response.text) {
        return null;
      }

      const item = parseTikTokRehydrationItem(await response.text());
      const itemId = getTikTokItemId(item);

      if (!item || (itemId && itemId !== currentVideoId)) {
        return null;
      }

      if (itemId) {
        tikTokApiItemCache.set(itemId, item);
      }

      return item;
    } catch {
      return null;
    }
  }

  async function getTikTokVideoItem({ currentPageUrl, currentVideoId, fetchCaption }) {
    const cachedItem = getCachedTikTokItem(currentVideoId);

    if (cachedItem) {
      return cachedItem;
    }

    return fetchTikTokDetailItem(currentPageUrl, normalizeCaptionText(currentVideoId), fetchCaption);
  }

  function formatMetricNumber(value) {
    return value.toFixed(1).replace(/\.0$/u, "");
  }

  function formatMetric(value) {
    const numericValue = Math.max(0, Number(value) || 0);

    if (numericValue >= 1000000) {
      return `${formatMetricNumber(numericValue / 1000000)}M`;
    }

    return `${formatMetricNumber(numericValue / 1000)}K`;
  }

  function formatDurationShort(elapsedHours) {
    if (!Number.isFinite(elapsedHours) || elapsedHours <= 0) {
      return "<1h";
    }

    if (elapsedHours < 1) {
      return "<1h";
    }

    if (elapsedHours < 24) {
      return `${Math.floor(elapsedHours)}h`;
    }

    return `${(elapsedHours / 24).toFixed(1).replace(/\.0$/u, "")}d`;
  }

  function getPotential(rateKPerHour) {
    if (rateKPerHour >= HIGH_POTENTIAL_K_PER_HOUR) {
      return { className: "is-high", label: "高" };
    }

    if (rateKPerHour >= MID_POTENTIAL_K_PER_HOUR) {
      return { className: "is-mid", label: "中" };
    }

    return { className: "is-low", label: "低" };
  }

  function getVideoMetrics(item, nowMs) {
    const playCount = getTikTokItemPlayCount(item);
    const likeCount = getTikTokItemLikeCount(item);
    const createTimeMs = getTikTokItemCreateTimeMs(item);
    const elapsedMs = createTimeMs > 0 ? Math.max(0, nowMs - createTimeMs) : 0;
    const elapsedHours = elapsedMs > 0 ? elapsedMs / 3600000 : 0;
    const rateHours = Math.max(1, elapsedHours);
    const playKPerHour = playCount / rateHours / 1000;
    const potential = getPotential(playKPerHour);

    return {
      description: getTikTokItemDescription(item),
      durationLabel: formatDurationShort(elapsedHours),
      language: getTikTokItemLanguage(item),
      likeCountLabel: formatMetric(likeCount),
      playCountLabel: formatMetric(playCount),
      playRateLabel: `${formatMetric(playCount / rateHours)}/h`,
      potential,
    };
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

  async function translateCaptionLines(lines, translateCaption, displayMode = DISPLAY_MODES.bilingual) {
    if (displayMode === DISPLAY_MODES.original) {
      return lines;
    }

    const translatedLines = await Promise.all(
      lines.map(async (line) => {
        const translation = normalizeCaptionText(await translateCaption(line));

        if (!translation) {
          return null;
        }

        return displayMode === DISPLAY_MODES.chinese
          ? { translation }
          : { original: line, translation };
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

  function getDefaultStorageArea() {
    return globalThis.chrome?.storage?.local ?? null;
  }

  function normalizeDisplayMode(value) {
    return Object.hasOwn(DISPLAY_MODE_LABELS, value) ? value : DEFAULT_DISPLAY_MODE;
  }

  function normalizeBooleanSetting(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  async function getStoredOverlaySettings(storageArea) {
    if (!storageArea?.get) {
      return {
        buttonPosition: null,
        detailsHeight: DEFAULT_DETAILS_HEIGHT,
        displayMode: DEFAULT_DISPLAY_MODE,
        nonEnglishWarningEnabled: DEFAULT_NON_ENGLISH_WARNING_ENABLED,
        panelFrame: null,
      };
    }

    const values = await storageArea.get([
      BUTTON_POSITION_STORAGE_KEY,
      DETAILS_HEIGHT_STORAGE_KEY,
      DISPLAY_MODE_STORAGE_KEY,
      NON_ENGLISH_WARNING_STORAGE_KEY,
      PANEL_FRAME_STORAGE_KEY,
    ]);

    return {
      buttonPosition: values?.[BUTTON_POSITION_STORAGE_KEY] ?? null,
      detailsHeight: normalizeDetailsHeight(values?.[DETAILS_HEIGHT_STORAGE_KEY]),
      displayMode: normalizeDisplayMode(values?.[DISPLAY_MODE_STORAGE_KEY]),
      nonEnglishWarningEnabled: normalizeBooleanSetting(
        values?.[NON_ENGLISH_WARNING_STORAGE_KEY],
        DEFAULT_NON_ENGLISH_WARNING_ENABLED,
      ),
      panelFrame: values?.[PANEL_FRAME_STORAGE_KEY] ?? null,
    };
  }

  async function saveStoredOverlayValue(storageArea, key, value) {
    if (!storageArea?.set) {
      return;
    }

    await storageArea.set({ [key]: value });
  }

  function getViewportSize(documentRef) {
    const windowRef = documentRef?.defaultView || globalThis.window;

    return {
      height: Number(windowRef?.innerHeight ?? 900) || 900,
      width: Number(windowRef?.innerWidth ?? 1280) || 1280,
    };
  }

  function clampNumber(value, min, max) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return min;
    }

    return Math.min(max, Math.max(min, numericValue));
  }

  function getDefaultButtonPosition(documentRef) {
    const viewport = getViewportSize(documentRef);

    return {
      x: Math.round(viewport.width - BUTTON_SIZE - 76),
      y: Math.round(viewport.height * 0.42),
    };
  }

  function normalizeButtonPosition(position, documentRef) {
    const viewport = getViewportSize(documentRef);
    const fallback = getDefaultButtonPosition(documentRef);

    return {
      x: Math.round(clampNumber(position?.x ?? fallback.x, 8, viewport.width - BUTTON_SIZE - 8)),
      y: Math.round(clampNumber(position?.y ?? fallback.y, 8, viewport.height - BUTTON_SIZE - 8)),
    };
  }

  function getDefaultPanelFrame(documentRef) {
    const viewport = getViewportSize(documentRef);
    const width = Math.min(DEFAULT_PANEL_WIDTH, viewport.width - 24);
    const height = Math.min(DEFAULT_PANEL_HEIGHT, viewport.height - 32);

    return {
      height,
      width,
      x: Math.max(12, viewport.width - width - 92),
      y: 72,
    };
  }

  function normalizePanelFrame(frame, documentRef) {
    const viewport = getViewportSize(documentRef);
    const fallback = getDefaultPanelFrame(documentRef);
    const width = Math.round(
      clampNumber(frame?.width ?? fallback.width, MIN_PANEL_WIDTH, viewport.width - 24),
    );
    const height = Math.round(
      clampNumber(frame?.height ?? fallback.height, MIN_PANEL_HEIGHT, viewport.height - 24),
    );

    return {
      height,
      width,
      x: Math.round(clampNumber(frame?.x ?? fallback.x, 8, viewport.width - width - 8)),
      y: Math.round(clampNumber(frame?.y ?? fallback.y, 8, viewport.height - height - 8)),
    };
  }

  function normalizeDetailsHeight(value) {
    return Math.round(clampNumber(value ?? DEFAULT_DETAILS_HEIGHT, MIN_DETAILS_HEIGHT, MAX_DETAILS_HEIGHT));
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

    return parts.length > 1 || parts.some((part) => /\/(?:video|photo)\/\d{5,}/u.test(part));
  }

  function getPageUrlFromSourceKey(sourceKey) {
    const parts = String(sourceKey ?? "")
      .split("|")
      .map(normalizeCaptionText)
      .filter(Boolean);
    const videoPageUrl = parts.find((part) => /\/(?:video|photo)\/\d{5,}/u.test(part));
    const pageUrl = videoPageUrl || parts[0] || "";

    return normalizeCaptionText(pageUrl);
  }

  function extractTikTokVideoId(value) {
    const text = String(value ?? "");
    const pathMatch = text.match(/\/(?:video|photo)\/(\d{5,})/u);

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

  function createDisplayModeButton(documentRef, mode) {
    const button = documentRef.createElement("button");

    button.className = "msj-tiktok-caption-mode";
    button.type = "button";
    button.textContent = DISPLAY_MODE_LABELS[mode];
    button.dataset.mode = mode;
    button.setAttribute("aria-pressed", mode === DEFAULT_DISPLAY_MODE ? "true" : "false");

    return button;
  }

  function createVideoMetric(documentRef, { icon, label, value }) {
    const item = documentRef.createElement("span");
    const iconElement = documentRef.createElement("span");
    const valueElement = documentRef.createElement("span");

    item.className = "msj-tiktok-video-metric";
    item.title = label;
    iconElement.className = "msj-tiktok-video-metric-icon";
    iconElement.textContent = `${icon} `;
    iconElement.setAttribute("aria-hidden", "true");
    valueElement.className = "msj-tiktok-video-metric-value";
    valueElement.textContent = value;
    item.append(iconElement, valueElement);

    return item;
  }

  function createPanel(documentRef) {
    const panel = documentRef.createElement("section");
    const header = documentRef.createElement("div");
    const headerDragArea = documentRef.createElement("div");
    const modeGroup = documentRef.createElement("div");
    const originalModeButton = createDisplayModeButton(documentRef, DISPLAY_MODES.original);
    const bilingualModeButton = createDisplayModeButton(documentRef, DISPLAY_MODES.bilingual);
    const chineseModeButton = createDisplayModeButton(documentRef, DISPLAY_MODES.chinese);
    const closeButton = documentRef.createElement("button");
    const videoInfo = documentRef.createElement("div");
    const languageWarning = documentRef.createElement("p");
    const potentialBadge = documentRef.createElement("span");
    const metricList = documentRef.createElement("span");
    const videoDetails = documentRef.createElement("section");
    const detailsResizeHandle = documentRef.createElement("span");
    const detailsOriginal = documentRef.createElement("p");
    const detailsTranslation = documentRef.createElement("p");
    const status = documentRef.createElement("p");
    const captionList = documentRef.createElement("div");
    const actions = documentRef.createElement("div");
    const refreshButton = documentRef.createElement("button");
    const copyButton = documentRef.createElement("button");
    const resizeHandles = {
      bottom: documentRef.createElement("span"),
      left: documentRef.createElement("span"),
      right: documentRef.createElement("span"),
      top: documentRef.createElement("span"),
    };

    panel.className = "msj-tiktok-caption-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "TikTok 字幕看板");
    header.className = "msj-tiktok-caption-header";
    headerDragArea.className = "msj-tiktok-caption-header-drag";
    headerDragArea.setAttribute("aria-hidden", "true");
    modeGroup.className = "msj-tiktok-caption-mode-group";
    closeButton.className = "msj-tiktok-caption-close";
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "关闭字幕看板");
    videoInfo.className = "msj-tiktok-video-info";
    languageWarning.className = "msj-tiktok-language-warning";
    languageWarning.setAttribute("aria-live", "polite");
    potentialBadge.className = "msj-tiktok-potential is-low";
    metricList.className = "msj-tiktok-video-metrics";
    videoDetails.className = "msj-tiktok-video-details";
    detailsResizeHandle.className = "msj-tiktok-video-details-resize";
    detailsResizeHandle.title = "拖拽调整视频详情高度";
    detailsResizeHandle.setAttribute("aria-label", "拖拽调整视频详情高度");
    detailsResizeHandle.setAttribute("role", "separator");
    detailsResizeHandle.setAttribute("aria-orientation", "horizontal");
    detailsOriginal.className = "msj-tiktok-video-details-original";
    detailsOriginal.textContent = "暂无视频详情。";
    detailsTranslation.className = "msj-tiktok-caption-translation";
    detailsTranslation.classList?.add?.("msj-tiktok-caption-translation");
    detailsTranslation.lang = "zh-CN";
    status.className = "msj-tiktok-caption-status";
    status.setAttribute("role", "status");
    captionList.className = "msj-tiktok-caption-list";
    actions.className = "msj-tiktok-caption-actions";
    refreshButton.type = "button";
    refreshButton.className = "msj-tiktok-caption-action-button";
    refreshButton.textContent = "刷新字幕";
    copyButton.type = "button";
    copyButton.className = "msj-tiktok-caption-action-button";
    copyButton.textContent = "复制全部";

    for (const [edge, handle] of Object.entries(resizeHandles)) {
      handle.className = `msj-tiktok-caption-resize-handle is-${edge}`;
      handle.setAttribute("aria-hidden", "true");
      handle.dataset.edge = edge;
    }

    modeGroup.append(originalModeButton, bilingualModeButton, chineseModeButton);
    header.append(headerDragArea, closeButton);
    videoInfo.append(potentialBadge, metricList);
    videoDetails.append(detailsOriginal, detailsTranslation);
    actions.append(status, modeGroup, refreshButton, copyButton);
    panel.append(
      header,
      videoInfo,
      languageWarning,
      videoDetails,
      detailsResizeHandle,
      captionList,
      actions,
      resizeHandles.top,
      resizeHandles.right,
      resizeHandles.bottom,
      resizeHandles.left,
    );

    return {
      actions,
      captionList,
      closeButton,
      copyButton,
      detailsResizeHandle,
      detailsOriginal,
      detailsTranslation,
      header,
      languageWarning,
      metricList,
      modeGroup,
      modeButtons: {
        [DISPLAY_MODES.original]: originalModeButton,
        [DISPLAY_MODES.bilingual]: bilingualModeButton,
        [DISPLAY_MODES.chinese]: chineseModeButton,
      },
      panel,
      potentialBadge,
      refreshButton,
      resizeHandle: resizeHandles.bottom,
      resizeHandles,
      status,
      videoDetails,
      videoInfo,
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
        if (line.original) {
          const original = documentRef.createElement("span");

          original.className = "msj-tiktok-caption-original";
          original.classList?.add?.("msj-tiktok-caption-original");
          original.lang = "en";
          original.textContent = line.original;
          item.append(original);
        }

        if (line.translation) {
          const translation = documentRef.createElement("span");

          translation.className = "msj-tiktok-caption-translation";
          translation.classList?.add?.("msj-tiktok-caption-translation");
          translation.lang = "zh-CN";
          translation.textContent = line.translation;
          item.append(translation);
        }
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
    now = () => Date.now(),
    setInterval: setIntervalRef = getDefaultSetInterval(),
    clearInterval: clearIntervalRef = getDefaultClearInterval(),
    storageArea = getDefaultStorageArea(),
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
    let displayMode = DEFAULT_DISPLAY_MODE;
    let nonEnglishWarningEnabled = DEFAULT_NON_ENGLISH_WARNING_ENABLED;
    let buttonPosition = normalizeButtonPosition(null, documentRef);
    let panelFrame = normalizePanelFrame(null, documentRef);
    let currentLines = [];
    let currentDisplayLines = [];
    let lastSourceKey = getSourceKey();
    let lastHintKey = getHintKey();
    let refreshRequestId = 0;
    let autoRefreshTimer = null;
    let pendingAutoRefreshAttempts = 0;
    let buttonDragState = null;
    let activeDetailsHeight = DEFAULT_DETAILS_HEIGHT;
    let savedDetailsHeight = DEFAULT_DETAILS_HEIGHT;
    let detailsResizeState = null;
    let panelDragState = null;
    let panelResizeState = null;
    let suppressNextButtonClick = false;

    root.classList.add(ROOT_CLASS);
    root.append(button, panelParts.panel);
    documentRef.body?.append(root);

    function applyButtonPosition(nextPosition) {
      buttonPosition = normalizeButtonPosition(nextPosition, documentRef);
      root.style.left = `${buttonPosition.x}px`;
      root.style.top = `${buttonPosition.y}px`;
      root.style.right = "auto";
      root.style.transform = "none";
    }

    function applyPanelFrame(nextFrame) {
      panelFrame = normalizePanelFrame(nextFrame, documentRef);
      panelParts.panel.style.left = `${panelFrame.x}px`;
      panelParts.panel.style.top = `${panelFrame.y}px`;
      panelParts.panel.style.width = `${panelFrame.width}px`;
      panelParts.panel.style.height = `${panelFrame.height}px`;
    }

    function applyDetailsHeight(nextHeight) {
      activeDetailsHeight = normalizeDetailsHeight(nextHeight);
      panelParts.videoDetails.style.maxHeight = `${activeDetailsHeight}px`;
    }

    function applyDetailsHeightForCaptionCount(captionCount) {
      const shouldUseStoredHeight = captionCount > LONG_CAPTION_DETAILS_LINE_THRESHOLD;
      applyDetailsHeight(shouldUseStoredHeight ? savedDetailsHeight : DEFAULT_DETAILS_HEIGHT);
    }

    function updateModeButtons() {
      for (const [mode, modeButton] of Object.entries(panelParts.modeButtons)) {
        const isActive = mode === displayMode;

        modeButton.classList.toggle("is-active", isActive);
        modeButton.setAttribute("aria-pressed", isActive ? "true" : "false");
      }
    }

    async function loadSettings() {
      const storedSettings = await getStoredOverlaySettings(storageArea);

      displayMode = storedSettings.displayMode;
      nonEnglishWarningEnabled = storedSettings.nonEnglishWarningEnabled;
      savedDetailsHeight = storedSettings.detailsHeight;
      applyButtonPosition(storedSettings.buttonPosition);
      applyPanelFrame(storedSettings.panelFrame);
      applyDetailsHeightForCaptionCount(currentDisplayLines.length);
      updateModeButtons();
    }

    applyButtonPosition(buttonPosition);
    applyPanelFrame(panelFrame);
    applyDetailsHeight(DEFAULT_DETAILS_HEIGHT);
    updateModeButtons();
    const ready = loadSettings();

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
      applyDetailsHeightForCaptionCount(0);
      setStatus(message);
    }

    function renderVideoInfo(metrics, detailsTranslation) {
      const metricItems = [
        { icon: "♥", label: "点赞量", value: metrics.likeCountLabel },
        { icon: "↗", label: "平均播放量", value: metrics.playRateLabel },
        { icon: "▶", label: "播放量", value: metrics.playCountLabel },
        { icon: "⏱", label: "发布时间", value: metrics.durationLabel },
      ];

      panelParts.potentialBadge.textContent = metrics.potential.label;
      panelParts.potentialBadge.classList.remove("is-high", "is-mid", "is-low");
      panelParts.potentialBadge.classList.add(metrics.potential.className);
      panelParts.metricList.textContent = "";
      if (Array.isArray(panelParts.metricList.children)) {
        panelParts.metricList.children.length = 0;
      }

      for (const metricItem of metricItems) {
        panelParts.metricList.append(createVideoMetric(documentRef, metricItem));
      }
      panelParts.detailsOriginal.textContent = metrics.description || "暂无视频详情。";
      panelParts.detailsTranslation.textContent = detailsTranslation || "";

      if (
        nonEnglishWarningEnabled &&
        metrics.language &&
        normalizeLanguageKey(metrics.language) !== "en"
      ) {
        panelParts.languageWarning.textContent = "⚠ 非因内容";
        panelParts.languageWarning.classList.add("is-visible");
      } else {
        panelParts.languageWarning.textContent = "";
        panelParts.languageWarning.classList.remove("is-visible");
      }
    }

    async function refreshVideoInfo(currentVideoId, sourceKey, requestId) {
      const item = await getTikTokVideoItem({
        currentPageUrl: getPageUrlFromSourceKey(sourceKey),
        currentVideoId,
        fetchCaption,
      });
      const metrics = getVideoMetrics(item, now());
      let detailsTranslation = "";

      if (metrics.description) {
        try {
          detailsTranslation = normalizeCaptionText(await translateCaption(metrics.description));
        } catch {
          detailsTranslation = "";
        }
      }

      if (requestId !== refreshRequestId || getSourceKey() !== sourceKey) {
        return false;
      }

      renderVideoInfo(metrics, detailsTranslation);
      return true;
    }

    async function createDisplayLines(lines) {
      return translateCaptionLines(lines, translateCaption, displayMode);
    }

    async function refreshCaptions({ ignoreScriptCaptions = false } = {}) {
      const requestId = ++refreshRequestId;
      const nextSourceKey = getSourceKey();
      const nextHintKey = getHintKey();
      const sourceChanged = nextSourceKey !== lastSourceKey;
      const shouldIgnoreScriptCaptions =
        ignoreScriptCaptions ||
        sourceChanged ||
        hasConcreteVideoSourceKey(nextSourceKey);

      lastSourceKey = nextSourceKey;
      lastHintKey = nextHintKey;
      setStatus("正在读取字幕。");

      try {
        const currentVideoId = extractTikTokVideoId(nextSourceKey);
        const didRenderVideoInfo = await refreshVideoInfo(currentVideoId, nextSourceKey, requestId);

        if (!didRenderVideoInfo) {
          return;
        }

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
        applyDetailsHeightForCaptionCount(displayLines.length);

        if (sourceChanged) {
          panelParts.captionList.scrollTop = 0;
          panelParts.videoDetails.scrollTop = 0;
        }

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

    async function updateDisplayMode(nextDisplayMode, { persist = true } = {}) {
      const requestId = ++refreshRequestId;

      displayMode = normalizeDisplayMode(nextDisplayMode);
      updateModeButtons();
      if (persist) {
        await saveStoredOverlayValue(
          storageArea,
          DISPLAY_MODE_STORAGE_KEY,
          displayMode,
        );
      }
      currentDisplayLines = await createDisplayLines(currentLines);

      if (requestId !== refreshRequestId) {
        return;
      }

      renderCaptionLines({
        captionList: panelParts.captionList,
        documentRef,
        lines: currentDisplayLines,
      });
      applyDetailsHeightForCaptionCount(currentDisplayLines.length);
      setStatus(
        currentDisplayLines.length > 0
          ? `已读取 ${currentDisplayLines.length} 条字幕。`
          : "未检测到可读取字幕。",
      );
    }

    function getPointerDistance(state, event) {
      return Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    }

    function beginButtonDrag(event) {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      buttonDragState = {
        moved: false,
        pointerId: event.pointerId,
        startFrame: { ...buttonPosition },
        startX: event.clientX,
        startY: event.clientY,
      };
    }

    function moveButtonDrag(event) {
      if (!buttonDragState || event.pointerId !== buttonDragState.pointerId) {
        return;
      }

      event.preventDefault();

      if (
        !buttonDragState.moved &&
        getPointerDistance(buttonDragState, event) < DRAG_THRESHOLD_PX
      ) {
        return;
      }

      buttonDragState.moved = true;
      applyButtonPosition({
        x: buttonDragState.startFrame.x + event.clientX - buttonDragState.startX,
        y: buttonDragState.startFrame.y + event.clientY - buttonDragState.startY,
      });
    }

    async function endButtonDrag(event) {
      if (!buttonDragState || event.pointerId !== buttonDragState.pointerId) {
        return;
      }

      event.preventDefault();

      if (button.hasPointerCapture?.(event.pointerId)) {
        button.releasePointerCapture(event.pointerId);
      }

      if (buttonDragState.moved) {
        suppressNextButtonClick = true;
        await saveStoredOverlayValue(
          storageArea,
          BUTTON_POSITION_STORAGE_KEY,
          buttonPosition,
        );
      }

      buttonDragState = null;
    }

    function beginPanelDrag(event) {
      if (
        event.button !== 0 ||
        event.target?.closest?.("button")
      ) {
        return;
      }

      event.preventDefault();
      panelParts.header.setPointerCapture?.(event.pointerId);
      panelDragState = {
        moved: false,
        pointerId: event.pointerId,
        startFrame: { ...panelFrame },
        startX: event.clientX,
        startY: event.clientY,
      };
    }

    function movePanelDrag(event) {
      if (!panelDragState || event.pointerId !== panelDragState.pointerId) {
        return;
      }

      event.preventDefault();

      if (
        !panelDragState.moved &&
        getPointerDistance(panelDragState, event) < DRAG_THRESHOLD_PX
      ) {
        return;
      }

      panelDragState.moved = true;
      applyPanelFrame({
        ...panelDragState.startFrame,
        x: panelDragState.startFrame.x + event.clientX - panelDragState.startX,
        y: panelDragState.startFrame.y + event.clientY - panelDragState.startY,
      });
    }

    async function endPanelDrag(event) {
      if (!panelDragState || event.pointerId !== panelDragState.pointerId) {
        return;
      }

      event.preventDefault();

      if (panelParts.header.hasPointerCapture?.(event.pointerId)) {
        panelParts.header.releasePointerCapture(event.pointerId);
      }

      if (panelDragState.moved) {
        await saveStoredOverlayValue(
          storageArea,
          PANEL_FRAME_STORAGE_KEY,
          panelFrame,
        );
      }

      panelDragState = null;
    }

    function beginDetailsResize(event) {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      panelParts.detailsResizeHandle.setPointerCapture?.(event.pointerId);
      detailsResizeState = {
        moved: false,
        pointerId: event.pointerId,
        startHeight: activeDetailsHeight,
        startX: event.clientX,
        startY: event.clientY,
      };
    }

    function moveDetailsResize(event) {
      if (!detailsResizeState || event.pointerId !== detailsResizeState.pointerId) {
        return;
      }

      event.preventDefault();

      if (
        !detailsResizeState.moved &&
        getPointerDistance(detailsResizeState, event) < DRAG_THRESHOLD_PX
      ) {
        return;
      }

      detailsResizeState.moved = true;
      applyDetailsHeight(detailsResizeState.startHeight + event.clientY - detailsResizeState.startY);
    }

    async function endDetailsResize(event) {
      if (!detailsResizeState || event.pointerId !== detailsResizeState.pointerId) {
        return;
      }

      event.preventDefault();

      if (panelParts.detailsResizeHandle.hasPointerCapture?.(event.pointerId)) {
        panelParts.detailsResizeHandle.releasePointerCapture(event.pointerId);
      }

      if (detailsResizeState.moved) {
        savedDetailsHeight = activeDetailsHeight;
        await saveStoredOverlayValue(
          storageArea,
          DETAILS_HEIGHT_STORAGE_KEY,
          savedDetailsHeight,
        );
      }

      detailsResizeState = null;
    }

    function beginPanelResize(edge, handle, event) {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      handle.setPointerCapture?.(event.pointerId);
      panelResizeState = {
        edge,
        handle,
        moved: false,
        pointerId: event.pointerId,
        startFrame: { ...panelFrame },
        startX: event.clientX,
        startY: event.clientY,
      };
    }

    function movePanelResize(event) {
      if (!panelResizeState || event.pointerId !== panelResizeState.pointerId) {
        return;
      }

      event.preventDefault();

      if (
        !panelResizeState.moved &&
        getPointerDistance(panelResizeState, event) < DRAG_THRESHOLD_PX
      ) {
        return;
      }

      panelResizeState.moved = true;
      const deltaX = event.clientX - panelResizeState.startX;
      const deltaY = event.clientY - panelResizeState.startY;
      const nextFrame = { ...panelResizeState.startFrame };

      if (panelResizeState.edge === "right") {
        nextFrame.width = panelResizeState.startFrame.width + deltaX;
      }

      if (panelResizeState.edge === "left") {
        nextFrame.x = panelResizeState.startFrame.x + deltaX;
        nextFrame.width = panelResizeState.startFrame.width - deltaX;
      }

      if (panelResizeState.edge === "bottom") {
        nextFrame.height = panelResizeState.startFrame.height + deltaY;
      }

      if (panelResizeState.edge === "top") {
        nextFrame.y = panelResizeState.startFrame.y + deltaY;
        nextFrame.height = panelResizeState.startFrame.height - deltaY;
      }

      applyPanelFrame({
        ...nextFrame,
      });
    }

    async function endPanelResize(event) {
      if (!panelResizeState || event.pointerId !== panelResizeState.pointerId) {
        return;
      }

      event.preventDefault();

      if (panelResizeState.handle?.hasPointerCapture?.(event.pointerId)) {
        panelResizeState.handle.releasePointerCapture(event.pointerId);
      }

      if (panelResizeState.moved) {
        await saveStoredOverlayValue(
          storageArea,
          PANEL_FRAME_STORAGE_KEY,
          panelFrame,
        );
      }

      panelResizeState = null;
    }

    button.addEventListener("click", () => {
      if (suppressNextButtonClick) {
        suppressNextButtonClick = false;
        return Promise.resolve();
      }

      return setOpen(panelParts.panel.hidden);
    });
    for (const [mode, modeButton] of Object.entries(panelParts.modeButtons)) {
      modeButton.addEventListener("click", () => updateDisplayMode(mode));
    }
    panelParts.closeButton.addEventListener("click", () => setOpen(false));
    panelParts.refreshButton.addEventListener("click", refreshCaptionsWithRetryWindow);
    panelParts.copyButton.addEventListener("click", copyCaptions);
    button.addEventListener("pointerdown", beginButtonDrag);
    button.addEventListener("pointermove", moveButtonDrag);
    button.addEventListener("pointerup", endButtonDrag);
    button.addEventListener("pointercancel", () => {
      buttonDragState = null;
    });
    panelParts.header.addEventListener("pointerdown", beginPanelDrag);
    panelParts.header.addEventListener("pointermove", movePanelDrag);
    panelParts.header.addEventListener("pointerup", endPanelDrag);
    panelParts.header.addEventListener("pointercancel", () => {
      panelDragState = null;
    });
    panelParts.detailsResizeHandle.addEventListener("pointerdown", beginDetailsResize);
    panelParts.detailsResizeHandle.addEventListener("pointermove", moveDetailsResize);
    panelParts.detailsResizeHandle.addEventListener("pointerup", endDetailsResize);
    panelParts.detailsResizeHandle.addEventListener("pointercancel", () => {
      detailsResizeState = null;
    });
    for (const [edge, handle] of Object.entries(panelParts.resizeHandles)) {
      handle.addEventListener("pointerdown", (event) => beginPanelResize(edge, handle, event));
      handle.addEventListener("pointermove", movePanelResize);
      handle.addEventListener("pointerup", endPanelResize);
      handle.addEventListener("pointercancel", () => {
        panelResizeState = null;
      });
    }

    const overlay = {
      button,
      captionList: panelParts.captionList,
      closeButton: panelParts.closeButton,
      copyButton: panelParts.copyButton,
      detailsResizeHandle: panelParts.detailsResizeHandle,
      languageWarning: panelParts.languageWarning,
      modeButtons: panelParts.modeButtons,
      destroy() {
        stopAutoRefresh();
        root.remove();
      },
      navigator: navigatorRef,
      panel: panelParts.panel,
      panelHeader: panelParts.header,
      potentialBadge: panelParts.potentialBadge,
      ready,
      refreshButton: panelParts.refreshButton,
      refreshCaptions,
      refreshCaptionsIfSourceChanged,
      resizeHandle: panelParts.resizeHandle,
      resizeHandles: panelParts.resizeHandles,
      root,
      status: panelParts.status,
      videoDetails: panelParts.videoDetails,
      detailsOriginal: panelParts.detailsOriginal,
      detailsTranslation: panelParts.detailsTranslation,
      actions: panelParts.actions,
      modeGroup: panelParts.modeGroup,
      videoInfo: panelParts.videoInfo,
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
