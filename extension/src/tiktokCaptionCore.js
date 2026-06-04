(() => {
  const ROOT_CLASS = "msj-tiktok-caption-root";
  const OPEN_CLASS = "is-open";
  const CARD_METRICS_ROOT_CLASS = "msj-tiktok-card-metrics";
  const CARD_FILTER_ROOT_CLASS = "msj-tiktok-card-filter";
  const CARD_FILTER_HIDDEN_CLASS = "msj-tiktok-card-filter-hidden";
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
  const TIKTOK_CARD_METRIC_SCAN_INTERVAL_MS = 1000;
  const TIKTOK_CARD_LOAD_MORE_RESTORE_DELAY_MS = 100;
  const TIKTOK_CARD_FILTER_CARD_SELECTOR = [
    "div[class*='-DivItemContainerV2']",
    "div[class*='-DivItemContainerForSearch']",
    "div[id*='grid-item-container']",
    "[data-e2e='search_top-item']",
    "[data-e2e='search_video-item']",
    "[data-e2e='challenge-item']",
    "[data-e2e='music-item']",
  ].join(",");
  const TIKTOK_CARD_METRIC_PROFILE_SELECTORS = Object.freeze([
    "div[class*='-DivItemContainerV2'] div[class*='-DivWrapper'] a[href*='com/@']",
  ]);
  const TIKTOK_CARD_METRIC_SURFACE_SELECTORS = Object.freeze({
    collection: TIKTOK_CARD_METRIC_PROFILE_SELECTORS,
    liked: TIKTOK_CARD_METRIC_PROFILE_SELECTORS,
    music: [
      "[data-e2e='music-item-list'] [data-e2e='music-item']",
    ],
    profile: TIKTOK_CARD_METRIC_PROFILE_SELECTORS,
    search: [
      "div[class*='-DivPanelContainer'] > div[class*='-DivThreeColumnContainer'] > [data-e2e='search_top-item-list'] > div[id*='grid-item-container-0'] [data-e2e='search_top-item']",
      "[data-e2e='search_top-item-list'] [data-e2e='search_top-item']",
      "[data-e2e='search_video-item-list'] [data-e2e='search_video-item']",
    ],
    tag: [
      "[data-e2e='challenge-item-list'] [data-e2e='challenge-item']",
    ],
  });
  const TIKTOK_CARD_METRIC_TAB_SELECTOR = [
    "[aria-selected='true']",
    "[aria-current='page']",
    "[data-e2e*='liked' i]",
    "[data-e2e*='favorite' i]",
    "[data-e2e*='collection' i]",
    "[id*='liked' i]",
    "[id*='favorite' i]",
    "[id*='collection' i]",
  ].join(",");
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
  const AUTO_OPEN_STORAGE_KEY = "tiktokCaptionAutoOpenEnabled";
  const FONT_SCALE_STORAGE_KEY = "tiktokCaptionFontScale";
  const BUTTON_POSITION_STORAGE_KEY = "tiktokCaptionButtonPosition";
  const PANEL_FRAME_STORAGE_KEY = "tiktokCaptionPanelFrame";
  const DETAILS_HEIGHT_STORAGE_KEY = "tiktokCaptionDetailsHeight";
  const DEFAULT_DISPLAY_MODE = DISPLAY_MODES.bilingual;
  const DEFAULT_NON_ENGLISH_WARNING_ENABLED = true;
  const DEFAULT_AUTO_OPEN_ENABLED = false;
  const DEFAULT_FONT_SCALE = 100;
  const MIN_FONT_SCALE = 80;
  const MAX_FONT_SCALE = 160;
  const FONT_SCALE_STEP = 10;
  const MIN_PANEL_WIDTH = 280;
  const MIN_PANEL_HEIGHT = 260;
  const DEFAULT_PANEL_WIDTH = 360;
  const DEFAULT_PANEL_HEIGHT = 560;
  const DEFAULT_DETAILS_HEIGHT = 84;
  const MIN_DETAILS_HEIGHT = 56;
  const MAX_DETAILS_HEIGHT = 220;
  const LONG_CAPTION_DETAILS_LINE_THRESHOLD = 4;
  const BUTTON_SIZE = 30;
  const BUTTON_RIGHT_OFFSET = 8;
  const DRAG_THRESHOLD_PX = 6;
  const HIGH_POTENTIAL_LIKES_PER_HOUR = 10000;
  const MID_POTENTIAL_LIKES_PER_HOUR = 5000;
  const UNKNOWN_METRIC_LABEL = "—";
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
  const DOM_VIDEO_DETAIL_SELECTOR = [
    "[data-e2e*='video-desc' i]",
    "[class*='video-desc' i]",
    "[class*='VideoDesc' i]",
  ].join(",");
  const DOM_VIDEO_AUTHOR_SELECTOR = [
    "[data-e2e*='author' i]",
    "[data-e2e*='username' i]",
    "[class*='author' i]",
    "[class*='Author' i]",
    "[class*='username' i]",
    "[class*='Username' i]",
  ].join(",");
  const DOM_METRIC_SELECTOR = [
    "button",
    "[role='button']",
    "[aria-label]",
    "[title]",
    "span",
    "div",
  ].join(",");
  const tikTokApiItemCache = new Map();
  const activeTikTokCaptionOverlays = new Set();
  const activeTikTokCardMetricsOverlays = new Set();

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

  function isLikelyPlayingVideo(video) {
    return video?.paused === false && video?.ended !== true;
  }

  function getActiveVideo(root) {
    let activeVideo = null;
    let activePlaybackScore = 0;
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
      const playbackScore = isLikelyPlayingVideo(video) ? 1 : 0;

      if (viewportRect && (visibleArea <= 0 || !isRectCenterInsideRect(rect, viewportRect))) {
        continue;
      }

      if (
        playbackScore > activePlaybackScore ||
        (playbackScore === activePlaybackScore && visibleArea > activeVisibleArea) ||
        (playbackScore === activePlaybackScore && visibleArea === activeVisibleArea && distance < activeDistance) ||
        (
          playbackScore === activePlaybackScore &&
          visibleArea === activeVisibleArea &&
          distance === activeDistance &&
          area > activeArea
        )
      ) {
        activePlaybackScore = playbackScore;
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

  function extractVisibleTikTokAuthorId(value) {
    const text = normalizeCaptionText(value);

    if (!text) {
      return "";
    }

    const mentionMatch = text.match(/@([a-zA-Z0-9._]{2,32})/u);

    if (mentionMatch) {
      return normalizeTikTokAuthorId(mentionMatch[1]);
    }

    const firstToken = text.split(/\s+/u)[0];

    if (/^[a-zA-Z0-9._]{2,32}$/u.test(firstToken)) {
      return normalizeTikTokAuthorId(firstToken);
    }

    return "";
  }

  function isLikelyAuthorNode(node) {
    const marker = normalizeCaptionText(
      [
        node?.getAttribute?.("data-e2e"),
        node?.getAttribute?.("class"),
        node?.className,
      ]
        .filter(Boolean)
        .join(" "),
    );

    return /\b(?:author|username|uniqueid)\b/iu.test(marker);
  }

  function getActiveVideoAuthorTextId(root, activeVideoRect) {
    let closestAuthorId = "";
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const node of root?.querySelectorAll?.(DOM_VIDEO_AUTHOR_SELECTOR) ?? []) {
      if (isHiddenNode(node) || isExtensionNode(node) || !isLikelyAuthorNode(node)) {
        continue;
      }

      const authorId = extractVisibleTikTokAuthorId(node.textContent);
      const rect = getNodeRect(node);

      if (!authorId || !rect) {
        continue;
      }

      if (isNodeInsideRect(node, activeVideoRect)) {
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

  function getActiveVideoAuthorId(root) {
    const visibleAuthorCandidate = getVisibleMainAuthorCandidate(root);

    if (visibleAuthorCandidate?.authorId) {
      return visibleAuthorCandidate.authorId;
    }

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

    return getActiveVideoAuthorTextId(root, activeVideoRect) || closestAuthorId;
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

  function isRectInMainContentColumn(rect, viewportRect) {
    if (!rect || !viewportRect) {
      return false;
    }

    const centerX = rect.left + rect.width / 2;

    if (viewportRect.width < 900) {
      return true;
    }

    return centerX >= viewportRect.width * 0.24 && centerX <= viewportRect.width * 0.86;
  }

  function getVisibleMainAuthorCandidate(root) {
    const viewportRect = getViewportRect(root);
    let bestCandidate = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    if (!viewportRect) {
      return null;
    }

    const candidateNodes = [
      ...(root?.querySelectorAll?.("a[href*='/@']") ?? []),
      ...(root?.querySelectorAll?.(DOM_VIDEO_AUTHOR_SELECTOR) ?? []),
    ];

    for (const node of candidateNodes) {
      if (isHiddenNode(node) || isExtensionNode(node)) {
        continue;
      }

      if (!node.href && !isLikelyAuthorNode(node)) {
        continue;
      }

      const authorId = node.href
        ? extractTikTokAuthorId(node.href || node.getAttribute?.("href") || "")
        : extractVisibleTikTokAuthorId(node.textContent);
      const rect = getNodeRect(node);

      if (
        !authorId ||
        !rect ||
        getRectIntersectionArea(rect, viewportRect) <= 0 ||
        !isRectCenterInsideRect(rect, viewportRect) ||
        !isRectInMainContentColumn(rect, viewportRect)
      ) {
        continue;
      }

      const distance = getRectCenterDistance(rect, viewportRect);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestCandidate = { authorId, rect };
      }
    }

    return bestCandidate;
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

  function getTikTokItemAuthorUniqueId(item) {
    return normalizeCaptionText(
      item?.author?.uniqueId ||
        item?.author?.unique_id ||
        item?.author?.unique_id_str ||
        item?.authorInfo?.uniqueId ||
        item?.authorInfo?.unique_id ||
        "",
    ).replace(/^@/u, "");
  }

  function getFirstStringValue(...values) {
    for (const value of values) {
      if (typeof value === "string" && normalizeCaptionText(value)) {
        return normalizeCaptionText(value);
      }

      if (Array.isArray(value)) {
        const nestedValue = getFirstStringValue(...value);

        if (nestedValue) {
          return nestedValue;
        }
      }

      if (value && typeof value === "object") {
        const nestedValue = getFirstStringValue(
          value.url,
          value.Url,
          value.uri,
          value.src,
          value.urlList,
          value.UrlList,
        );

        if (nestedValue) {
          return nestedValue;
        }
      }
    }

    return "";
  }

  function getTikTokItemAuthorInfo(item) {
    const author = item?.author || item?.authorInfo || {};
    const uniqueId = getTikTokItemAuthorUniqueId(item);
    const name = normalizeCaptionText(
      author.nickname ||
        author.nickName ||
        author.name ||
        author.displayName ||
        uniqueId,
    );
    const profileUrl = uniqueId ? `https://www.tiktok.com/@${encodeURIComponent(uniqueId)}` : "";
    const avatarUrl = getFirstStringValue(
      author.avatarLarger,
      author.avatarMedium,
      author.avatarThumb,
      author.avatarUrl,
      author.avatar_url,
      author.avatar,
      author.avatarUri,
    );

    return {
      avatarUrl,
      name,
      profileUrl,
      uniqueId,
    };
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

    const match = text.match(/^([\d,.]+)\s*(千万|百万|千|[kKmMwW万]?)$/u);

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

    if (unit === "千万") {
      return numeric * 10000000;
    }

    if (unit === "百万") {
      return numeric * 1000000;
    }

    if (unit === "千") {
      return numeric * 1000;
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

  function getNodeMetricText(node) {
    return normalizeCaptionText(
      [
        node?.getAttribute?.("aria-label"),
        node?.getAttribute?.("title"),
        node?.textContent,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  function getMetricValuesFromText(value) {
    const text = normalizeCaptionText(value);
    const metrics = [];

    for (const match of text.matchAll(/(?:^|[^\d])([\d,.]+)\s*(千万|百万|千|[kKmMwW万]?)(?!\s*%)/gu)) {
      const metric = parseMetricNumber(`${match[1]}${match[2] ?? ""}`);

      if (metric > 0) {
        metrics.push(metric);
      }
    }

    return metrics;
  }

  function getLargestMetricValue(value) {
    return Math.max(0, ...getMetricValuesFromText(value));
  }

  function isMetricOnlyText(value) {
    return /^([\d,.]+)\s*(千万|百万|千|[kKmMwW万]?)$/u.test(normalizeCaptionText(value));
  }

  function isRectNearActiveVideo(rect, activeVideoRect) {
    if (!rect || !activeVideoRect) {
      return false;
    }

    return (
      rect.bottom >= activeVideoRect.top - 80 &&
      rect.top <= activeVideoRect.bottom + 80 &&
      rect.right >= activeVideoRect.left - 180 &&
      rect.left <= activeVideoRect.right + 320
    );
  }

  function isRectInVideoOverlayColumn(rect, activeVideoRect) {
    if (!rect || !activeVideoRect) {
      return false;
    }

    return (
      rect.left >= activeVideoRect.left - 180 &&
      rect.right <= activeVideoRect.right + 80
    );
  }

  function getVisibleTikTokDomMetrics(root) {
    const activeVideoRect = getActiveVideoRect(root);
    let hasVidIQ = false;
    let likeCount = 0;
    let playCount = 0;
    let vidIQPlayCount = 0;
    const vidIQMetricOnlyValues = [];
    const metricOnlyValues = [];

    for (const node of root?.querySelectorAll?.(DOM_METRIC_SELECTOR) ?? []) {
      if (isHiddenNode(node) || isExtensionNode(node)) {
        continue;
      }

      const rect = getNodeRect(node);

      if (activeVideoRect && !isRectNearActiveVideo(rect, activeVideoRect)) {
        continue;
      }

      const text = getNodeMetricText(node);

      if (!text) {
        continue;
      }

      const metric = getLargestMetricValue(text);

      if (/vidiq/iu.test(text)) {
        hasVidIQ = true;
        vidIQPlayCount = Math.max(vidIQPlayCount, metric);
      }

      if (/(?:点赞|个赞|\blikes?\b)/iu.test(text)) {
        likeCount = Math.max(likeCount, metric);
      }

      if (/(?:播放量|次播放|观看次数|\bviews?\b|\bplays?\b)/iu.test(text)) {
        playCount = Math.max(playCount, metric);
      }

      if (isMetricOnlyText(text)) {
        if (!activeVideoRect || isRectInVideoOverlayColumn(rect, activeVideoRect)) {
          vidIQMetricOnlyValues.push(metric);
        }

        metricOnlyValues.push(metric);
      }
    }

    if (!playCount && hasVidIQ) {
      playCount = Math.max(vidIQPlayCount, ...vidIQMetricOnlyValues, ...metricOnlyValues);
    }

    return { likeCount, playCount };
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

  function getFirstPositiveNumber(...values) {
    for (const value of values) {
      const numericValue = Number(value);

      if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue;
      }
    }

    return 0;
  }

  function getTikTokItemDurationSeconds(item) {
    const explicitSeconds = getFirstPositiveNumber(
      item?.video?.durationSeconds,
      item?.video?.duration_seconds,
      item?.video?.durationSecond,
      item?.video?.duration_second,
      item?.durationSeconds,
      item?.duration_seconds,
      item?.durationSecond,
      item?.duration_second,
    );

    if (explicitSeconds > 0) {
      return explicitSeconds;
    }

    const explicitMilliseconds = getFirstPositiveNumber(
      item?.video?.durationMs,
      item?.video?.duration_ms,
      item?.video?.durationMillis,
      item?.video?.duration_millis,
      item?.durationMs,
      item?.duration_ms,
      item?.durationMillis,
      item?.duration_millis,
    );

    if (explicitMilliseconds > 0) {
      return explicitMilliseconds / 1000;
    }

    return getFirstPositiveNumber(item?.video?.duration, item?.duration);
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

  function cleanVisibleVideoDescription(value) {
    return normalizeCaptionText(value)
      .replace(/\b查看更多\b/gu, " ")
      .replace(/\b更多\b/gu, " ")
      .replace(/\b查看翻译\b/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
  }

  function getVisibleVideoDescription(root) {
    const visibleAuthorCandidate = getVisibleMainAuthorCandidate(root);
    const activeVideoRect = visibleAuthorCandidate?.rect || getActiveVideoRect(root);
    let closestDescription = "";
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const node of root?.querySelectorAll?.(DOM_VIDEO_DETAIL_SELECTOR) ?? []) {
      if (isHiddenNode(node) || isExtensionNode(node)) {
        continue;
      }

      const description = cleanVisibleVideoDescription(node.textContent);

      if (!description) {
        continue;
      }

      const rect = getNodeRect(node);

      if (activeVideoRect && rect && isNodeInsideRect(node, activeVideoRect)) {
        return description;
      }

      const distance = getRectDistance(activeVideoRect, rect);

      if (!activeVideoRect || !rect || distance < closestDistance) {
        closestDistance = distance;
        closestDescription = description;
      }
    }

    return closestDescription;
  }

  function getVisibleTikTokDomFallbackItem(root) {
    const description = getVisibleVideoDescription(root);
    const metrics = getVisibleTikTokDomMetrics(root);

    if (!description) {
      return null;
    }

    return {
      __msjDomFallback: true,
      author: {
        uniqueId: getActiveVideoAuthorId(root),
      },
      desc: description,
      stats: {
        diggCount: metrics.likeCount,
        playCount: metrics.playCount,
      },
    };
  }

  function isTikTokItemCompatibleWithActiveContext(root, item) {
    const activeAuthorId = getActiveVideoAuthorId(root);
    const itemAuthorId = getTikTokItemAuthorId(item);

    if (activeAuthorId && itemAuthorId && activeAuthorId !== itemAuthorId) {
      return false;
    }

    return true;
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

  function collectTikTokItemCaptionEntries(item, entries, seen) {
    const subtitleUrl = findSubtitleUrlFromTikTokItem(item);

    if (subtitleUrl) {
      appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.url, subtitleUrl);
    }

    if (!subtitleUrl && isTikTokImageItem(item)) {
      appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.text, getTikTokImageCaptionText(item));
    }
  }

  function collectTikTokApiCaptionEntries(currentVideoId, entries, seen) {
    collectTikTokItemCaptionEntries(
      tikTokApiItemCache.get(normalizeCaptionText(currentVideoId)),
      entries,
      seen,
    );
  }

  async function findTikTokApiItemByHints(root, fetchCaption) {
    if (!fetchCaption || tikTokApiItemCache.size === 0) {
      return null;
    }

    const hintKeys = collectDomCaptionHintLines(root)
      .map(normalizeCaptionMatchKey)
      .filter(Boolean);

    if (hintKeys.length === 0) {
      return null;
    }

    const recentItems = Array.from(tikTokApiItemCache.values())
      .slice(-TIKTOK_API_HINT_ITEM_LIMIT)
      .reverse()
      .filter((item) => isTikTokItemCompatibleWithActiveContext(root, item));

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
          return item;
        }
      }
    }

    return null;
  }

  async function collectTikTokApiCaptionEntriesByHints(root, fetchCaption, entries, seen) {
    collectTikTokItemCaptionEntries(
      await findTikTokApiItemByHints(root, fetchCaption),
      entries,
      seen,
    );
  }

  function findTikTokApiItemByActiveContext(root) {
    if (tikTokApiItemCache.size === 0) {
      return null;
    }

    const activeAuthorId = getActiveVideoAuthorId(root);

    if (!activeAuthorId) {
      return null;
    }

    const matchingItems = Array.from(tikTokApiItemCache.values())
      .slice(-TIKTOK_API_HINT_ITEM_LIMIT)
      .reverse()
      .filter((item) => getTikTokItemAuthorId(item) === activeAuthorId);

    if (matchingItems.length !== 1) {
      return null;
    }

    return findSubtitleUrlFromTikTokItem(matchingItems[0]) ? matchingItems[0] : null;
  }

  function collectTikTokApiCaptionEntriesByActiveContext(root, entries, seen) {
    collectTikTokItemCaptionEntries(findTikTokApiItemByActiveContext(root), entries, seen);
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

  async function getTikTokVideoItem({ root, currentPageUrl, currentVideoId, fetchCaption }) {
    const cachedItem = getCachedTikTokItem(currentVideoId);

    if (cachedItem) {
      return cachedItem;
    }

    const normalizedVideoId = normalizeCaptionText(currentVideoId);
    const detailItem = await fetchTikTokDetailItem(currentPageUrl, normalizedVideoId, fetchCaption);

    if (detailItem) {
      return detailItem;
    }

    if (normalizedVideoId) {
      return getVisibleTikTokDomFallbackItem(root);
    }

    const hintItem = await findTikTokApiItemByHints(root, fetchCaption);

    if (hintItem) {
      return hintItem;
    }

    if (!getCaptionHintKeyFromRoot(root)) {
      return findTikTokApiItemByActiveContext(root) ?? getVisibleTikTokDomFallbackItem(root);
    }

    return getVisibleTikTokDomFallbackItem(root);
  }

  function formatMetricNumber(value) {
    return value.toFixed(1).replace(/\.0$/u, "");
  }

  function formatMetric(value) {
    const numericValue = Math.max(0, Number(value) || 0);
    const units = [
      { label: "千万", value: 10000000 },
      { label: "百万", value: 1000000 },
      { label: "万", value: 10000 },
      { label: "千", value: 1000 },
    ];

    for (const unit of units) {
      if (numericValue >= unit.value) {
        return `${formatMetricNumber(numericValue / unit.value)}${unit.label}`;
      }
    }

    return formatMetricNumber(numericValue);
  }

  function formatDurationDays(elapsedHours) {
    if (!Number.isFinite(elapsedHours) || elapsedHours <= 0) {
      return "0天";
    }

    const elapsedDays = elapsedHours / 24;

    if (elapsedDays > 0 && elapsedDays < 0.1) {
      return "<0.1天";
    }

    return `${formatMetricNumber(elapsedDays)}天`;
  }

  function getPotential(likesPerHour) {
    if (!Number.isFinite(likesPerHour)) {
      return { className: "", label: UNKNOWN_METRIC_LABEL };
    }

    if (likesPerHour >= HIGH_POTENTIAL_LIKES_PER_HOUR) {
      return { className: "is-high", label: "高" };
    }

    if (likesPerHour >= MID_POTENTIAL_LIKES_PER_HOUR) {
      return { className: "is-mid", label: "中" };
    }

    return { className: "is-low", label: "低" };
  }

  function getUnknownVideoMetrics(item) {
    const playCount = getTikTokItemPlayCount(item);

    return {
      author: getTikTokItemAuthorInfo(item),
      description: getTikTokItemDescription(item),
      durationLabel: UNKNOWN_METRIC_LABEL,
      durationSeconds: 0,
      elapsedHours: 0,
      language: getTikTokItemLanguage(item),
      likeRate: null,
      likeRateLabel: UNKNOWN_METRIC_LABEL,
      playCount,
      playCountLabel: playCount > 0 ? formatMetric(playCount) : UNKNOWN_METRIC_LABEL,
      playRate: null,
      playRateLabel: UNKNOWN_METRIC_LABEL,
      potential: { className: "", label: UNKNOWN_METRIC_LABEL },
    };
  }

  function getVideoMetrics(item, nowMs) {
    if (!item || item.__msjDomFallback) {
      return getUnknownVideoMetrics(item);
    }

    const playCount = getTikTokItemPlayCount(item);
    const likeCount = getTikTokItemLikeCount(item);
    const createTimeMs = getTikTokItemCreateTimeMs(item);
    const durationSeconds = getTikTokItemDurationSeconds(item);
    const elapsedMs = createTimeMs > 0 ? Math.max(0, nowMs - createTimeMs) : 0;
    const elapsedHours = elapsedMs > 0 ? elapsedMs / 3600000 : 0;
    const hasRate = createTimeMs > 0;
    const rateHours = Math.max(1, elapsedHours);
    const likeRate = hasRate ? likeCount / rateHours : null;
    const playRate = hasRate ? playCount / rateHours : null;
    const potential = getPotential(likeRate);

    return {
      author: getTikTokItemAuthorInfo(item),
      description: getTikTokItemDescription(item),
      durationLabel: hasRate ? formatDurationDays(elapsedHours) : UNKNOWN_METRIC_LABEL,
      durationSeconds,
      elapsedHours,
      language: getTikTokItemLanguage(item),
      likeRate,
      likeRateLabel: hasRate ? `${formatMetric(likeRate)}/h` : UNKNOWN_METRIC_LABEL,
      playCount,
      playCountLabel: formatMetric(playCount),
      playRate,
      playRateLabel: hasRate ? `${formatMetric(playRate)}/h` : UNKNOWN_METRIC_LABEL,
      potential,
    };
  }

  function getTikTokVideoMetricItems(metrics) {
    return [
      { icon: "♥", key: "like-rate", label: "每小时点赞量", value: metrics.likeRateLabel },
      { icon: "↗", key: "play-rate", label: "每小时播放量", value: metrics.playRateLabel },
      { icon: "▶", key: "play-count", label: "总播放量", value: metrics.playCountLabel },
      { icon: "⏱", key: "age", label: "天数", value: metrics.durationLabel },
    ];
  }

  function getTikTokWarningLabels(metrics, { nonEnglishWarningEnabled = true } = {}) {
    const labels = [];

    if (
      nonEnglishWarningEnabled &&
      metrics.language &&
      normalizeLanguageKey(metrics.language) !== "en"
    ) {
      labels.push("非英内容");
    }

    if (metrics.durationSeconds > 0 && metrics.durationSeconds < 60) {
      labels.push("时长<1分");
    }

    if (metrics.elapsedHours > 24) {
      labels.push("发布>1天");
    }

    return labels;
  }

  function formatTikTokCardCompactNumber(value) {
    const numericValue = Math.max(0, Number(value) || 0);
    const units = [
      { label: "B", value: 1000000000 },
      { label: "M", value: 1000000 },
      { label: "K", value: 1000 },
    ];

    for (const unit of units) {
      if (numericValue >= unit.value) {
        return `${formatMetricNumber(numericValue / unit.value)}${unit.label}`;
      }
    }

    return formatMetricNumber(numericValue);
  }

  function formatTikTokCardRate(value) {
    if (!Number.isFinite(value)) {
      return UNKNOWN_METRIC_LABEL;
    }

    return `${formatTikTokCardCompactNumber(value)}/h`;
  }

  function formatTikTokCardElapsedDays(elapsedHours) {
    if (!Number.isFinite(elapsedHours)) {
      return UNKNOWN_METRIC_LABEL;
    }

    const elapsedDays = Math.max(0, elapsedHours) / 24;

    if (elapsedDays > 0 && elapsedDays < 0.1) {
      return "<0.1d";
    }

    return `${formatMetricNumber(elapsedDays)}d`;
  }

  function formatTikTokCardPotentialLabel(potential) {
    if (potential?.className === "is-high") {
      return "High";
    }

    if (potential?.className === "is-mid") {
      return "Mid";
    }

    if (potential?.className === "is-low") {
      return "Low";
    }

    return UNKNOWN_METRIC_LABEL;
  }

  function getTikTokCardVideoMetricItems(metrics) {
    return [
      {
        icon: "potential",
        key: "potential",
        label: "权重评价",
        value: formatTikTokCardPotentialLabel(metrics.potential),
      },
      {
        icon: "♥",
        key: "like-rate",
        label: "每小时点赞量",
        value: formatTikTokCardRate(metrics.likeRate),
      },
      {
        icon: "▶",
        key: "play-count",
        label: "总播放量",
        value: formatTikTokCardCompactNumber(metrics.playCount),
      },
      {
        icon: "↗",
        key: "play-rate",
        label: "每小时播放量",
        value: formatTikTokCardRate(metrics.playRate),
      },
      {
        icon: "⏱",
        key: "age",
        label: "视频已发布时长",
        value: formatTikTokCardElapsedDays(metrics.elapsedHours),
      },
    ];
  }

  function getTikTokCardWarningLabels(metrics) {
    const labels = [];

    if (metrics.durationSeconds > 0 && metrics.durationSeconds < 60) {
      labels.push("!<1m");
    }

    if (metrics.elapsedHours > 24) {
      labels.push("!>1d");
    }

    if (
      metrics.language &&
      normalizeLanguageKey(metrics.language) !== "en"
    ) {
      labels.push("!Non-EN");
    }

    return labels;
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
      resolvedItem = null,
    } = {},
  ) {
    const apiEntries = [];
    const apiSeen = new Set();

    if (resolvedItem) {
      collectTikTokItemCaptionEntries(resolvedItem, apiEntries, apiSeen);
    } else {
      collectTikTokApiCaptionEntries(currentVideoId, apiEntries, apiSeen);
    }

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

  function getDefaultSetTimeout() {
    return globalThis.window?.setTimeout?.bind(globalThis.window) ?? null;
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

  function normalizeFontScale(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return DEFAULT_FONT_SCALE;
    }

    const clampedValue = clampNumber(numericValue, MIN_FONT_SCALE, MAX_FONT_SCALE);

    return Math.round(clampedValue / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  }

  async function getStoredOverlaySettings(storageArea) {
    if (!storageArea?.get) {
      return {
        autoOpenEnabled: DEFAULT_AUTO_OPEN_ENABLED,
        buttonPosition: null,
        detailsHeight: DEFAULT_DETAILS_HEIGHT,
        displayMode: DEFAULT_DISPLAY_MODE,
        fontScale: DEFAULT_FONT_SCALE,
        nonEnglishWarningEnabled: DEFAULT_NON_ENGLISH_WARNING_ENABLED,
        panelFrame: null,
      };
    }

    const values = await storageArea.get([
      BUTTON_POSITION_STORAGE_KEY,
      DETAILS_HEIGHT_STORAGE_KEY,
      DISPLAY_MODE_STORAGE_KEY,
      AUTO_OPEN_STORAGE_KEY,
      FONT_SCALE_STORAGE_KEY,
      NON_ENGLISH_WARNING_STORAGE_KEY,
      PANEL_FRAME_STORAGE_KEY,
    ]);

    return {
      autoOpenEnabled: normalizeBooleanSetting(
        values?.[AUTO_OPEN_STORAGE_KEY],
        DEFAULT_AUTO_OPEN_ENABLED,
      ),
      buttonPosition: values?.[BUTTON_POSITION_STORAGE_KEY] ?? null,
      detailsHeight: normalizeDetailsHeight(values?.[DETAILS_HEIGHT_STORAGE_KEY]),
      displayMode: normalizeDisplayMode(values?.[DISPLAY_MODE_STORAGE_KEY]),
      fontScale: normalizeFontScale(values?.[FONT_SCALE_STORAGE_KEY]),
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
      x: Math.round(viewport.width - BUTTON_SIZE - BUTTON_RIGHT_OFFSET),
      y: Math.round(viewport.height * 0.42),
    };
  }

  function normalizeButtonPosition(position, documentRef) {
    const viewport = getViewportSize(documentRef);
    const fallback = getDefaultButtonPosition(documentRef);

    return {
      x: Math.round(viewport.width - BUTTON_SIZE - BUTTON_RIGHT_OFFSET),
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
    const visibleAuthorId = getVisibleMainAuthorCandidate(root)?.authorId || "";

    return `${baseSourceKey}|${activeVideoSource}|${activeVideoLink}|${activeAuthorId}|${visibleAuthorId}`;
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

  function setElementClassName(element, className) {
    element.className = className;
    element.classList?.add?.(...className.split(/\s+/u).filter(Boolean));
  }

  function getDocumentLocationHref(documentRef) {
    return normalizeCaptionText(
      documentRef?.location?.href || globalThis.location?.href || "",
    );
  }

  function getTikTokMetricsSurfaceFromMarker(value) {
    const marker = normalizeCaptionText(value).toLocaleLowerCase();

    if (!marker) {
      return "";
    }

    if (/\bliked?\b|liked-tab|favorite-like/u.test(marker)) {
      return "liked";
    }

    if (/\bfavorites?\b|collection|collect/u.test(marker)) {
      return "collection";
    }

    return "";
  }

  function getTikTokMetricsSurfaceFromUrl(value) {
    const text = String(value ?? "");

    if (!/\/@[^/?#]+/u.test(text)) {
      return "";
    }

    const lowerText = text.toLocaleLowerCase();

    if (/(?:[?&#/]|%2f)(?:tab|showtab|type|section|surface)?=?liked(?:[&#/]|$)/u.test(lowerText)) {
      return "liked";
    }

    if (/(?:[?&#/]|%2f)(?:tab|showtab|type|section|surface)?=?(?:collection|collect|favorites)(?:[&#/]|$)/u.test(lowerText)) {
      return "collection";
    }

    return "";
  }

  function isTikTokProfilePage(documentRef, rootRef) {
    const href = getDocumentLocationHref(documentRef);

    if (href) {
      return /\/@[^/?#]+/u.test(href);
    }

    return Boolean(rootRef?.querySelector?.("a[href*='/@']"));
  }

  function getTikTokTabNodeMarker(node) {
    return [
      node?.getAttribute?.("id"),
      node?.id,
      node?.getAttribute?.("data-e2e"),
      node?.getAttribute?.("aria-label"),
      node?.getAttribute?.("title"),
      node?.getAttribute?.("href"),
      node?.href,
      node?.getAttribute?.("class"),
      node?.className,
      node?.textContent,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function isLikelyActiveTikTokTabNode(node) {
    const activeMarker = normalizeCaptionText(
      [
        node?.getAttribute?.("aria-selected"),
        node?.getAttribute?.("aria-current"),
        node?.getAttribute?.("data-active"),
        node?.getAttribute?.("data-state"),
        node?.getAttribute?.("tabindex"),
        node?.getAttribute?.("class"),
        node?.className,
      ]
        .filter(Boolean)
        .join(" "),
    ).toLocaleLowerCase();

    return (
      /\btrue\b|\bpage\b|\bactive\b|\bselected\b/u.test(activeMarker) ||
      activeMarker === "0"
    );
  }

  function getTikTokPagePathname(documentRef) {
    const href = getDocumentLocationHref(documentRef);

    if (!href) {
      return "";
    }

    try {
      return new URL(href).pathname;
    } catch {
      return "";
    }
  }

  function getTikTokActiveProfileMetricSurface(rootRef) {
    for (const node of rootRef?.querySelectorAll?.(TIKTOK_CARD_METRIC_TAB_SELECTOR) ?? []) {
      if (isHiddenNode(node) || !isLikelyActiveTikTokTabNode(node)) {
        continue;
      }

      const nodeSurface = getTikTokMetricsSurfaceFromMarker(getTikTokTabNodeMarker(node));

      if (nodeSurface) {
        return nodeSurface;
      }
    }

    return "";
  }

  function getTikTokCardMetricsSurface(documentRef, rootRef = documentRef) {
    const pathname = getTikTokPagePathname(documentRef);

    if (/^\/search(?:\/|$)/u.test(pathname)) {
      return "search";
    }

    if (/^\/tag\/[^/]+/u.test(pathname)) {
      return "tag";
    }

    if (/^\/music\/[^/]+/u.test(pathname)) {
      return "music";
    }

    if (/^\/@[^/]+\/collection(?:\/|$)/u.test(pathname)) {
      return "collection";
    }

    if (/^\/@[^/]+\/(?:video|photo)\/\d{5,}/u.test(pathname)) {
      return "";
    }

    if (!isTikTokProfilePage(documentRef, rootRef)) {
      return "";
    }

    const urlSurface = getTikTokMetricsSurfaceFromUrl(getDocumentLocationHref(documentRef));

    if (urlSurface) {
      return urlSurface;
    }

    return getTikTokActiveProfileMetricSurface(rootRef) || "profile";
  }

  function getTikTokCardMetricTargetHref(target) {
    return normalizeCaptionText(target?.href || target?.getAttribute?.("href") || "");
  }

  function findTikTokCardMetricLink(target) {
    if (extractTikTokVideoId(getTikTokCardMetricTargetHref(target))) {
      return target;
    }

    return target?.querySelector?.(
      "a[href*='com/@'], a[href*='/video/'], a[href*='/photo/']",
    ) ?? null;
  }

  function collectTikTokCardMetricTargets(rootRef, surface) {
    const targets = [];
    const seen = new Set();
    const selectors = TIKTOK_CARD_METRIC_SURFACE_SELECTORS[surface] ?? [];

    for (const selector of selectors) {
      for (const target of rootRef?.querySelectorAll?.(selector) ?? []) {
        const link = findTikTokCardMetricLink(target);
        const href = normalizeCaptionText(link?.href || link?.getAttribute?.("href") || "");
        const itemId = extractTikTokVideoId(href);

        if (!itemId || seen.has(target)) {
          continue;
        }

        seen.add(target);
        targets.push({
          itemId,
          link,
          target,
        });
      }
    }

    return targets;
  }

  function collectAllTikTokCardMetricTargets(rootRef) {
    const targets = [];
    const seen = new Set();

    for (const surface of Object.keys(TIKTOK_CARD_METRIC_SURFACE_SELECTORS)) {
      for (const target of collectTikTokCardMetricTargets(rootRef, surface)) {
        if (seen.has(target.target)) {
          continue;
        }

        seen.add(target.target);
        targets.push(target);
      }
    }

    return targets;
  }

  function findTikTokCardMetricsRoot(cardTarget) {
    const directMatch = Array.from(cardTarget?.children ?? []).find((child) =>
      child?.classList?.contains?.(CARD_METRICS_ROOT_CLASS),
    );

    return directMatch || cardTarget?.querySelector?.(`.${CARD_METRICS_ROOT_CLASS}`) || null;
  }

  function clearTikTokCardMetricTargetState(cardTarget) {
    if (!cardTarget?.dataset) {
      return;
    }

    delete cardTarget.dataset.msjTikTokCardMetricsRendered;
    delete cardTarget.dataset.msjTikTokCardMetricsSignature;
  }

  function removeTikTokCardMetricsRoot(cardTarget) {
    const metricsRoot = findTikTokCardMetricsRoot(cardTarget);

    if (!metricsRoot) {
      clearTikTokCardMetricTargetState(cardTarget);
      return;
    }

    clearTikTokCardMetricTargetState(cardTarget);

    if (Array.isArray(cardTarget?.children)) {
      const index = cardTarget.children.indexOf(metricsRoot);

      if (index >= 0) {
        cardTarget.children.splice(index, 1);
        return;
      }
    }

    metricsRoot.remove?.();
  }

  function clearTikTokCardMetrics(rootRef) {
    let removedCount = 0;

    for (const target of collectAllTikTokCardMetricTargets(rootRef)) {
      if (findTikTokCardMetricsRoot(target.target)) {
        removeTikTokCardMetricsRoot(target.target);
        removedCount += 1;
      }
    }

    return removedCount;
  }

  function appendTikTokCardMetric(metrics, metric) {
    if (!metric.value) {
      return;
    }

    metrics.push(metric);
  }

  function getTikTokCardMetricGroups(item, nowMs) {
    const metrics = getVideoMetrics(item, nowMs);
    const metricItems = getTikTokCardVideoMetricItems(metrics);
    const warningLabels = getTikTokCardWarningLabels(metrics);
    const left = [];
    const right = [];

    for (const metric of metricItems) {
      appendTikTokCardMetric(left, metric);
    }

    for (const label of warningLabels) {
      appendTikTokCardMetric(right, {
        icon: "",
        key: `warning-${label}`,
        label,
        value: label,
      });
    }

    return { left, right };
  }

  function getDefaultTikTokCardFilterCriteria() {
    return {
      excludeNonEnglish: false,
      excludeOld: false,
      excludeShort: false,
      keyword: "",
      likeRatePreset: "",
      maxAgeDays: null,
      maxCreateDate: "",
      maxLikeRate: null,
      maxPlayCount: null,
      maxPlayRate: null,
      minAgeDays: null,
      minCreateDate: "",
      minLikeRate: null,
      minPlayCount: null,
      minPlayRate: null,
      potential: "",
    };
  }

  function normalizeTikTokCardFilterNumber(value) {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const normalizedValue = String(value)
      .trim()
      .replace(/,/gu, "")
      .replace(/\s+/gu, "")
      .replace(/每小时|\/h|次|播放|点赞/giu, "")
      .toLowerCase();

    if (!normalizedValue) {
      return null;
    }

    const unitMultipliers = [
      [/^(-?\d+(?:\.\d+)?)(千万)$/u, 10000000],
      [/^(-?\d+(?:\.\d+)?)(百万)$/u, 1000000],
      [/^(-?\d+(?:\.\d+)?)(万|w)$/u, 10000],
      [/^(-?\d+(?:\.\d+)?)(m)$/u, 1000000],
      [/^(-?\d+(?:\.\d+)?)(k)$/u, 1000],
    ];

    for (const [pattern, multiplier] of unitMultipliers) {
      const match = normalizedValue.match(pattern);

      if (match) {
        const numericValue = Number(match[1]);

        return Number.isFinite(numericValue) ? numericValue * multiplier : null;
      }
    }

    const numericValue = Number(normalizedValue);

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  function normalizeTikTokCardFilterDate(value) {
    const text = normalizeCaptionText(value);

    return /^\d{4}-\d{2}-\d{2}$/u.test(text) ? text : "";
  }

  function getTikTokCardFilterDateMs(dateText, endOfDay = false) {
    const normalizedDate = normalizeTikTokCardFilterDate(dateText);

    if (!normalizedDate) {
      return null;
    }

    const [year, month, day] = normalizedDate.split("-").map(Number);
    const date = endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);
    const dateMs = date.getTime();

    return Number.isFinite(dateMs) ? dateMs : null;
  }

  function normalizeTikTokCardLikeRatePreset(value) {
    return ["high", "midPlus", "low"].includes(value) ? value : "";
  }

  function normalizeTikTokCardPotentialPreset(value) {
    const labels = {
      High: "high",
      Low: "low",
      Mid: "midPlus",
      high: "high",
      low: "low",
      midPlus: "midPlus",
    };

    return labels[value] ?? "";
  }

  function normalizeTikTokCardFilterCriteria(criteria = {}) {
    const defaults = getDefaultTikTokCardFilterCriteria();
    let minLikeRate = normalizeTikTokCardFilterNumber(criteria.minLikeRate);
    let maxLikeRate = normalizeTikTokCardFilterNumber(criteria.maxLikeRate);
    const hasManualLikeRate = minLikeRate !== null || maxLikeRate !== null;
    const likeRatePreset = hasManualLikeRate
      ? ""
      : normalizeTikTokCardLikeRatePreset(criteria.likeRatePreset) ||
        normalizeTikTokCardPotentialPreset(criteria.potential);

    if (!hasManualLikeRate) {
      if (likeRatePreset === "high") {
        minLikeRate = HIGH_POTENTIAL_LIKES_PER_HOUR;
      } else if (likeRatePreset === "midPlus") {
        minLikeRate = MID_POTENTIAL_LIKES_PER_HOUR;
      } else if (likeRatePreset === "low") {
        maxLikeRate = MID_POTENTIAL_LIKES_PER_HOUR;
      }
    }

    return {
      ...defaults,
      excludeNonEnglish: Boolean(criteria.excludeNonEnglish),
      excludeOld: Boolean(criteria.excludeOld),
      excludeShort: Boolean(criteria.excludeShort),
      keyword: normalizeCaptionText(criteria.keyword),
      likeRatePreset,
      maxAgeDays: normalizeTikTokCardFilterNumber(criteria.maxAgeDays),
      maxCreateDate: normalizeTikTokCardFilterDate(criteria.maxCreateDate),
      maxLikeRate,
      maxPlayCount: normalizeTikTokCardFilterNumber(criteria.maxPlayCount),
      maxPlayRate: normalizeTikTokCardFilterNumber(criteria.maxPlayRate),
      minAgeDays: normalizeTikTokCardFilterNumber(criteria.minAgeDays),
      minCreateDate: normalizeTikTokCardFilterDate(criteria.minCreateDate),
      minLikeRate,
      minPlayCount: normalizeTikTokCardFilterNumber(criteria.minPlayCount),
      minPlayRate: normalizeTikTokCardFilterNumber(criteria.minPlayRate),
      potential: normalizeTikTokCardPotentialPreset(criteria.potential) && !hasManualLikeRate
        ? criteria.potential
        : "",
    };
  }

  function hasActiveTikTokCardFilter(criteria) {
    const normalizedCriteria = normalizeTikTokCardFilterCriteria(criteria);
    const defaults = getDefaultTikTokCardFilterCriteria();

    return Object.keys(defaults).some((key) => normalizedCriteria[key] !== defaults[key]);
  }

  function getTikTokCardFilterRecord(item, nowMs) {
    const metrics = getVideoMetrics(item, nowMs);
    const warningLabels = getTikTokCardWarningLabels(metrics);
    const warnings = new Set(warningLabels);
    const ageDays = Number.isFinite(metrics.elapsedHours) ? metrics.elapsedHours / 24 : null;

    return {
      ageDays,
      createTimeMs: getTikTokItemCreateTimeMs(item),
      description: metrics.description,
      isNonEnglish: warnings.has("!Non-EN"),
      isOld: warnings.has("!>1d"),
      isShort: warnings.has("!<1m"),
      likeRate: metrics.likeRate,
      playCount: metrics.playCount,
      playRate: metrics.playRate,
      potential: formatTikTokCardPotentialLabel(metrics.potential),
    };
  }

  function isTikTokCardFilterNumberMatch(value, minValue, maxValue) {
    if (minValue === null && maxValue === null) {
      return true;
    }

    if (!Number.isFinite(value)) {
      return false;
    }

    return (
      (minValue === null || value >= minValue) &&
      (maxValue === null || value <= maxValue)
    );
  }

  function isTikTokCardFilterDateMatch(createTimeMs, minDate, maxDate) {
    if (!minDate && !maxDate) {
      return true;
    }

    if (!Number.isFinite(createTimeMs) || createTimeMs <= 0) {
      return false;
    }

    const minDateMs = getTikTokCardFilterDateMs(minDate);
    const maxDateMs = getTikTokCardFilterDateMs(maxDate, true);

    return (
      (minDateMs === null || createTimeMs >= minDateMs) &&
      (maxDateMs === null || createTimeMs <= maxDateMs)
    );
  }

  function isTikTokCardMatchingFilter(item, nowMs, criteria) {
    const normalizedCriteria = normalizeTikTokCardFilterCriteria(criteria);
    const record = getTikTokCardFilterRecord(item, nowMs);
    const keyword = normalizedCriteria.keyword.toLocaleLowerCase();

    if (normalizedCriteria.potential && record.potential !== normalizedCriteria.potential) {
      return false;
    }

    if (
      keyword &&
      !normalizeCaptionText(record.description).toLocaleLowerCase().includes(keyword)
    ) {
      return false;
    }

    if (
      normalizedCriteria.likeRatePreset === "low" &&
      Number.isFinite(record.likeRate) &&
      record.likeRate >= MID_POTENTIAL_LIKES_PER_HOUR
    ) {
      return false;
    }

    if (
      !isTikTokCardFilterNumberMatch(
        record.likeRate,
        normalizedCriteria.minLikeRate,
        normalizedCriteria.maxLikeRate,
      ) ||
      !isTikTokCardFilterNumberMatch(
        record.playCount,
        normalizedCriteria.minPlayCount,
        normalizedCriteria.maxPlayCount,
      ) ||
      !isTikTokCardFilterNumberMatch(
        record.playRate,
        normalizedCriteria.minPlayRate,
        normalizedCriteria.maxPlayRate,
      ) ||
      !isTikTokCardFilterNumberMatch(
        record.ageDays,
        normalizedCriteria.minAgeDays,
        normalizedCriteria.maxAgeDays,
      ) ||
      !isTikTokCardFilterDateMatch(
        record.createTimeMs,
        normalizedCriteria.minCreateDate,
        normalizedCriteria.maxCreateDate,
      )
    ) {
      return false;
    }

    return (
      !(normalizedCriteria.excludeShort && record.isShort) &&
      !(normalizedCriteria.excludeOld && record.isOld) &&
      !(normalizedCriteria.excludeNonEnglish && record.isNonEnglish)
    );
  }

  function getTikTokCardFilterDisplayTarget(target) {
    return target?.closest?.(TIKTOK_CARD_FILTER_CARD_SELECTOR) || target;
  }

  function setTikTokCardFilterVisibility(target, isVisible) {
    const displayTarget = getTikTokCardFilterDisplayTarget(target);

    displayTarget?.classList?.toggle?.(CARD_FILTER_HIDDEN_CLASS, !isVisible);

    if (displayTarget?.style) {
      displayTarget.style.display = isVisible ? "" : "none";
    }
  }

  function clearTikTokCardFilterState(rootRef) {
    for (const { target } of collectAllTikTokCardMetricTargets(rootRef)) {
      setTikTokCardFilterVisibility(target, true);
      const displayTarget = getTikTokCardFilterDisplayTarget(target);

      if (displayTarget?.style) {
        displayTarget.style.order = "";
      }
    }
  }

  function getTikTokCardSortScore(record) {
    return Number.isFinite(record?.likeRate) ? record.likeRate : -1;
  }

  function getTikTokCardParentChildren(parent) {
    if (!parent?.children) {
      return [];
    }

    try {
      return Array.from(parent.children);
    } catch {
      const length = Number(parent.children.length) || 0;
      const children = [];

      for (let index = 0; index < length; index += 1) {
        const child = parent.children[index] ?? parent.children.item?.(index);

        if (child) {
          children.push(child);
        }
      }

      return children;
    }
  }

  function getTikTokCardParentChild(parent, index) {
    return parent?.children?.[index] ?? parent?.children?.item?.(index) ?? null;
  }

  function reorderTikTokCardFilterEntries(entries) {
    const groups = new Map();

    for (const entry of entries) {
      const displayTarget = getTikTokCardFilterDisplayTarget(entry.target);
      const parent = displayTarget?.parentNode;

      if (!parent?.insertBefore || getTikTokCardParentChildren(parent).length === 0) {
        if (displayTarget?.style) {
          displayTarget.style.order = String(entry.sortIndex);
        }
        continue;
      }

      if (!groups.has(parent)) {
        groups.set(parent, []);
      }

      groups.get(parent).push({
        ...entry,
        displayTarget,
      });
    }

    for (const [parent, groupEntries] of groups) {
      const children = getTikTokCardParentChildren(parent);
      const indexes = groupEntries
        .map((entry) => children.indexOf(entry.displayTarget))
        .filter((index) => index >= 0);

      if (indexes.length === 0) {
        continue;
      }

      const startIndex = Math.min(...indexes);

      groupEntries.forEach((entry, index) => {
        const referenceNode = getTikTokCardParentChild(parent, startIndex + index);

        if (referenceNode !== entry.displayTarget) {
          parent.insertBefore(entry.displayTarget, referenceNode);
        }
      });
    }
  }

  function applyTikTokCardFilter(documentRef, rootRef, nowMs, criteria) {
    const surface = getTikTokCardMetricsSurface(documentRef, rootRef);
    const normalizedCriteria = normalizeTikTokCardFilterCriteria(criteria);
    const isActive = hasActiveTikTokCardFilter(normalizedCriteria);

    if (!surface) {
      clearTikTokCardFilterState(rootRef);
      return { matchedCount: 0, totalCount: 0 };
    }

    let matchedCount = 0;
    let totalCount = 0;
    const entries = [];

    for (const { itemId, target } of collectTikTokCardMetricTargets(rootRef, surface)) {
      const item = getCachedTikTokItem(itemId);
      const record = item ? getTikTokCardFilterRecord(item, nowMs) : null;
      const isVisible = !isActive || (item && isTikTokCardMatchingFilter(item, nowMs, normalizedCriteria));

      totalCount += 1;
      if (isVisible) {
        matchedCount += 1;
      }

      entries.push({
        isVisible,
        record,
        target,
      });
    }

    entries
      .sort((first, second) => getTikTokCardSortScore(second.record) - getTikTokCardSortScore(first.record))
      .forEach((entry, index) => {
        const displayTarget = getTikTokCardFilterDisplayTarget(entry.target);

        if (displayTarget?.style) {
          displayTarget.style.order = String(index);
        }

        entry.sortIndex = index;
        setTikTokCardFilterVisibility(entry.target, entry.isVisible);
      });

    reorderTikTokCardFilterEntries(entries);

    return { matchedCount, totalCount };
  }

  function dispatchTikTokCardScrollEvent(documentRef) {
    const view = documentRef?.defaultView ?? globalThis.window;

    if (!view?.dispatchEvent) {
      return;
    }

    try {
      view.dispatchEvent(new Event("scroll"));
    } catch {
      view.dispatchEvent({ type: "scroll" });
    }
  }

  function getTikTokCardScrollTarget(documentRef) {
    return (
      documentRef?.querySelector?.("#grid-main") ||
      documentRef?.scrollingElement ||
      documentRef?.documentElement ||
      documentRef?.body ||
      documentRef?.defaultView ||
      globalThis.window ||
      null
    );
  }

  function getTikTokCardScrollHeight(documentRef, scrollTarget) {
    return Math.max(
      Number(scrollTarget?.scrollHeight) || 0,
      Number(documentRef?.body?.scrollHeight) || 0,
      Number(documentRef?.documentElement?.scrollHeight) || 0,
    );
  }

  function scrollTikTokCardTarget(scrollTarget, options) {
    if (scrollTarget?.scrollTo) {
      scrollTarget.scrollTo(options);
      return true;
    }

    const view = scrollTarget?.defaultView ?? globalThis.window;

    if (view?.scrollTo) {
      view.scrollTo(options);
      return true;
    }

    return false;
  }

  function loadMoreTikTokCardMetrics(documentRef, setTimeoutRef) {
    const view = documentRef?.defaultView ?? globalThis.window;
    const scrollTarget = getTikTokCardScrollTarget(documentRef);
    const scrollHeight = getTikTokCardScrollHeight(documentRef, scrollTarget);
    const canScrollTarget = scrollTarget?.scrollTo ? scrollTarget : view;

    if (!canScrollTarget || scrollHeight <= 0) {
      return false;
    }

    const originalLeft = Number(canScrollTarget.scrollX ?? canScrollTarget.scrollLeft ?? view?.scrollX) || 0;
    const originalTop = Number(canScrollTarget.scrollY ?? canScrollTarget.scrollTop ?? view?.scrollY) || 0;

    scrollTikTokCardTarget(canScrollTarget, {
      behavior: "instant",
      left: 0,
      top: scrollHeight,
    });
    dispatchTikTokCardScrollEvent(documentRef);

    const restore = () => {
      scrollTikTokCardTarget(canScrollTarget, {
        behavior: "instant",
        left: originalLeft,
        top: originalTop,
      });
    };

    if (setTimeoutRef) {
      setTimeoutRef(restore, TIKTOK_CARD_LOAD_MORE_RESTORE_DELAY_MS);
    } else {
      restore();
    }

    return true;
  }

  function clearElementChildren(element) {
    element.textContent = "";

    if (Array.isArray(element.children)) {
      element.children.length = 0;
    }
  }

  function createTikTokCardMetricBadge(documentRef, metric) {
    const badge = documentRef.createElement("span");
    const value = documentRef.createElement("span");

    setElementClassName(badge, "msj-tiktok-card-metric");
    setElementClassName(value, "msj-tiktok-card-metric-value");
    badge.dataset.metric = metric.key;
    badge.title = metric.label;
    value.textContent = metric.value;

    if (metric.icon) {
      const icon = documentRef.createElement("span");

      setElementClassName(icon, "msj-tiktok-card-metric-icon");
      icon.dataset.icon = metric.icon;
      icon.setAttribute("aria-hidden", "true");
      badge.append(icon);
    }

    badge.append(value);

    return badge;
  }

  function createTikTokCardMetricColumn(documentRef, className, metrics) {
    const column = documentRef.createElement("div");

    setElementClassName(column, className);

    for (const metric of metrics) {
      column.append(createTikTokCardMetricBadge(documentRef, metric));
    }

    return column;
  }

  function getTikTokCardMetricSignature(item, surface, metricGroups) {
    return [
      surface,
      getTikTokItemId(item),
      ...metricGroups.left.map((metric) => `${metric.key}:${metric.value}`),
      ...metricGroups.right.map((metric) => `${metric.key}:${metric.value}`),
    ].join("|");
  }

  function renderTikTokCardMetrics(cardTarget, item, surface, documentRef, nowMs) {
    const metricGroups = getTikTokCardMetricGroups(item, nowMs);
    const hasMetrics = metricGroups.left.length > 0 || metricGroups.right.length > 0;

    if (!hasMetrics) {
      removeTikTokCardMetricsRoot(cardTarget);
      return false;
    }

    const signature = getTikTokCardMetricSignature(item, surface, metricGroups);
    const existingMetricsRoot = findTikTokCardMetricsRoot(cardTarget);

    if (
      existingMetricsRoot?.dataset?.signature === signature &&
      cardTarget?.dataset?.msjTikTokCardMetricsSignature === signature
    ) {
      return true;
    }

    const metricsRoot = existingMetricsRoot || documentRef.createElement("div");

    setElementClassName(metricsRoot, CARD_METRICS_ROOT_CLASS);
    metricsRoot.dataset.signature = signature;
    metricsRoot.dataset.surface = surface;
    metricsRoot.dataset.videoId = getTikTokItemId(item);
    metricsRoot.setAttribute("aria-label", "TikTok 数据指标");
    clearElementChildren(metricsRoot);
    metricsRoot.append(
      createTikTokCardMetricColumn(documentRef, "msj-tiktok-card-metrics-left", metricGroups.left),
      createTikTokCardMetricColumn(documentRef, "msj-tiktok-card-metrics-right", metricGroups.right),
    );

    if (cardTarget?.dataset) {
      cardTarget.dataset.msjTikTokCardMetricsRendered = "true";
      cardTarget.dataset.msjTikTokCardMetricsSignature = signature;
    }

    if (!existingMetricsRoot) {
      if (!cardTarget.style?.position) {
        cardTarget.style.position = "relative";
      }

      cardTarget.append(metricsRoot);
    }

    return true;
  }

  function createTikTokCardFilterField(documentRef, labelText, input, helpText = "") {
    const label = documentRef.createElement("label");
    const text = documentRef.createElement("span");

    setElementClassName(label, "msj-tiktok-card-filter-field");
    text.textContent = labelText;
    label.append(text, input);

    if (helpText) {
      const help = documentRef.createElement("small");

      setElementClassName(help, "msj-tiktok-card-filter-help");
      help.textContent = helpText;
      label.append(help);
    }

    return label;
  }

  function createTikTokCardFilterNumberInput(documentRef, controls, key, labelText) {
    const input = documentRef.createElement("input");

    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = "如 5000 / 5k / 500万";
    input.dataset.filterKey = key;
    controls[key] = input;

    return createTikTokCardFilterField(documentRef, labelText, input);
  }

  function createTikTokCardFilterDateInput(documentRef, controls, key, labelText) {
    const input = documentRef.createElement("input");

    input.type = "date";
    input.dataset.filterKey = key;
    controls[key] = input;

    return createTikTokCardFilterField(documentRef, labelText, input);
  }

  function setTikTokCardFilterControlValue(control, value) {
    if (!control) {
      return;
    }

    if (control.type === "checkbox") {
      control.checked = Boolean(value);
      return;
    }

    control.value = value === null || typeof value === "undefined" ? "" : String(value);
  }

  function readTikTokCardFilterControlNumber(control) {
    return normalizeTikTokCardFilterNumber(control?.value);
  }

  function formatTikTokCardDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getRecentTikTokCardDateRange(days) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - Math.max(0, days - 1));
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      maxCreateDate: formatTikTokCardDateInput(endDate),
      minCreateDate: formatTikTokCardDateInput(startDate),
    };
  }

  function createTikTokCardFilterButton(documentRef, className, text) {
    const button = documentRef.createElement("button");

    setElementClassName(button, className);
    button.type = "button";
    button.textContent = text;

    return button;
  }

  function createTikTokCardFilterControl(documentRef, { onApply, onLoadMore, onReset }) {
    const root = documentRef.createElement("div");
    const header = documentRef.createElement("div");
    const titleBlock = documentRef.createElement("div");
    const title = documentRef.createElement("div");
    const description = documentRef.createElement("div");
    const actionBar = documentRef.createElement("div");
    const toggleButton = documentRef.createElement("button");
    const summary = documentRef.createElement("span");
    const panel = documentRef.createElement("div");
    const quickGrid = documentRef.createElement("div");
    const controls = {};
    const keywordInput = documentRef.createElement("input");
    const numberGrid = documentRef.createElement("div");
    const dateGrid = documentRef.createElement("div");
    const footer = documentRef.createElement("div");
    const loadMoreButton = documentRef.createElement("button");
    const sortButton = documentRef.createElement("button");
    const resetButton = documentRef.createElement("button");
    const applyButton = documentRef.createElement("button");
    const quickButtons = {};
    let activeLikeRatePreset = "";
    let activeTimePreset = "";

    setElementClassName(root, CARD_FILTER_ROOT_CLASS);
    setElementClassName(header, "msj-tiktok-card-filter-header");
    setElementClassName(titleBlock, "msj-tiktok-card-filter-title-block");
    setElementClassName(title, "msj-tiktok-card-filter-title");
    setElementClassName(description, "msj-tiktok-card-filter-description");
    setElementClassName(actionBar, "msj-tiktok-card-filter-actions");
    setElementClassName(toggleButton, "msj-tiktok-card-filter-toggle");
    setElementClassName(summary, "msj-tiktok-card-filter-summary");
    setElementClassName(panel, "msj-tiktok-card-filter-panel");
    setElementClassName(quickGrid, "msj-tiktok-card-filter-quick");
    setElementClassName(numberGrid, "msj-tiktok-card-filter-grid");
    setElementClassName(dateGrid, "msj-tiktok-card-filter-grid");
    setElementClassName(footer, "msj-tiktok-card-filter-footer");
    setElementClassName(loadMoreButton, "msj-tiktok-card-filter-secondary");
    setElementClassName(sortButton, "msj-tiktok-card-filter-secondary");
    setElementClassName(resetButton, "msj-tiktok-card-filter-reset");
    setElementClassName(applyButton, "msj-tiktok-card-filter-apply");

    title.textContent = "按每小时点赞量排序";
    description.textContent = "先按时间范围限制，再从高到低排列增长最快的视频。";
    toggleButton.type = "button";
    toggleButton.textContent = "更多条件";
    toggleButton.title = "展开更多筛选条件";
    toggleButton.setAttribute("aria-expanded", "false");
    summary.textContent = "已显示 0/0";
    panel.hidden = true;

    const quickConfigs = [
      ["recent1", "近24小时", "发布后不超过 24 小时"],
      ["recent2", "近2天", "发布日期在最近 2 天内"],
      ["recent7", "近7天", "发布日期在最近 7 天内"],
      ["allTime", "不限时间", "清除发布时间限制"],
    ];

    for (const [key, text, titleText] of quickConfigs) {
      const button = createTikTokCardFilterButton(documentRef, "msj-tiktok-card-filter-chip", text);

      button.title = titleText;
      quickButtons[key] = button;
      quickGrid.append(button);
    }

    controls.keyword = keywordInput;
    keywordInput.type = "search";
    keywordInput.placeholder = "输入标题关键词";

    dateGrid.append(
      createTikTokCardFilterDateInput(documentRef, controls, "minCreateDate", "发布日期从"),
      createTikTokCardFilterDateInput(documentRef, controls, "maxCreateDate", "发布日期到"),
    );

    numberGrid.append(
      createTikTokCardFilterNumberInput(documentRef, controls, "minLikeRate", "每小时点赞量最小"),
      createTikTokCardFilterNumberInput(documentRef, controls, "maxLikeRate", "每小时点赞量最大"),
      createTikTokCardFilterNumberInput(documentRef, controls, "minPlayCount", "总播放量最小"),
      createTikTokCardFilterNumberInput(documentRef, controls, "maxPlayCount", "总播放量最大"),
      createTikTokCardFilterNumberInput(documentRef, controls, "minPlayRate", "每小时播放量最小"),
      createTikTokCardFilterNumberInput(documentRef, controls, "maxPlayRate", "每小时播放量最大"),
    );

    loadMoreButton.type = "button";
    loadMoreButton.textContent = "加载更多并排序";
    sortButton.type = "button";
    sortButton.textContent = "重新排序";
    resetButton.type = "button";
    resetButton.textContent = "重置";
    applyButton.type = "button";
    applyButton.textContent = "应用筛选";

    titleBlock.append(title, description);
    actionBar.append(loadMoreButton, sortButton, resetButton, toggleButton);
    footer.append(applyButton);
    panel.append(dateGrid, createTikTokCardFilterField(
      documentRef,
      "关键词",
      keywordInput,
      "可选。按视频文案包含的词筛选。",
    ), numberGrid, footer);
    header.append(titleBlock, summary);
    root.append(header, actionBar, quickGrid, panel);

    function readCriteria() {
      return normalizeTikTokCardFilterCriteria({
        excludeNonEnglish: Boolean(controls.excludeNonEnglish?.checked),
        excludeOld: Boolean(controls.excludeOld?.checked),
        excludeShort: Boolean(controls.excludeShort?.checked),
        keyword: controls.keyword.value,
        likeRatePreset: activeLikeRatePreset,
        maxAgeDays: activeTimePreset === "recent1"
          ? 1
          : readTikTokCardFilterControlNumber(controls.maxAgeDays),
        maxCreateDate: controls.maxCreateDate.value,
        maxLikeRate: readTikTokCardFilterControlNumber(controls.maxLikeRate),
        maxPlayCount: readTikTokCardFilterControlNumber(controls.maxPlayCount),
        maxPlayRate: readTikTokCardFilterControlNumber(controls.maxPlayRate),
        minAgeDays: readTikTokCardFilterControlNumber(controls.minAgeDays),
        minCreateDate: controls.minCreateDate.value,
        minLikeRate: readTikTokCardFilterControlNumber(controls.minLikeRate),
        minPlayCount: readTikTokCardFilterControlNumber(controls.minPlayCount),
        minPlayRate: readTikTokCardFilterControlNumber(controls.minPlayRate),
      });
    }

    function setManualLikeRateMode() {
      activeLikeRatePreset = "";
      updateQuickState(readCriteria());
    }

    function setManualTimeMode() {
      activeTimePreset = "";
      updateQuickState(readCriteria());
    }

    function updateQuickState(criteria = {}) {
      const normalizedCriteria = normalizeTikTokCardFilterCriteria(criteria);

      activeLikeRatePreset = normalizedCriteria.likeRatePreset;
      if (normalizedCriteria.maxAgeDays === 1 && !normalizedCriteria.minCreateDate && !normalizedCriteria.maxCreateDate) {
        activeTimePreset = "recent1";
      }

      quickButtons.recent1.classList?.toggle?.("is-active", activeTimePreset === "recent1");
      quickButtons.recent2.classList?.toggle?.("is-active", activeTimePreset === "recent2");
      quickButtons.recent7.classList?.toggle?.("is-active", activeTimePreset === "recent7");
      quickButtons.allTime.classList?.toggle?.(
        "is-active",
        !activeTimePreset && !normalizedCriteria.minCreateDate && !normalizedCriteria.maxCreateDate,
      );
    }

    function syncCriteria(criteria) {
      const normalizedCriteria = normalizeTikTokCardFilterCriteria(criteria);
      activeLikeRatePreset = normalizedCriteria.likeRatePreset;
      activeTimePreset = normalizedCriteria.maxAgeDays === 1 &&
        !normalizedCriteria.minCreateDate &&
        !normalizedCriteria.maxCreateDate
        ? "recent1"
        : activeTimePreset;

      if (
        normalizedCriteria.maxAgeDays === null &&
        !normalizedCriteria.minCreateDate &&
        !normalizedCriteria.maxCreateDate
      ) {
        activeTimePreset = "";
      }

      for (const key of Object.keys(normalizedCriteria)) {
        if (activeLikeRatePreset && (key === "minLikeRate" || key === "maxLikeRate")) {
          setTikTokCardFilterControlValue(controls[key], "");
          continue;
        }

        setTikTokCardFilterControlValue(controls[key], normalizedCriteria[key]);
      }

      root.classList?.toggle?.("is-active", hasActiveTikTokCardFilter(normalizedCriteria));
      updateQuickState(normalizedCriteria);
    }

    function updateSummary({ matchedCount = 0, totalCount = 0 } = {}, criteria = {}) {
      summary.textContent = `已显示 ${matchedCount}/${totalCount}`;
      root.classList?.toggle?.("is-active", hasActiveTikTokCardFilter(criteria));
      updateQuickState(criteria);
    }

    controls.minLikeRate.addEventListener("input", setManualLikeRateMode);
    controls.maxLikeRate.addEventListener("input", setManualLikeRateMode);
    controls.minCreateDate.addEventListener("input", setManualTimeMode);
    controls.maxCreateDate.addEventListener("input", setManualTimeMode);
    toggleButton.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggleButton.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    });
    quickButtons.recent1.addEventListener("click", () => {
      activeTimePreset = activeTimePreset === "recent1" ? "" : "recent1";
      controls.minCreateDate.value = "";
      controls.maxCreateDate.value = "";
      onApply(readCriteria());
    });
    quickButtons.recent2.addEventListener("click", () => {
      const range = getRecentTikTokCardDateRange(2);

      activeTimePreset = "recent2";
      controls.minCreateDate.value = range.minCreateDate;
      controls.maxCreateDate.value = range.maxCreateDate;
      onApply(readCriteria());
    });
    quickButtons.recent7.addEventListener("click", () => {
      const range = getRecentTikTokCardDateRange(7);

      activeTimePreset = "recent7";
      controls.minCreateDate.value = range.minCreateDate;
      controls.maxCreateDate.value = range.maxCreateDate;
      onApply(readCriteria());
    });
    quickButtons.allTime.addEventListener("click", () => {
      activeTimePreset = "";
      controls.minCreateDate.value = "";
      controls.maxCreateDate.value = "";
      onApply(readCriteria());
    });
    applyButton.addEventListener("click", () => onApply(readCriteria()));
    sortButton.addEventListener("click", () => onApply(readCriteria()));
    loadMoreButton.addEventListener("click", () => onLoadMore());
    resetButton.addEventListener("click", () => onReset());

    syncCriteria(getDefaultTikTokCardFilterCriteria());

    return {
      applyButton,
      controls,
      loadMoreButton,
      panel,
      quickButtons,
      resetButton,
      root,
      summary,
      syncCriteria,
      sortButton,
      toggleButton,
      updateSummary,
    };
  }

  function removeTikTokCardFilterControl(documentRef, filterParts) {
    if (!filterParts?.root) {
      return;
    }

    if (Array.isArray(documentRef?.body?.children)) {
      const index = documentRef.body.children.indexOf(filterParts.root);

      if (index >= 0) {
        documentRef.body.children.splice(index, 1);
      }
    }

    filterParts.root.remove?.();
  }

  function refreshTikTokCardMetrics(documentRef, rootRef, nowMs) {
    const surface = getTikTokCardMetricsSurface(documentRef, rootRef);

    if (!surface) {
      clearTikTokCardMetrics(rootRef);
      return 0;
    }

    let renderedCount = 0;

    for (const { itemId, target } of collectTikTokCardMetricTargets(rootRef, surface)) {
      const item = getCachedTikTokItem(itemId);

      if (!item) {
        removeTikTokCardMetricsRoot(target);
        continue;
      }

      if (renderTikTokCardMetrics(target, item, surface, documentRef, nowMs)) {
        renderedCount += 1;
      }
    }

    return renderedCount;
  }

  function createTikTokCardMetricsOverlay({
    document: documentRef = document,
    getRoot = () => documentRef,
    now = () => Date.now(),
    setInterval: setIntervalRef = getDefaultSetInterval(),
    clearInterval: clearIntervalRef = getDefaultClearInterval(),
    setTimeout: setTimeoutRef = getDefaultSetTimeout(),
    scanIntervalMs = TIKTOK_CARD_METRIC_SCAN_INTERVAL_MS,
  } = {}) {
    if (documentRef.__msjTikTokCardMetricsOverlay) {
      return documentRef.__msjTikTokCardMetricsOverlay;
    }

    let refreshTimer = null;
    let destroyed = false;
    let filterCriteria = getDefaultTikTokCardFilterCriteria();
    let filterParts = null;

    function ensureFilterControl(surface) {
      if (!surface) {
        removeTikTokCardFilterControl(documentRef, filterParts);
        filterParts = null;
        return;
      }

      if (!filterParts) {
        filterParts = createTikTokCardFilterControl(documentRef, {
          onApply: setFilterCriteria,
          onLoadMore: loadMore,
          onReset: resetFilterCriteria,
        });
        documentRef.body?.append?.(filterParts.root);
      }

      filterParts.root.dataset.surface = surface;
      filterParts.syncCriteria(filterCriteria);
    }

    function updateFilterSummary(result) {
      filterParts?.updateSummary?.(result, filterCriteria);
    }

    function setFilterCriteria(criteria = {}) {
      filterCriteria = normalizeTikTokCardFilterCriteria(criteria);
      filterParts?.syncCriteria?.(filterCriteria);
      return refresh();
    }

    function resetFilterCriteria() {
      return setFilterCriteria(getDefaultTikTokCardFilterCriteria());
    }

    function loadMore() {
      loadMoreTikTokCardMetrics(documentRef, setTimeoutRef);
      return refresh();
    }

    function refresh() {
      if (destroyed) {
        return 0;
      }

      const rootRef = getRoot();
      const nowMs = now();
      const surface = getTikTokCardMetricsSurface(documentRef, rootRef);

      ensureFilterControl(surface);

      const renderedCount = refreshTikTokCardMetrics(documentRef, rootRef, nowMs);
      const filterResult = applyTikTokCardFilter(documentRef, rootRef, nowMs, filterCriteria);

      updateFilterSummary(filterResult);

      return renderedCount;
    }

    function start() {
      refresh();

      if (setIntervalRef && scanIntervalMs > 0) {
        refreshTimer = setIntervalRef(refresh, scanIntervalMs);
      }
    }

    function destroy() {
      destroyed = true;
      if (refreshTimer !== null) {
        clearIntervalRef?.(refreshTimer);
      }
      clearTikTokCardFilterState(getRoot());
      removeTikTokCardFilterControl(documentRef, filterParts);
      filterParts = null;
      clearTikTokCardMetrics(getRoot());
      activeTikTokCardMetricsOverlays.delete(overlay);
      if (documentRef.__msjTikTokCardMetricsOverlay === overlay) {
        delete documentRef.__msjTikTokCardMetricsOverlay;
      }
    }

    const overlay = {
      destroy,
      get filterRoot() {
        return filterParts?.root ?? null;
      },
      get filterSummary() {
        return filterParts?.summary ?? null;
      },
      refresh,
      refreshAfterTikTokApiPayload: refresh,
      loadMore,
      resetFilterCriteria,
      setFilterCriteria,
    };

    documentRef.__msjTikTokCardMetricsOverlay = overlay;
    activeTikTokCardMetricsOverlays.add(overlay);
    start();

    return overlay;
  }

  function refreshTikTokCaptionOverlaysAfterApiPayload() {
    return Promise.all(
      Array.from(new Set([
        ...activeTikTokCaptionOverlays,
        ...activeTikTokCardMetricsOverlays,
      ]), (overlay) =>
        overlay.refreshAfterTikTokApiPayload?.() ?? Promise.resolve(),
      ),
    );
  }

  function handleTikTokApiMessage(event) {
    if (event?.origin && !/https:\/\/(?:[^/]+\.)?tiktok\.com$/u.test(event.origin)) {
      return;
    }

    if (event?.data?.type !== TIKTOK_API_MESSAGE_TYPE) {
      return;
    }

    if (ingestTikTokApiPayload(event.data.payload) > 0) {
      return refreshTikTokCaptionOverlaysAfterApiPayload();
    }

    return Promise.resolve();
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
    const authorLink = documentRef.createElement("a");
    const authorAvatarWrap = documentRef.createElement("span");
    const authorAvatar = documentRef.createElement("img");
    const authorFallback = documentRef.createElement("span");
    const authorName = documentRef.createElement("span");
    const warningBadges = documentRef.createElement("div");
    const potentialBadge = documentRef.createElement("span");
    const metricList = documentRef.createElement("span");
    const videoDetails = documentRef.createElement("section");
    const detailsHeader = documentRef.createElement("div");
    const detailsCopyButton = documentRef.createElement("button");
    const detailsResizeHandle = documentRef.createElement("span");
    const detailsOriginal = documentRef.createElement("p");
    const detailsTranslation = documentRef.createElement("p");
    const status = documentRef.createElement("p");
    const captionList = documentRef.createElement("div");
    const actions = documentRef.createElement("div");
    const fontDecreaseButton = documentRef.createElement("button");
    const fontIncreaseButton = documentRef.createElement("button");
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
    authorLink.className = "msj-tiktok-video-author";
    authorLink.target = "_blank";
    authorLink.rel = "noopener noreferrer";
    authorLink.hidden = true;
    authorAvatarWrap.className = "msj-tiktok-video-author-avatar-wrap";
    authorAvatar.className = "msj-tiktok-video-author-avatar";
    authorAvatar.alt = "";
    authorAvatar.hidden = true;
    authorFallback.className = "msj-tiktok-video-author-fallback";
    authorName.className = "msj-tiktok-video-author-name";
    warningBadges.className = "msj-tiktok-warning-badges";
    warningBadges.setAttribute("aria-live", "polite");
    potentialBadge.className = "msj-tiktok-potential is-low";
    metricList.className = "msj-tiktok-video-metrics";
    videoDetails.className = "msj-tiktok-video-details";
    detailsHeader.className = "msj-tiktok-video-details-header";
    detailsCopyButton.type = "button";
    detailsCopyButton.className = "msj-tiktok-video-details-copy-button";
    detailsCopyButton.textContent = "复制原文";
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
    fontDecreaseButton.type = "button";
    fontDecreaseButton.className = "msj-tiktok-caption-font-button";
    fontDecreaseButton.textContent = "-";
    fontDecreaseButton.title = "缩小字幕板文字";
    fontDecreaseButton.setAttribute("aria-label", "缩小字幕板文字");
    fontIncreaseButton.type = "button";
    fontIncreaseButton.className = "msj-tiktok-caption-font-button";
    fontIncreaseButton.textContent = "+";
    fontIncreaseButton.title = "放大字幕板文字";
    fontIncreaseButton.setAttribute("aria-label", "放大字幕板文字");
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
    authorAvatarWrap.append(authorAvatar, authorFallback);
    authorLink.append(authorAvatarWrap, authorName);
    videoInfo.append(authorLink, potentialBadge, metricList);
    detailsHeader.append(detailsCopyButton);
    videoDetails.append(detailsHeader, detailsOriginal, detailsTranslation);
    actions.append(status, modeGroup, fontDecreaseButton, fontIncreaseButton, refreshButton, copyButton);
    panel.append(
      header,
      videoInfo,
      warningBadges,
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
      authorAvatar,
      authorFallback,
      authorLink,
      authorName,
      captionList,
      closeButton,
      copyButton,
      detailsCopyButton,
      detailsHeader,
      detailsResizeHandle,
      detailsOriginal,
      detailsTranslation,
      fontDecreaseButton,
      fontIncreaseButton,
      header,
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
      warningBadges,
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
    let autoOpenEnabled = DEFAULT_AUTO_OPEN_ENABLED;
    let displayMode = DEFAULT_DISPLAY_MODE;
    let fontScale = DEFAULT_FONT_SCALE;
    let nonEnglishWarningEnabled = DEFAULT_NON_ENGLISH_WARNING_ENABLED;
    let buttonPosition = normalizeButtonPosition(null, documentRef);
    let panelFrame = normalizePanelFrame(null, documentRef);
    let currentLines = [];
    let currentDisplayLines = [];
    let currentDetailsTranslation = "";
    let currentVideoMetrics = getUnknownVideoMetrics(null);
    let lastSourceKey = getSourceKey();
    let lastHintKey = getHintKey();
    let refreshRequestId = 0;
    let activeRefreshRequestId = 0;
    let activeRefreshSourceKey = "";
    let autoRefreshTimer = null;
    let pendingAutoRefreshAttempts = 0;
    let buttonDragState = null;
    let activeDetailsHeight = DEFAULT_DETAILS_HEIGHT;
    let savedDetailsHeight = DEFAULT_DETAILS_HEIGHT;
    let detailsResizeState = null;
    let panelDragState = null;
    let panelResizeState = null;
    let suppressNextButtonClick = false;
    let autoOpenSuppressed = false;

    root.classList.add(ROOT_CLASS);
    root.append(button, panelParts.panel);
    documentRef.body?.append(root);

    function applyButtonPosition(nextPosition) {
      buttonPosition = normalizeButtonPosition(nextPosition, documentRef);
      root.style.left = "auto";
      root.style.top = `${buttonPosition.y}px`;
      root.style.right = `${BUTTON_RIGHT_OFFSET}px`;
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

    function applyFontScale(nextScale) {
      fontScale = normalizeFontScale(nextScale);
      panelParts.panel.style.fontSize = `${fontScale}%`;
      panelParts.fontDecreaseButton.disabled = fontScale <= MIN_FONT_SCALE;
      panelParts.fontIncreaseButton.disabled = fontScale >= MAX_FONT_SCALE;
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

      autoOpenEnabled = storedSettings.autoOpenEnabled;
      displayMode = storedSettings.displayMode;
      fontScale = storedSettings.fontScale;
      nonEnglishWarningEnabled = storedSettings.nonEnglishWarningEnabled;
      savedDetailsHeight = storedSettings.detailsHeight;
      applyButtonPosition(storedSettings.buttonPosition);
      applyPanelFrame(storedSettings.panelFrame);
      applyFontScale(fontScale);
      applyDetailsHeightForCaptionCount(currentDisplayLines.length);
      updateModeButtons();

      if (autoOpenEnabled) {
        startAutoRefresh();
        await probeAutoOpenIfReady();
      }
    }

    applyButtonPosition(buttonPosition);
    applyPanelFrame(panelFrame);
    applyFontScale(fontScale);
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

    function createWarningBadge(label) {
      const badge = documentRef.createElement("span");

      badge.className = "msj-tiktok-warning-badge";
      badge.textContent = label;

      return badge;
    }

    function getWarningLabels(metrics) {
      return getTikTokWarningLabels(metrics, { nonEnglishWarningEnabled });
    }

    function renderWarningBadges(metrics) {
      const labels = getWarningLabels(metrics);

      panelParts.warningBadges.textContent = "";
      if (Array.isArray(panelParts.warningBadges.children)) {
        panelParts.warningBadges.children.length = 0;
      }

      for (const label of labels) {
        panelParts.warningBadges.append(createWarningBadge(label));
      }

      panelParts.warningBadges.classList.toggle("is-visible", labels.length > 0);
    }

    function getVideoMetricItems(metrics) {
      return getTikTokVideoMetricItems(metrics);
    }

    function renderAuthorInfo(author) {
      const authorName = author?.name || (author?.uniqueId ? `@${author.uniqueId}` : "");
      const hasAuthor = Boolean(authorName || author?.profileUrl || author?.avatarUrl);

      panelParts.authorLink.hidden = !hasAuthor;
      panelParts.authorName.textContent = authorName;

      if (!hasAuthor) {
        panelParts.authorLink.removeAttribute?.("href");
        panelParts.authorLink.title = "";
        panelParts.authorAvatar.hidden = true;
        panelParts.authorAvatar.src = "";
        panelParts.authorAvatar.alt = "作者头像";
        panelParts.authorFallback.hidden = true;
        panelParts.authorFallback.textContent = "";
        return;
      }

      if (author?.profileUrl) {
        panelParts.authorLink.href = author.profileUrl;
        panelParts.authorLink.title = author?.uniqueId ? `打开 @${author.uniqueId} 主页` : "打开作者主页";
      } else {
        panelParts.authorLink.removeAttribute?.("href");
        panelParts.authorLink.title = "";
      }

      panelParts.authorAvatar.hidden = !author?.avatarUrl;
      panelParts.authorAvatar.src = author?.avatarUrl || "";
      panelParts.authorAvatar.alt = authorName ? `${authorName} 头像` : "作者头像";
      panelParts.authorFallback.hidden = Boolean(author?.avatarUrl);
      panelParts.authorFallback.textContent = (authorName.replace(/^@/u, "").trim().charAt(0) || "T").toUpperCase();
    }

    function renderVideoInfo(metrics, detailsTranslation) {
      const metricItems = getVideoMetricItems(metrics);

      currentVideoMetrics = metrics;
      currentDetailsTranslation = detailsTranslation || "";
      renderAuthorInfo(metrics.author);
      panelParts.potentialBadge.textContent = metrics.potential.label;
      panelParts.potentialBadge.classList.remove("is-high", "is-mid", "is-low");
      if (metrics.potential.className) {
        panelParts.potentialBadge.classList.add(metrics.potential.className);
      }
      panelParts.metricList.textContent = "";
      if (Array.isArray(panelParts.metricList.children)) {
        panelParts.metricList.children.length = 0;
      }

      for (const metricItem of metricItems) {
        panelParts.metricList.append(createVideoMetric(documentRef, metricItem));
      }
      panelParts.detailsOriginal.textContent = metrics.description || "暂无视频详情。";
      panelParts.detailsTranslation.textContent = currentDetailsTranslation;
      renderWarningBadges(metrics);
    }

    async function refreshVideoInfo(item, sourceKey, requestId) {
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

    function renderVisibleDomFallbackVideoInfo(rootRef, sourceKey, requestId) {
      const fallbackItem = getVisibleTikTokDomFallbackItem(rootRef);

      if (requestId !== refreshRequestId || getSourceKey() !== sourceKey) {
        return;
      }

      renderVideoInfo(getVideoMetrics(fallbackItem, now()), "");
    }

    async function createDisplayLines(lines) {
      return translateCaptionLines(lines, translateCaption, displayMode);
    }

    async function refreshCaptions({
      ignoreScriptCaptions = false,
      openWhenComplete = false,
      requireCompleteSource = false,
    } = {}) {
      const requestId = ++refreshRequestId;
      const nextSourceKey = getSourceKey();
      const nextHintKey = getHintKey();
      const rootRef = getRoot();
      const sourceChanged = nextSourceKey !== lastSourceKey;
      const shouldIgnoreScriptCaptions =
        ignoreScriptCaptions ||
        sourceChanged ||
        hasConcreteVideoSourceKey(nextSourceKey);

      lastSourceKey = nextSourceKey;
      lastHintKey = nextHintKey;
      activeRefreshRequestId = requestId;
      activeRefreshSourceKey = nextSourceKey;
      setStatus("正在读取字幕。");

      if (sourceChanged) {
        clearCaptions("正在读取字幕。");
        renderVisibleDomFallbackVideoInfo(rootRef, nextSourceKey, requestId);
      }

      try {
        const currentVideoId = extractTikTokVideoId(nextSourceKey);
        const currentPageUrl = getPageUrlFromSourceKey(nextSourceKey);
        const currentItem = await getTikTokVideoItem({
          root: rootRef,
          currentPageUrl,
          currentVideoId,
          fetchCaption,
        });
        const didRenderVideoInfo = await refreshVideoInfo(currentItem, nextSourceKey, requestId);

        if (!didRenderVideoInfo) {
          return;
        }

        const captionResult = await extractCaptionResult(rootRef, {
          currentPageUrl,
          currentVideoId,
          fetchCaption,
          allowDomTextCaptions: false,
          allowDomFallback: true,
          ignoreScriptCaptions: shouldIgnoreScriptCaptions,
          preferDomCaptions: true,
          resolvedItem: currentItem,
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

        if (openWhenComplete && hasDisplayLines) {
          applyOpenState(true);
        }

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
      } finally {
        if (activeRefreshRequestId === requestId) {
          activeRefreshRequestId = 0;
          activeRefreshSourceKey = "";
        }
      }
    }

    function refreshCaptionsIfSourceChanged({ force = false } = {}) {
      if (panelParts.panel.hidden && !force) {
        return probeAutoOpenIfReady();
      }

      const nextSourceKey = getSourceKey();
      const nextHintKey = getHintKey();

      if (nextSourceKey === lastSourceKey) {
        if (
          activeRefreshRequestId > 0 &&
          activeRefreshSourceKey === nextSourceKey &&
          currentDisplayLines.length === 0
        ) {
          lastHintKey = nextHintKey;
          return Promise.resolve();
        }

        if (currentDisplayLines.length > 0) {
          lastHintKey = nextHintKey;
          return Promise.resolve();
        }

        if (force && currentDisplayLines.length === 0) {
          pendingAutoRefreshAttempts = Math.max(
            pendingAutoRefreshAttempts,
            autoRefreshRetryAttempts,
          );
          return refreshCaptions({ ignoreScriptCaptions: true });
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

    function applyOpenState(isOpen) {
      panelParts.panel.hidden = !isOpen;
      root.classList.toggle(OPEN_CLASS, isOpen);
    }

    function probeAutoOpenIfReady() {
      if (!autoOpenEnabled || autoOpenSuppressed || !panelParts.panel.hidden) {
        return Promise.resolve();
      }

      pendingAutoRefreshAttempts = Math.max(
        pendingAutoRefreshAttempts,
        autoRefreshRetryAttempts,
      );

      return refreshCaptions({
        openWhenComplete: true,
        requireCompleteSource: true,
      });
    }

    function setOpen(isOpen, { suppressAutoOpen = false } = {}) {
      applyOpenState(isOpen);
      if (isOpen) {
        autoOpenSuppressed = false;
        startAutoRefresh();
        return refreshCaptionsWithRetryWindow();
      }

      if (suppressAutoOpen) {
        autoOpenSuppressed = true;
      }

      if (!autoOpenEnabled || autoOpenSuppressed) {
        stopAutoRefresh();
      }

      return Promise.resolve();
    }

    function getCaptionCopyText(lines = currentDisplayLines) {
      return lines
        .flatMap((line) =>
          typeof line === "string"
            ? [line]
            : [line.original, line.translation].filter(Boolean),
        )
        .join("\n");
    }

    function getSerializableDisplayLines() {
      return currentDisplayLines.map((line) => {
        if (typeof line === "string") {
          return line;
        }

        const serializedLine = {};

        if (line.original) {
          serializedLine.original = line.original;
        }

        if (line.translation) {
          serializedLine.translation = line.translation;
        }

        return serializedLine;
      });
    }

    function getCaptionBoardState() {
      return {
        author: currentVideoMetrics.author,
        canDecreaseFont: fontScale > MIN_FONT_SCALE,
        canIncreaseFont: fontScale < MAX_FONT_SCALE,
        copyText: getCaptionCopyText(),
        displayMode,
        fontScale,
        lines: getSerializableDisplayLines(),
        metrics: getVideoMetricItems(currentVideoMetrics),
        potential: currentVideoMetrics.potential,
        status: panelParts.status.textContent,
        videoDetails: {
          original: panelParts.detailsOriginal.textContent,
          translation: currentDetailsTranslation,
        },
        warnings: getWarningLabels(currentVideoMetrics),
      };
    }

    async function copyCaptions() {
      const copyText = getCaptionCopyText();

      if (!copyText) {
        setStatus("没有可复制的字幕。");
        return;
      }

      if (!navigatorRef.clipboard?.writeText) {
        setStatus("复制失败，请手动选择字幕。");
        return;
      }

      try {
        await navigatorRef.clipboard.writeText(copyText);
        setStatus("字幕已复制。");
      } catch (error) {
        console.error(error);
        setStatus("复制失败，请手动选择字幕。");
      }
    }

    async function copyVideoDetailsOriginal() {
      const copyText = panelParts.detailsOriginal.textContent.trim();

      if (!copyText || copyText === "暂无视频详情。") {
        setStatus("没有可复制的视频介绍。");
        return;
      }

      if (!navigatorRef.clipboard?.writeText) {
        setStatus("复制失败，请手动选择视频介绍。");
        return;
      }

      try {
        await navigatorRef.clipboard.writeText(copyText);
        setStatus("视频介绍原文已复制。");
      } catch (error) {
        console.error(error);
        setStatus("复制失败，请手动选择视频介绍。");
      }
    }

    function refreshCaptionsWithRetryWindow() {
      pendingAutoRefreshAttempts = Math.max(
        pendingAutoRefreshAttempts,
        autoRefreshRetryAttempts,
      );

      return refreshCaptions();
    }

    function hasIncompleteVideoInfo() {
      return panelParts.detailsOriginal.textContent === "暂无视频详情。";
    }

    function refreshAfterTikTokApiPayload() {
      if (panelParts.panel.hidden) {
        return probeAutoOpenIfReady();
      }

      if (currentDisplayLines.length > 0 && !hasIncompleteVideoInfo()) {
        return Promise.resolve();
      }

      pendingAutoRefreshAttempts = Math.max(
        pendingAutoRefreshAttempts,
        autoRefreshRetryAttempts,
      );

      return refreshCaptions({ ignoreScriptCaptions: true });
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

    async function updateFontScale(delta) {
      applyFontScale(fontScale + delta);
      await saveStoredOverlayValue(storageArea, FONT_SCALE_STORAGE_KEY, fontScale);
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
        x: buttonDragState.startFrame.x,
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

      return setOpen(panelParts.panel.hidden, {
        suppressAutoOpen: !panelParts.panel.hidden,
      });
    });
    for (const [mode, modeButton] of Object.entries(panelParts.modeButtons)) {
      modeButton.addEventListener("click", () => updateDisplayMode(mode));
    }
    panelParts.closeButton.addEventListener("click", () => setOpen(false, { suppressAutoOpen: true }));
    panelParts.fontDecreaseButton.addEventListener("click", () => updateFontScale(-FONT_SCALE_STEP));
    panelParts.fontIncreaseButton.addEventListener("click", () => updateFontScale(FONT_SCALE_STEP));
    panelParts.refreshButton.addEventListener("click", refreshCaptionsWithRetryWindow);
    panelParts.copyButton.addEventListener("click", copyCaptions);
    panelParts.detailsCopyButton.addEventListener("click", copyVideoDetailsOriginal);
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
      authorAvatar: panelParts.authorAvatar,
      authorFallback: panelParts.authorFallback,
      authorLink: panelParts.authorLink,
      authorName: panelParts.authorName,
      button,
      captionList: panelParts.captionList,
      closeButton: panelParts.closeButton,
      copyButton: panelParts.copyButton,
      detailsResizeHandle: panelParts.detailsResizeHandle,
      adjustFontScale: updateFontScale,
      fontDecreaseButton: panelParts.fontDecreaseButton,
      fontIncreaseButton: panelParts.fontIncreaseButton,
      getCaptionBoardState,
      languageWarning: panelParts.warningBadges,
      modeButtons: panelParts.modeButtons,
      destroy() {
        stopAutoRefresh();
        activeTikTokCaptionOverlays.delete(overlay);
        root.remove();
      },
      navigator: navigatorRef,
      panel: panelParts.panel,
      panelHeader: panelParts.header,
      potentialBadge: panelParts.potentialBadge,
      ready,
      refreshAfterTikTokApiPayload,
      refreshButton: panelParts.refreshButton,
      refreshCaptions,
      refreshCaptionsIfSourceChanged,
      setDisplayMode: updateDisplayMode,
      resizeHandle: panelParts.resizeHandle,
      resizeHandles: panelParts.resizeHandles,
      root,
      status: panelParts.status,
      videoDetails: panelParts.videoDetails,
      detailsOriginal: panelParts.detailsOriginal,
      detailsCopyButton: panelParts.detailsCopyButton,
      detailsTranslation: panelParts.detailsTranslation,
      actions: panelParts.actions,
      modeGroup: panelParts.modeGroup,
      videoInfo: panelParts.videoInfo,
      warningBadges: panelParts.warningBadges,
    };

    activeTikTokCaptionOverlays.add(overlay);
    root.__msjTikTokCaptionOverlay = overlay;
    return overlay;
  }

  globalThis.MultiSearchJumpTikTokCaptions = {
    createCaptionOverlay,
    createTikTokCardMetricsOverlay,
    extractCaptionLines,
    extractTikTokVideoId,
    getCaptionSourceKey,
    ingestTikTokApiPayload,
    normalizeCaptionText,
    translateEnglishCaptionToChinese,
  };
})();
