(() => {
  const MESSAGE_TYPE = "msj-tiktok-api-response";
  const TIKTOK_API_PATTERNS = [
    "/api/item/detail",
    "/api/recommend/item_list/",
    "/api/preload/item_list/",
    "/api/post/item_list/",
    "/api/repost/item_list",
    "/api/creator/item_list/",
    "/api/related/item_list/",
    "/api/search/general/full",
    "/api/search/item/full/",
    "/api/favorite/item_list",
    "/api/collection/item_list",
    "/api/user/collect/item_list/",
    "/api/following/item_list",
    "/api/friends/item_list",
    "/api/explore/item_list/",
    "/api/challenge/item_list/",
    "/api/music/item_list",
  ];

  function getRequestUrl(input) {
    if (typeof input === "string") {
      return input;
    }

    if (input instanceof Request) {
      return input.url;
    }

    return input?.url || "";
  }

  function isTikTokApiUrl(url) {
    return TIKTOK_API_PATTERNS.some((pattern) => String(url).includes(pattern));
  }

  function postTikTokApiPayload(url, payload) {
    if (!payload || typeof payload !== "object") {
      return;
    }

    window.postMessage({
      payload,
      type: MESSAGE_TYPE,
      url,
    }, "*");
  }

  function parseAndPostResponse(url, text) {
    if (!text || !isTikTokApiUrl(url)) {
      return;
    }

    try {
      postTikTokApiPayload(url, JSON.parse(text));
    } catch {
      // TikTok API responses should be JSON; ignore anything else quietly.
    }
  }

  function postCachedRecommendationFeed() {
    try {
      const cachedFeed = window.localStorage?.getItem?.("fyp-feed-cache");

      if (!cachedFeed) {
        return;
      }

      postTikTokApiPayload("localStorage:fyp-feed-cache", JSON.parse(cachedFeed));
    } catch {
      // TikTok may change cache shape or deny storage access; live API hooks still cover new requests.
    }
  }

  function installFetchBridge() {
    const originalFetch = window.fetch;

    if (typeof originalFetch !== "function" || originalFetch.__msjTikTokCaptionBridge) {
      return;
    }

    function bridgedFetch(...args) {
      const requestUrl = getRequestUrl(args[0]);

      return originalFetch.apply(this, args).then((response) => {
        if (isTikTokApiUrl(requestUrl)) {
          response.clone().text().then((text) => {
            parseAndPostResponse(requestUrl, text);
          }).catch(() => {});
        }

        return response;
      });
    }

    bridgedFetch.__msjTikTokCaptionBridge = true;
    window.fetch = bridgedFetch;
  }

  function installXhrBridge() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    if (originalOpen.__msjTikTokCaptionBridge || originalSend.__msjTikTokCaptionBridge) {
      return;
    }

    XMLHttpRequest.prototype.open = function openWithTikTokCaptionBridge(method, url, ...rest) {
      this.__msjTikTokCaptionUrl = String(url ?? "");
      return originalOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function sendWithTikTokCaptionBridge(...args) {
      if (isTikTokApiUrl(this.__msjTikTokCaptionUrl)) {
        this.addEventListener("loadend", () => {
          if (typeof this.responseText === "string") {
            parseAndPostResponse(this.__msjTikTokCaptionUrl, this.responseText);
          }
        });
      }

      return originalSend.apply(this, args);
    };

    XMLHttpRequest.prototype.open.__msjTikTokCaptionBridge = true;
    XMLHttpRequest.prototype.send.__msjTikTokCaptionBridge = true;
  }

  installFetchBridge();
  installXhrBridge();
  queueMicrotask(postCachedRecommendationFeed);
})();
