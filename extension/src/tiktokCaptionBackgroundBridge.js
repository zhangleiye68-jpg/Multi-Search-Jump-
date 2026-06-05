export const TIKTOK_CAPTION_BACKGROUND_MESSAGE_TYPE =
  "MSJ_TIKTOK_CAPTION_BACKGROUND_COMMAND";
export const TIKTOK_CAPTION_OPEN_SIDE_PANEL_MESSAGE_TYPE =
  "MSJ_TIKTOK_CAPTION_OPEN_SIDE_PANEL";

const CAPTION_BOARD_MESSAGE_TYPES = Object.freeze({
  ADJUST_FONT_SCALE: "MSJ_TIKTOK_CAPTION_ADJUST_FONT_SCALE",
  GET_STATE: "MSJ_TIKTOK_CAPTION_GET_STATE",
  REFRESH: "MSJ_TIKTOK_CAPTION_REFRESH",
  REFRESH_IF_SOURCE_CHANGED: "MSJ_TIKTOK_CAPTION_REFRESH_IF_SOURCE_CHANGED",
  SET_DISPLAY_MODE: "MSJ_TIKTOK_CAPTION_SET_DISPLAY_MODE",
  SET_OPEN: "MSJ_TIKTOK_CAPTION_SET_OPEN",
});
const CAPTION_BOARD_MESSAGE_TYPE_VALUES = new Set(
  Object.values(CAPTION_BOARD_MESSAGE_TYPES),
);

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function isTikTokCaptionBackgroundMessage(message) {
  return message?.type === TIKTOK_CAPTION_BACKGROUND_MESSAGE_TYPE;
}

export function isTikTokCaptionOpenSidePanelMessage(message) {
  return message?.type === TIKTOK_CAPTION_OPEN_SIDE_PANEL_MESSAGE_TYPE;
}

export async function runTikTokCaptionOverlayCommand(command = {}) {
  const messageTypes = {
    ADJUST_FONT_SCALE: "MSJ_TIKTOK_CAPTION_ADJUST_FONT_SCALE",
    GET_STATE: "MSJ_TIKTOK_CAPTION_GET_STATE",
    REFRESH: "MSJ_TIKTOK_CAPTION_REFRESH",
    REFRESH_IF_SOURCE_CHANGED: "MSJ_TIKTOK_CAPTION_REFRESH_IF_SOURCE_CHANGED",
    SET_DISPLAY_MODE: "MSJ_TIKTOK_CAPTION_SET_DISPLAY_MODE",
    SET_OPEN: "MSJ_TIKTOK_CAPTION_SET_OPEN",
  };
  const typeValues = new Set(Object.values(messageTypes));

  if (!typeValues.has(command?.type)) {
    return {
      error: "Invalid TikTok caption command",
      ok: false,
    };
  }

  const overlay = document
    .querySelector(".msj-tiktok-caption-root")
    ?.__msjTikTokCaptionOverlay;

  if (!overlay) {
    return {
      error: "TikTok caption overlay is unavailable",
      ok: false,
    };
  }

  if (command.type === messageTypes.REFRESH) {
    await overlay.refreshCaptions();
  }

  if (command.type === messageTypes.REFRESH_IF_SOURCE_CHANGED) {
    await overlay.refreshCaptionsIfSourceChanged({ force: command.force === true });
  }

  if (command.type === messageTypes.SET_DISPLAY_MODE) {
    await overlay.setDisplayMode(command.displayMode);
  }

  if (command.type === messageTypes.ADJUST_FONT_SCALE) {
    await overlay.adjustFontScale(command.delta);
  }

  if (command.type === messageTypes.SET_OPEN) {
    await overlay.setOpen(command.open === true, {
      suppressAutoOpen: command.suppressAutoOpen === true,
    });
  }

  return {
    ok: true,
    state: overlay.getCaptionBoardState(),
  };
}

export async function handleTikTokCaptionOpenSidePanelMessage({
  message,
  sender,
  sidePanelApi,
  windowsApi,
} = {}) {
  if (!isTikTokCaptionOpenSidePanelMessage(message)) {
    return null;
  }

  if (!sidePanelApi?.open) {
    return {
      error: "Side panel is unavailable",
      ok: false,
    };
  }

  const currentWindow = Number.isInteger(sender?.tab?.windowId)
    ? { id: sender.tab.windowId }
    : await windowsApi?.getCurrent?.();
  const windowId = currentWindow?.id;

  if (!Number.isInteger(windowId)) {
    return {
      error: "Invalid browser window id",
      ok: false,
    };
  }

  await sidePanelApi.open({ windowId });

  return { ok: true };
}

export async function handleTikTokCaptionBackgroundMessage({
  message,
  scriptingApi,
} = {}) {
  if (!isTikTokCaptionBackgroundMessage(message)) {
    return null;
  }

  if (!Number.isInteger(message.tabId)) {
    return {
      error: "Invalid TikTok tab id",
      ok: false,
    };
  }

  if (!CAPTION_BOARD_MESSAGE_TYPE_VALUES.has(message.command?.type)) {
    return {
      error: "Invalid TikTok caption command",
      ok: false,
    };
  }

  if (!scriptingApi?.executeScript) {
    return {
      error: "TikTok caption background bridge is unavailable",
      ok: false,
    };
  }

  try {
    const [injectionResult] = await scriptingApi.executeScript({
      args: [message.command],
      func: runTikTokCaptionOverlayCommand,
      target: { tabId: message.tabId },
    });

    return injectionResult?.result ?? {
      error: "TikTok caption bridge returned no result",
      ok: false,
    };
  } catch (error) {
    return {
      error: toErrorMessage(error),
      ok: false,
    };
  }
}
