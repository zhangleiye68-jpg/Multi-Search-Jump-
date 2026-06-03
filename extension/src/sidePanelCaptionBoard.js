export const CAPTION_BOARD_MESSAGE_TYPES = Object.freeze({
  ADJUST_FONT_SCALE: "MSJ_TIKTOK_CAPTION_ADJUST_FONT_SCALE",
  GET_STATE: "MSJ_TIKTOK_CAPTION_GET_STATE",
  REFRESH: "MSJ_TIKTOK_CAPTION_REFRESH",
  REFRESH_IF_SOURCE_CHANGED: "MSJ_TIKTOK_CAPTION_REFRESH_IF_SOURCE_CHANGED",
  SET_DISPLAY_MODE: "MSJ_TIKTOK_CAPTION_SET_DISPLAY_MODE",
});

const DISPLAY_MODES = new Set(["original", "bilingual", "chinese"]);

function normalizeCaptionState(value = {}) {
  return {
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
    return url.hostname === "tiktok.com" || url.hostname.endsWith(".tiktok.com");
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

export function renderCaptionBoardState(elements, stateValue, documentRef = document) {
  const state = normalizeCaptionState(stateValue);

  elements.section.hidden = false;
  elements.unavailable.hidden = true;
  setText(elements.status, state.status);
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
  intervalMs = 1200,
  runtimeApi = chrome.tabs,
  setInterval: setIntervalRef = globalThis.setInterval?.bind(globalThis),
  clearInterval: clearIntervalRef = globalThis.clearInterval?.bind(globalThis),
  tabsApi = chrome.tabs,
} = {}) {
  let activeTabId = null;
  let currentState = normalizeCaptionState();
  let intervalId = null;

  async function sendToActiveTab(message) {
    if (!activeTabId) {
      return { ok: false, error: "No active TikTok tab" };
    }

    return runtimeApi.sendMessage(activeTabId, message);
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

  async function readCaptionState(options) {
    const response = await sendToActiveTab({
      type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE,
    });

    if (!response?.ok) {
      throw new Error(response?.error ?? "Unable to read TikTok captions");
    }

    return applyCaptionState(response.state, options);
  }

  async function runCommand(message) {
    await sendToActiveTab(message);
    return readCaptionState({ preserveRenderable: true });
  }

  async function syncActiveTab() {
    const [activeTab] = await tabsApi.query({ active: true, currentWindow: true });

    if (!isTikTokTab(activeTab)) {
      activeTabId = null;
      hideCaptionBoard(elements);
      return null;
    }

    if (activeTabId !== activeTab.id) {
      currentState = normalizeCaptionState();
    }

    activeTabId = activeTab.id;
    elements.section.hidden = false;
    elements.unavailable.hidden = true;

    try {
      await readCaptionState();
      await sendToActiveTab({
        type: CAPTION_BOARD_MESSAGE_TYPES.REFRESH_IF_SOURCE_CHANGED,
      });
      return readCaptionState({ preserveRenderable: true });
    } catch (error) {
      console.error(error);
      setText(elements.status, "无法连接 TikTok 字幕看板。");
      return null;
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
