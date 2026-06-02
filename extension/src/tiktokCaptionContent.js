(() => {
  function initTikTokCaptionOverlay() {
    globalThis.MultiSearchJumpTikTokCaptions?.createCaptionOverlay?.();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTikTokCaptionOverlay, { once: true });
  } else {
    initTikTokCaptionOverlay();
  }
})();
