(() => {
  const ROOT_CLASS = "msj-tiktok-caption-root";
  const OPEN_CLASS = "is-open";
  const CAPTION_TEXT_SELECTOR = [
    "[data-e2e*='subtitle' i]",
    "[data-e2e*='caption' i]",
    "[class*='subtitle' i]",
    "[class*='caption' i]",
    "[aria-label*='subtitle' i]",
    "[aria-label*='caption' i]",
    "track[kind='captions']",
    "track[kind='subtitles']",
  ].join(",");
  const DIRECT_CAPTION_TEXT_KEYS = new Set([
    "caption",
    "captionText",
    "subtitle",
    "subtitleText",
  ]);
  const CAPTION_CONTAINER_KEYS = new Set([
    "caption",
    "captions",
    "subtitle",
    "subtitles",
    "subtitleInfo",
    "subtitleInfos",
  ]);
  const NESTED_CAPTION_TEXT_KEYS = new Set([
    "caption",
    "captionText",
    "subtitles",
    "subtitle",
    "subtitleText",
    "text",
  ]);

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

  function collectDomCaptionLines(root, lines, seen) {
    for (const node of root?.querySelectorAll?.(CAPTION_TEXT_SELECTOR) ?? []) {
      if (isHiddenNode(node)) {
        continue;
      }

      appendUniqueLine(lines, seen, node.textContent);
    }
  }

  function isRelevantCaptionKey(key) {
    return CAPTION_CONTAINER_KEYS.has(key) || /caption|subtitle/iu.test(key);
  }

  function shouldCollectScriptString(key, isInsideCaption) {
    return (
      DIRECT_CAPTION_TEXT_KEYS.has(key) ||
      (isInsideCaption && (NESTED_CAPTION_TEXT_KEYS.has(key) || isRelevantCaptionKey(key)))
    );
  }

  function collectCaptionStrings(value, lines, seen, key = "", isInsideCaption = false) {
    if (typeof value === "string") {
      if (shouldCollectScriptString(key, isInsideCaption)) {
        appendUniqueLine(lines, seen, value);
      }
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        collectCaptionStrings(item, lines, seen, key, isInsideCaption || isRelevantCaptionKey(key));
      }
      return;
    }

    for (const [nextKey, nextValue] of Object.entries(value)) {
      const normalizedKey = nextKey.trim();

      collectCaptionStrings(
        nextValue,
        lines,
        seen,
        normalizedKey,
        isInsideCaption || isRelevantCaptionKey(key) || isRelevantCaptionKey(normalizedKey),
      );
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

  function collectScriptCaptionLines(root, lines, seen) {
    for (const script of root?.querySelectorAll?.("script") ?? []) {
      const payload = parseScriptJson(script.textContent);

      if (payload) {
        collectCaptionStrings(payload, lines, seen);
      }
    }
  }

  function extractCaptionLines(root = document) {
    const lines = [];
    const seen = new Set();

    collectDomCaptionLines(root, lines, seen);
    collectScriptCaptionLines(root, lines, seen);

    return lines;
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

      item.textContent = line;
      captionList.append(item);
    }
  }

  function createCaptionOverlay({
    document: documentRef = document,
    getRoot = () => documentRef,
    navigator: navigatorRef = navigator,
  } = {}) {
    const existingRoot = documentRef.querySelector?.(`.${ROOT_CLASS}`);

    if (existingRoot?.__msjTikTokCaptionOverlay) {
      return existingRoot.__msjTikTokCaptionOverlay;
    }

    const root = documentRef.createElement("div");
    const button = createButton(documentRef);
    const panelParts = createPanel(documentRef);
    let currentLines = [];

    root.classList.add(ROOT_CLASS);
    root.append(button, panelParts.panel);
    documentRef.body?.append(root);

    function setStatus(message) {
      panelParts.status.textContent = message;
    }

    function refreshCaptions() {
      setStatus("正在读取字幕。");

      try {
        currentLines = extractCaptionLines(getRoot());
        renderCaptionLines({
          captionList: panelParts.captionList,
          documentRef,
          lines: currentLines,
        });

        setStatus(
          currentLines.length > 0
            ? `已读取 ${currentLines.length} 条字幕。`
            : "未检测到可读取字幕。",
        );
      } catch (error) {
        console.error(error);
        currentLines = [];
        renderCaptionLines({
          captionList: panelParts.captionList,
          documentRef,
          lines: currentLines,
        });
        setStatus("字幕读取失败。");
      }
    }

    function setOpen(isOpen) {
      panelParts.panel.hidden = !isOpen;
      root.classList.toggle(OPEN_CLASS, isOpen);

      if (isOpen) {
        refreshCaptions();
      }
    }

    async function copyCaptions() {
      if (currentLines.length === 0) {
        setStatus("没有可复制的字幕。");
        return;
      }

      if (!navigatorRef.clipboard?.writeText) {
        setStatus("复制失败，请手动选择字幕。");
        return;
      }

      try {
        await navigatorRef.clipboard.writeText(currentLines.join("\n"));
        setStatus("字幕已复制。");
      } catch (error) {
        console.error(error);
        setStatus("复制失败，请手动选择字幕。");
      }
    }

    button.addEventListener("click", () => {
      setOpen(panelParts.panel.hidden);
    });
    panelParts.closeButton.addEventListener("click", () => setOpen(false));
    panelParts.refreshButton.addEventListener("click", refreshCaptions);
    panelParts.copyButton.addEventListener("click", copyCaptions);

    const overlay = {
      button,
      captionList: panelParts.captionList,
      closeButton: panelParts.closeButton,
      copyButton: panelParts.copyButton,
      navigator: navigatorRef,
      panel: panelParts.panel,
      refreshButton: panelParts.refreshButton,
      refreshCaptions,
      root,
      status: panelParts.status,
    };

    root.__msjTikTokCaptionOverlay = overlay;
    return overlay;
  }

  globalThis.MultiSearchJumpTikTokCaptions = {
    createCaptionOverlay,
    extractCaptionLines,
    normalizeCaptionText,
  };
})();
