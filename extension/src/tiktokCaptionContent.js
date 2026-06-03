(() => {
  const CAPTION_BOARD_MESSAGE_TYPES = Object.freeze({
    ADJUST_FONT_SCALE: "MSJ_TIKTOK_CAPTION_ADJUST_FONT_SCALE",
    GET_STATE: "MSJ_TIKTOK_CAPTION_GET_STATE",
    REFRESH: "MSJ_TIKTOK_CAPTION_REFRESH",
    REFRESH_IF_SOURCE_CHANGED: "MSJ_TIKTOK_CAPTION_REFRESH_IF_SOURCE_CHANGED",
    SET_DISPLAY_MODE: "MSJ_TIKTOK_CAPTION_SET_DISPLAY_MODE",
  });
  const CAPTION_BOARD_MESSAGE_TYPE_VALUES = new Set(
    Object.values(CAPTION_BOARD_MESSAGE_TYPES),
  );
  let captionOverlay = null;

  function initTikTokCaptionOverlay() {
    captionOverlay =
      globalThis.MultiSearchJumpTikTokCaptions?.createCaptionOverlay?.() ??
      captionOverlay;
  }

  function waitForDocumentReady() {
    if (document.readyState !== "loading") {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  async function getCaptionOverlay() {
    await waitForDocumentReady();
    initTikTokCaptionOverlay();
    await captionOverlay?.ready;
    return captionOverlay;
  }

  async function handleCaptionBoardMessage(message) {
    if (!CAPTION_BOARD_MESSAGE_TYPE_VALUES.has(message?.type)) {
      return null;
    }

    const overlay = await getCaptionOverlay();

    if (!overlay) {
      return {
        error: "TikTok caption overlay is unavailable",
        ok: false,
      };
    }

    if (message.type === CAPTION_BOARD_MESSAGE_TYPES.REFRESH) {
      await overlay.refreshCaptions();
    }

    if (message.type === CAPTION_BOARD_MESSAGE_TYPES.REFRESH_IF_SOURCE_CHANGED) {
      await overlay.refreshCaptionsIfSourceChanged();
    }

    if (message.type === CAPTION_BOARD_MESSAGE_TYPES.SET_DISPLAY_MODE) {
      await overlay.setDisplayMode(message.displayMode);
    }

    if (message.type === CAPTION_BOARD_MESSAGE_TYPES.ADJUST_FONT_SCALE) {
      await overlay.adjustFontScale(message.delta);
    }

    return {
      ok: true,
      state: overlay.getCaptionBoardState(),
    };
  }

  globalThis.chrome?.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
    if (!CAPTION_BOARD_MESSAGE_TYPE_VALUES.has(message?.type)) {
      return false;
    }

    handleCaptionBoardMessage(message)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        console.error(error);
        sendResponse({
          error: error instanceof Error ? error.message : String(error),
          ok: false,
        });
      });

    return true;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTikTokCaptionOverlay, { once: true });
  } else {
    initTikTokCaptionOverlay();
  }
})();
