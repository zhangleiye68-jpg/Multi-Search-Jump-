(() => {
  const ROOT_CLASS = "msj-tiktok-caption-root";
  const OPEN_CLASS = "is-open";
  const GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
  const CAPTION_TEXT_SELECTOR = [
    "[data-e2e*='subtitle' i]",
    "[data-e2e*='caption' i]",
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

  function collectDomCaptionEntries(root, entries, seen) {
    for (const node of root?.querySelectorAll?.(CAPTION_TEXT_SELECTOR) ?? []) {
      if (
        isHiddenNode(node) ||
        isExtensionNode(node) ||
        isExcludedDomCaptionNode(node)
      ) {
        continue;
      }

      const sourceUrl = node.getAttribute?.("src");

      if (sourceUrl) {
        appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.url, sourceUrl);
      } else if (isLikelyDomCaptionText(node.textContent)) {
        appendUniqueEntry(entries, seen, SUBTITLE_ENTRY_TYPES.text, node.textContent);
      }
    }
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

  function collectDomCaptionLines(root, fetchCaption) {
    const domEntries = [];
    const domSeen = new Set();

    collectDomCaptionEntries(root, domEntries, domSeen);

    return resolveCaptionEntries(domEntries, fetchCaption);
  }

  function collectScriptCaptionLines(root, fetchCaption) {
    const scriptEntries = [];
    const scriptSeen = new Set();

    collectScriptCaptionEntries(root, scriptEntries, scriptSeen);

    return resolveCaptionEntries(scriptEntries, fetchCaption);
  }

  async function extractCaptionLines(
    root = document,
    {
      fetchCaption = getDefaultFetchApi(),
      ignoreScriptCaptions = false,
      preferDomCaptions = false,
    } = {},
  ) {
    if (preferDomCaptions) {
      const domLines = await collectDomCaptionLines(root, fetchCaption);

      if (domLines.length > 0) {
        return domLines;
      }
    }

    if (!ignoreScriptCaptions) {
      const scriptLines = await collectScriptCaptionLines(root, fetchCaption);

      if (scriptLines.length > 0) {
        return scriptLines;
      }
    }

    return preferDomCaptions ? [] : collectDomCaptionLines(root, fetchCaption);
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
    const source = video?.querySelector?.("source");
    const videoSource = normalizeCaptionText(
      video?.currentSrc ||
        video?.src ||
        video?.getAttribute?.("src") ||
        source?.src ||
        source?.getAttribute?.("src") ||
        "",
    );
    const locationHref = normalizeCaptionText(
      documentRef?.location?.href || globalThis.location?.href || "",
    );

    return `${locationHref}|${videoSource}`;
  }

  function hasConcreteVideoSourceKey(sourceKey) {
    const normalizedSourceKey = String(sourceKey ?? "");
    const separatorIndex = normalizedSourceKey.lastIndexOf("|");

    return separatorIndex >= 0 && normalizeCaptionText(normalizedSourceKey.slice(separatorIndex + 1)) !== "";
  }

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

    header.append(title, closeButton);
    actions.append(refreshButton, copyButton);
    panel.append(header, status, captionList, actions);

    return {
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
    getSourceKey = () => getCaptionSourceKey(documentRef),
    navigator: navigatorRef = navigator,
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
    let currentLines = [];
    let currentDisplayLines = [];
    let lastSourceKey = getSourceKey();
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

    async function refreshCaptions({ ignoreScriptCaptions = false } = {}) {
      const requestId = ++refreshRequestId;
      const nextSourceKey = getSourceKey();
      const shouldIgnoreScriptCaptions =
        ignoreScriptCaptions ||
        nextSourceKey !== lastSourceKey ||
        hasConcreteVideoSourceKey(nextSourceKey);

      lastSourceKey = nextSourceKey;
      setStatus("正在读取字幕。");

      try {
        const nextLines = await extractCaptionLines(getRoot(), {
          ignoreScriptCaptions: shouldIgnoreScriptCaptions,
          preferDomCaptions: true,
        });
        const displayLines = await translateCaptionLines(nextLines, translateCaption);

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

      if (nextSourceKey === lastSourceKey) {
        if (pendingAutoRefreshAttempts > 0 && currentDisplayLines.length === 0) {
          pendingAutoRefreshAttempts -= 1;
          return refreshCaptions({ ignoreScriptCaptions: true });
        }

        return Promise.resolve();
      }

      lastSourceKey = nextSourceKey;
      refreshRequestId += 1;
      pendingAutoRefreshAttempts = autoRefreshRetryAttempts;
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
        return refreshCaptions();
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
          .flatMap((line) => [line.original, line.translation].filter(Boolean))
          .join("\n");

        await navigatorRef.clipboard.writeText(copyText);
        setStatus("字幕已复制。");
      } catch (error) {
        console.error(error);
        setStatus("复制失败，请手动选择字幕。");
      }
    }

    button.addEventListener("click", () => setOpen(panelParts.panel.hidden));
    panelParts.closeButton.addEventListener("click", () => setOpen(false));
    panelParts.refreshButton.addEventListener("click", refreshCaptions);
    panelParts.copyButton.addEventListener("click", copyCaptions);

    const overlay = {
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
    getCaptionSourceKey,
    normalizeCaptionText,
    translateEnglishCaptionToChinese,
  };
})();
