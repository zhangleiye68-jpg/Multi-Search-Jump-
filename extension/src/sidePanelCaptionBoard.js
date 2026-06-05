import { TIKTOK_CAPTION_BACKGROUND_MESSAGE_TYPE } from "./tiktokCaptionBackgroundBridge.js";

export const CAPTION_BOARD_MESSAGE_TYPES = Object.freeze({
  ADJUST_FONT_SCALE: "MSJ_TIKTOK_CAPTION_ADJUST_FONT_SCALE",
  GET_STATE: "MSJ_TIKTOK_CAPTION_GET_STATE",
  REFRESH: "MSJ_TIKTOK_CAPTION_REFRESH",
  REFRESH_IF_SOURCE_CHANGED: "MSJ_TIKTOK_CAPTION_REFRESH_IF_SOURCE_CHANGED",
  SET_DISPLAY_MODE: "MSJ_TIKTOK_CAPTION_SET_DISPLAY_MODE",
  SET_OPEN: "MSJ_TIKTOK_CAPTION_SET_OPEN",
});

const DISPLAY_MODES = new Set(["original", "bilingual", "chinese"]);
const AUTO_REFRESH_INTERVAL_MS = 800;
const CONNECTING_STATUS = "正在连接 TikTok 字幕看板。";
const RECOVERING_STATUS = "字幕看板连接恢复中。";

function normalizeCaptionState(value = {}) {
  return {
    author: normalizeAuthorInfo(value.author),
    canDecreaseFont: value.canDecreaseFont === true,
    canIncreaseFont: value.canIncreaseFont === true,
    copyText: typeof value.copyText === "string" ? value.copyText : "",
    displayMode: DISPLAY_MODES.has(value.displayMode) ? value.displayMode : "bilingual",
    fontScale: Number.isFinite(value.fontScale) ? value.fontScale : 100,
    lines: Array.isArray(value.lines) ? value.lines : [],
    metrics: Array.isArray(value.metrics) ? value.metrics : [],
    potential: value.potential && typeof value.potential === "object" ? value.potential : null,
    status: typeof value.status === "string" ? value.status : "",
    videoDetails: value.videoDetails && typeof value.videoDetails === "object"
      ? value.videoDetails
      : { original: "", translation: "" },
    warnings: Array.isArray(value.warnings) ? value.warnings : [],
  };
}

function normalizeAuthorInfo(value = {}) {
  return {
    avatarUrl: typeof value.avatarUrl === "string" ? value.avatarUrl : "",
    name: typeof value.name === "string" ? value.name : "",
    profileUrl: typeof value.profileUrl === "string" ? value.profileUrl : "",
    uniqueId: typeof value.uniqueId === "string" ? value.uniqueId : "",
  };
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasRenderableCaptionState(state) {
  return (
    state.lines.some((line) => (
      typeof line === "string"
        ? hasText(line)
        : hasText(line?.original) || hasText(line?.translation)
    )) ||
    state.metrics.some((metric) => hasText(metric?.value)) ||
    hasText(state.potential?.label) ||
    hasText(state.videoDetails.original) ||
    hasText(state.videoDetails.translation) ||
    state.warnings.some(hasText)
  );
}

function isTransientEmptyState(state) {
  return (
    !hasRenderableCaptionState(state) &&
    /(?:正在|读取中|加载中|刷新中)/u.test(state.status)
  );
}

export function isTikTokTab(tab) {
  try {
    const url = new URL(tab?.url ?? "");
    return url.protocol === "https:" && url.hostname === "www.tiktok.com";
  } catch {
    return false;
  }
}

function setText(element, value) {
  if (element) {
    element.textContent = value ?? "";
  }
}

function appendTextItem(documentRef, container, className, value) {
  const item = documentRef.createElement("span");

  item.className = className;
  item.textContent = value;
  container.append(item);

  return item;
}

function renderCaptionLine(documentRef, container, line) {
  const item = documentRef.createElement("p");

  if (typeof line === "string") {
    item.textContent = line;
    container.append(item);
    return;
  }

  if (line?.original) {
    const original = appendTextItem(
      documentRef,
      item,
      "caption-board-original msj-tiktok-caption-original",
      line.original,
    );
    original.lang = "en";
  }

  if (line?.translation) {
    const translation = appendTextItem(
      documentRef,
      item,
      "caption-board-translation msj-tiktok-caption-translation",
      line.translation,
    );
    translation.lang = "zh-CN";
  }

  container.append(item);
}

function renderMetric(documentRef, container, metric) {
  const item = documentRef.createElement("span");
  const icon = documentRef.createElement("span");
  const value = documentRef.createElement("span");

  item.className = "caption-board-metric";
  item.title = metric.label ?? "";
  icon.className = "caption-board-metric-icon";
  icon.textContent = `${metric.icon ?? ""} `;
  icon.setAttribute("aria-hidden", "true");
  value.className = "caption-board-metric-value";
  value.textContent = metric.value ?? "";
  item.append(icon, value);
  container.append(item);
}

function renderWarnings(documentRef, container, warnings) {
  container.textContent = "";
  container.hidden = warnings.length === 0;

  for (const warning of warnings) {
    appendTextItem(documentRef, container, "caption-board-warning", warning);
  }
}

function renderAuthor(elements, author) {
  if (!elements.authorLink) {
    return;
  }

  const authorName = author.name || (author.uniqueId ? `@${author.uniqueId}` : "");
  const hasAuthor = hasText(authorName) || hasText(author.profileUrl) || hasText(author.avatarUrl);

  elements.authorLink.hidden = !hasAuthor;
  setText(elements.authorName, authorName);

  if (!hasAuthor) {
    elements.authorLink.removeAttribute?.("href");
    elements.authorLink.title = "";
    if (elements.authorAvatar) {
      elements.authorAvatar.hidden = true;
      elements.authorAvatar.src = "";
      elements.authorAvatar.alt = "作者头像";
    }
    if (elements.authorFallback) {
      elements.authorFallback.hidden = true;
      elements.authorFallback.textContent = "";
    }
    return;
  }

  if (author.profileUrl) {
    elements.authorLink.href = author.profileUrl;
    elements.authorLink.target = "_blank";
    elements.authorLink.rel = "noopener noreferrer";
    elements.authorLink.title = author.uniqueId ? `打开 @${author.uniqueId} 主页` : "打开作者主页";
  } else {
    elements.authorLink.removeAttribute?.("href");
    elements.authorLink.title = "";
  }

  if (elements.authorAvatar) {
    elements.authorAvatar.hidden = !author.avatarUrl;
    elements.authorAvatar.src = author.avatarUrl || "";
    elements.authorAvatar.alt = authorName ? `${authorName} 头像` : "作者头像";
  }

  if (elements.authorFallback) {
    elements.authorFallback.hidden = Boolean(author.avatarUrl);
    elements.authorFallback.textContent = (authorName.replace(/^@/u, "").trim().charAt(0) || "T").toUpperCase();
  }
}

export function renderCaptionBoardState(elements, stateValue, documentRef = document) {
  const state = normalizeCaptionState(stateValue);

  elements.section.hidden = false;
  elements.unavailable.hidden = true;
  if (elements.section.style) {
    elements.section.style.fontSize = `${state.fontScale}%`;
  }
  setText(elements.status, state.status);
  renderAuthor(elements, state.author);
  setText(elements.detailsOriginal, state.videoDetails.original ?? "");
  setText(elements.detailsTranslation, state.videoDetails.translation ?? "");

  elements.captionList.textContent = "";
  for (const line of state.lines) {
    renderCaptionLine(documentRef, elements.captionList, line);
  }

  elements.metrics.textContent = "";
  for (const metric of state.metrics) {
    renderMetric(documentRef, elements.metrics, metric);
  }

  if (elements.potentialBadge) {
    elements.potentialBadge.textContent = state.potential?.label ?? "";
    elements.potentialBadge.classList.remove("is-high", "is-mid", "is-low");
    if (state.potential?.className) {
      elements.potentialBadge.classList.add(state.potential.className);
    }
  }

  renderWarnings(documentRef, elements.warnings, state.warnings);

  for (const [mode, button] of Object.entries(elements.modeButtons)) {
    const isActive = state.displayMode === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }

  elements.fontDecreaseButton.disabled = !state.canDecreaseFont;
  elements.fontIncreaseButton.disabled = !state.canIncreaseFont;

  return state;
}

function hideCaptionBoard(elements) {
  elements.section.hidden = true;
  elements.unavailable.hidden = true;
}

export function initCaptionBoardUi({
  clipboard = globalThis.navigator?.clipboard,
  document: documentRef = document,
  elements,
  extensionRuntimeApi = globalThis.chrome?.runtime,
  intervalMs = AUTO_REFRESH_INTERVAL_MS,
  runtimeApi = globalThis.chrome?.tabs,
  setInterval: setIntervalRef = globalThis.setInterval?.bind(globalThis),
  clearInterval: clearIntervalRef = globalThis.clearInterval?.bind(globalThis),
  sidePanelApi = globalThis.chrome?.sidePanel,
  tabsApi = globalThis.chrome?.tabs,
  window: windowRef = globalThis.window,
  windowsApi = globalThis.chrome?.windows,
} = {}) {
  let connectedTabId = null;
  let connectedWindowId = null;
  let currentState = normalizeCaptionState();
  let intervalId = null;

  async function sendToTab(tabId, message) {
    if (!Number.isInteger(tabId)) {
      return { ok: false, error: "No active TikTok tab" };
    }

    let directError = null;
    let directResponse;

    try {
      directResponse = await runtimeApi?.sendMessage?.(tabId, message);
    } catch (error) {
      directError = error;
    }

    if (directResponse?.ok) {
      return directResponse;
    }

    if (extensionRuntimeApi?.sendMessage) {
      const backgroundResponse = await extensionRuntimeApi.sendMessage({
        command: message,
        tabId,
        type: TIKTOK_CAPTION_BACKGROUND_MESSAGE_TYPE,
      });

      if (backgroundResponse?.ok || !directResponse) {
        return backgroundResponse;
      }
    }

    if (directResponse) {
      return directResponse;
    }

    throw directError ?? new Error("Unable to read TikTok captions");
  }

  function assertOkResponse(response) {
    if (!response?.ok) {
      throw new Error(response?.error ?? "Unable to read TikTok captions");
    }

    return response;
  }

  function applyCaptionState(stateValue, { preserveRenderable = false } = {}) {
    const nextState = normalizeCaptionState(stateValue);

    if (
      preserveRenderable &&
      hasRenderableCaptionState(currentState) &&
      isTransientEmptyState(nextState)
    ) {
      return currentState;
    }

    currentState = renderCaptionBoardState(elements, nextState, documentRef);
    return currentState;
  }

  function showConnectionPendingStatus() {
    elements.section.hidden = false;
    elements.unavailable.hidden = true;
    setText(
      elements.status,
      hasRenderableCaptionState(currentState) ? RECOVERING_STATUS : CONNECTING_STATUS,
    );

    return currentState;
  }

  async function readCaptionStateFromTab(tabId, options) {
    const response = assertOkResponse(await sendToTab(tabId, {
      type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE,
    }));

    connectedTabId = tabId;

    return applyCaptionState(response.state, options);
  }

  async function readConnectedCaptionState(options) {
    return readCaptionStateFromTab(connectedTabId, options);
  }

  async function sendCommandToConnectedTab(message) {
    return assertOkResponse(await sendToTab(connectedTabId, message));
  }

  async function closeSidePanel() {
    function closeCurrentSidePanelWindow() {
      if (typeof windowRef?.close !== "function") {
        return false;
      }

      windowRef.close();
      return true;
    }

    if (!sidePanelApi?.close) {
      if (!closeCurrentSidePanelWindow()) {
        setText(elements.status, "已打开字幕悬浮窗。当前浏览器不支持自动隐藏侧边栏。");
      }
      return;
    }

    const currentWindow = Number.isInteger(connectedWindowId)
      ? { id: connectedWindowId }
      : await windowsApi?.getCurrent?.();

    if (!Number.isInteger(currentWindow?.id)) {
      closeCurrentSidePanelWindow();
      return;
    }

    try {
      await sidePanelApi.close({ windowId: currentWindow.id });
    } catch (error) {
      console.error(error);
      if (!closeCurrentSidePanelWindow()) {
        setText(elements.status, "已打开字幕悬浮窗，但无法自动隐藏侧边栏。");
      }
    }
  }

  async function runCommand(message) {
    try {
      await sendCommandToConnectedTab(message);
      return await readConnectedCaptionState({ preserveRenderable: true });
    } catch {
      return showConnectionPendingStatus();
    }
  }

  async function syncActiveTab() {
    const [activeTab] = await tabsApi.query({ active: true, currentWindow: true });

    if (!isTikTokTab(activeTab)) {
      connectedTabId = null;
      connectedWindowId = null;
      currentState = normalizeCaptionState();
      hideCaptionBoard(elements);
      return null;
    }

    elements.section.hidden = false;
    elements.unavailable.hidden = true;

    try {
      await readCaptionStateFromTab(activeTab.id);
      connectedWindowId = activeTab.windowId ?? null;
      await sendCommandToConnectedTab({
        force: true,
        type: CAPTION_BOARD_MESSAGE_TYPES.REFRESH_IF_SOURCE_CHANGED,
      });
      return readConnectedCaptionState({ preserveRenderable: true });
    } catch {
      return showConnectionPendingStatus();
    }
  }

  elements.refreshButton.addEventListener("click", () =>
    runCommand({ type: CAPTION_BOARD_MESSAGE_TYPES.REFRESH }),
  );

  for (const [displayMode, button] of Object.entries(elements.modeButtons)) {
    button.addEventListener("click", () =>
      runCommand({
        displayMode,
        type: CAPTION_BOARD_MESSAGE_TYPES.SET_DISPLAY_MODE,
      }),
    );
  }

  elements.fontDecreaseButton.addEventListener("click", () =>
    runCommand({
      delta: -10,
      type: CAPTION_BOARD_MESSAGE_TYPES.ADJUST_FONT_SCALE,
    }),
  );
  elements.fontIncreaseButton.addEventListener("click", () =>
    runCommand({
      delta: 10,
      type: CAPTION_BOARD_MESSAGE_TYPES.ADJUST_FONT_SCALE,
    }),
  );
  elements.floatingButton?.addEventListener("click", async () => {
    if (!Number.isInteger(connectedTabId)) {
      await syncActiveTab();
    }

    try {
      await sendCommandToConnectedTab({
        open: true,
        type: CAPTION_BOARD_MESSAGE_TYPES.SET_OPEN,
      });
      await readConnectedCaptionState({ preserveRenderable: true });
      await closeSidePanel();
    } catch {
      showConnectionPendingStatus();
    }
  });
  elements.copyButton.addEventListener("click", async () => {
    if (!currentState.copyText) {
      setText(elements.status, "没有可复制的字幕。");
      return;
    }

    try {
      await clipboard?.writeText?.(currentState.copyText);
      setText(elements.status, "字幕已复制。");
    } catch (error) {
      console.error(error);
      setText(elements.status, "复制失败，请手动选择字幕。");
    }
  });
  elements.detailsCopyButton?.addEventListener("click", async () => {
    const originalDetails = currentState.videoDetails.original.trim();

    if (!originalDetails || originalDetails === "暂无视频详情。") {
      setText(elements.status, "没有可复制的视频介绍。");
      return;
    }

    try {
      await clipboard?.writeText?.(originalDetails);
      setText(elements.status, "视频介绍原文已复制。");
    } catch (error) {
      console.error(error);
      setText(elements.status, "复制失败，请手动选择视频介绍。");
    }
  });

  hideCaptionBoard(elements);

  if (setIntervalRef && intervalMs > 0) {
    intervalId = setIntervalRef(syncActiveTab, intervalMs);
  }

  return {
    destroy() {
      if (intervalId !== null) {
        clearIntervalRef?.(intervalId);
      }
    },
    renderState(state) {
      currentState = renderCaptionBoardState(elements, state, documentRef);
      return currentState;
    },
    syncActiveTab,
  };
}
