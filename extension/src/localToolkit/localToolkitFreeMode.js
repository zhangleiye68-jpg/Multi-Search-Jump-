(() => {
  const root = globalThis;
  if (root.__DATATOOL_LOCAL_FREE_MODE__) return;

  const LOCAL_USER = {
    id: "local-free",
    user_id: "local-free",
    userId: "local-free",
    uid: "local-free",
    email: "local-free@datatool.local",
    nickname: "Local Free",
    name: "Local Free",
    isVip: true,
    is_vip: 1,
    vip_ttl: 999999999,
    vip_date_end: "2099-12-31",
    vip: true,
    isMember: true,
    member: true,
    subscription: { active: true, plan: "local-free" },
    benefit: { active: true },
    benefits: []
  };

  const jsonResponse = (payload, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-datatool-local-free": "1"
      }
    });

  const ok = (data = {}, msg = "local-free") => ({
    success: true,
    status: 200,
    code: 0,
    msg,
    message: msg,
    data
  });

  const disabled = (msg = "Local free mode only supports data available in the current browser page.") => ({
    success: false,
    code: 451,
    msg,
    message: msg,
    data: null
  });

  const urlOf = (input) => {
    try {
      if (typeof input === "string") return input;
      if (input && typeof input.url === "string") return input.url;
      return String(input || "");
    } catch {
      return "";
    }
  };

  const isDatatoolBackend = (url) => {
    try {
      const u = new URL(url, location && location.href ? location.href : "https://local.invalid/");
      if (u.hostname === "api.datatool.vip") return true;
      if (u.hostname !== "www.datatool.vip") return false;
      return (
        u.pathname.startsWith("/api/") ||
        u.pathname.startsWith("/frontend/") ||
        u.pathname.startsWith("/auth/") ||
        u.pathname.startsWith("/pricing") ||
        u.pathname.startsWith("/workspace/") ||
        u.pathname.startsWith("/user/donation-center")
      );
    } catch {
      return /(^|\/\/)(api|www)\.datatool\.vip\/(api|frontend|auth|pricing|workspace|user\/donation-center)/.test(url);
    }
  };

  const isCloudTranscribeOrUpload = (url) =>
    /dashscope\.aliyuncs\.com|\/api\/upload\/oss-token|\/api\/user-task\/tokens|aliyuncs\.com/.test(url);

  const isTranslateEndpoint = (url) =>
    /translate-pa\.googleapis\.com\/v1\/translateHtml|edge\.microsoft\.com\/translate\/translatetext/.test(url);

  const localBackendPayload = (url) => {
    if (/\/api\/auth\/login-out/.test(url)) return ok({});
    if (/\/api\/auth\/|\/api\/user\/info/.test(url)) return ok(LOCAL_USER);
    if (/\/api\/coupon\/redeem/.test(url)) return ok({ redeemed: true, localFree: true });
    if (/\/api\/index\/donate-modal/.test(url)) return ok({ enabled: false, show: false });
    if (/\/api\/benefit\/check-benefits/.test(url)) {
      return ok({ allowed: true, hasBenefit: true, is_allow: true, isVip: true, localFree: true });
    }
    if (/\/api\/benefit\/get-benefit-balance/.test(url)) {
      return ok({
        balance: 999999999,
        remaining: 999999999,
        remaining_seconds: 999999999,
        remainingSeconds: 999999999,
        daily_free_seconds: 999999999,
        dailyGiftSeconds: 999999999,
        quota: {
          balance: 999999999,
          remaining_seconds: 999999999,
          daily_free_seconds: 999999999
        }
      });
    }
    if (/\/api\/benefit\/reduce-benefits|\/api\/credits\/deduction/.test(url)) return ok({ reduced: false, localFree: true });
    if (/\/api\/version\/check/.test(url)) return ok({ has_new: false, force: false, version: "local-free" });
    if (/\/api\/data-original\/save|\/frontend\/user\/action-log\/add/.test(url)) return ok({ saved: false, localOnly: true });
    if (/\/api\/plugin\/proxy-url/.test(url)) return disabled();
    if (/\/api\/user-task\/|\/api\/video\/parse-original-video|frontend\/material\//.test(url)) return disabled();
    return ok({ localFree: true });
  };

  const normalizeLang = (lang) => {
    if (!lang) return "zh";
    const value = String(lang);
    if (/^zh-cn$/i.test(value) || /^zh-hans$/i.test(value)) return "zh";
    if (/^zh-tw$/i.test(value) || /^zh-hant$/i.test(value)) return "zh-Hant";
    return value.split("_")[0];
  };

  const readTranslateBody = async (input, init) => {
    try {
      const body = init && init.body !== undefined ? init.body : input && input.body;
      if (!body) return { target: "zh", texts: [] };
      if (typeof body === "string") {
        const parsed = JSON.parse(body);
        if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
          return {
            texts: Array.isArray(parsed[0][0]) ? parsed[0][0].map((item) => String(item ?? "")) : [],
            target: normalizeLang(parsed[0][2] || "zh")
          };
        }
      }
    } catch {}
    return { target: "zh", texts: [] };
  };

  const translatorCache = new Map();

  const detectLanguage = async (texts) => {
    const sample = texts.filter(Boolean).join("\n").slice(0, 1000);
    if (!sample) return "en";
    if (/[\u4e00-\u9fff]/.test(sample)) return "zh";
    try {
      if ("LanguageDetector" in root) {
        const detector = await root.LanguageDetector.create();
        const detected = await detector.detect(sample);
        const first = Array.isArray(detected) ? detected[0] : detected;
        return normalizeLang(first && (first.detectedLanguage || first.language)) || "en";
      }
    } catch {}
    return "en";
  };

  const getTranslator = async (sourceLanguage, targetLanguage) => {
    if (!("Translator" in root)) return null;
    const source = normalizeLang(sourceLanguage);
    const target = normalizeLang(targetLanguage || "zh");
    if (!source || source === target || (source === "zh" && target === "zh")) return null;
    const key = `${source}->${target}`;
    if (translatorCache.has(key)) return translatorCache.get(key);
    try {
      if (root.Translator.availability) {
        const availability = await root.Translator.availability({ sourceLanguage: source, targetLanguage: target });
        if (availability === "unavailable") return null;
      }
      const translator = await root.Translator.create({ sourceLanguage: source, targetLanguage: target });
      translatorCache.set(key, translator);
      return translator;
    } catch (error) {
      console.warn("[DataTool local-free] Chrome Translator API unavailable:", error);
      return null;
    }
  };

  const translateBatch = async (targetLanguage, texts) => {
    const sourceLanguage = await detectLanguage(texts);
    const translator = await getTranslator(sourceLanguage, targetLanguage || "zh");
    if (!translator) return [texts.map((text) => String(text ?? "")), []];
    const translated = [];
    for (const text of texts) {
      const value = String(text ?? "");
      translated.push(value ? await translator.translate(value) : "");
    }
    return [translated, []];
  };

  const originalFetch = root.fetch && root.fetch.bind(root);
  if (originalFetch) {
    root.fetch = async (input, init) => {
      const url = urlOf(input);
      if (isTranslateEndpoint(url)) {
        const { target, texts } = await readTranslateBody(input, init);
        return jsonResponse(await translateBatch(target, texts));
      }
      if (isDatatoolBackend(url)) return jsonResponse(localBackendPayload(url));
      if (isCloudTranscribeOrUpload(url)) return jsonResponse(disabled("Cloud upload and speech-to-text are disabled in local free mode."));
      return originalFetch(input, init);
    };
  }

  try {
    const XHR = root.XMLHttpRequest;
    if (XHR && XHR.prototype) {
      const originalOpen = XHR.prototype.open;
      const originalSend = XHR.prototype.send;
      XHR.prototype.open = function (method, url, ...rest) {
        this.__datatoolLocalFreeUrl = urlOf(url);
        this.__datatoolLocalFreeMethod = method;
        return originalOpen.call(this, method, url, ...rest);
      };
      XHR.prototype.send = function (...args) {
        const url = this.__datatoolLocalFreeUrl || "";
        if (isTranslateEndpoint(url) || isDatatoolBackend(url) || isCloudTranscribeOrUpload(url)) {
          const payload = isTranslateEndpoint(url)
            ? [[String(args[0] || "")], []]
            : isCloudTranscribeOrUpload(url)
              ? disabled("Cloud upload and speech-to-text are disabled in local free mode.")
              : localBackendPayload(url);
          const text = JSON.stringify(payload);
          const define = (key, value) => {
            try {
              Object.defineProperty(this, key, { configurable: true, value });
            } catch {}
          };
          setTimeout(() => {
            define("readyState", 4);
            define("status", 200);
            define("statusText", "OK");
            define("response", text);
            define("responseText", text);
            if (typeof this.onreadystatechange === "function") this.onreadystatechange();
            if (typeof this.onload === "function") this.onload();
            this.dispatchEvent && this.dispatchEvent(new Event("readystatechange"));
            this.dispatchEvent && this.dispatchEvent(new Event("load"));
            this.dispatchEvent && this.dispatchEvent(new Event("loadend"));
          }, 0);
          return undefined;
        }
        return originalSend.apply(this, args);
      };
    }
  } catch {}

  try {
    if (root.navigator && typeof root.navigator.sendBeacon === "function") {
      const originalSendBeacon = root.navigator.sendBeacon.bind(root.navigator);
      root.navigator.sendBeacon = (url, data) =>
        isDatatoolBackend(urlOf(url)) || isCloudTranscribeOrUpload(urlOf(url)) ? true : originalSendBeacon(url, data);
    }
  } catch {}

  const blockNavigationUrl = (url) =>
    /(^|\/\/)(api|www)\.datatool\.vip\//.test(String(url || ""));

  try {
    if (root.open) {
      const originalOpen = root.open.bind(root);
      root.open = (url, ...rest) => (blockNavigationUrl(url) ? null : originalOpen(url, ...rest));
    }
  } catch {}

  try {
    const chromeLike = root.chrome || root.browser;
    if (chromeLike && chromeLike.tabs && chromeLike.tabs.create) {
      const originalCreate = chromeLike.tabs.create.bind(chromeLike.tabs);
      chromeLike.tabs.create = (props, callback) => {
        const url = props && props.url;
        if (blockNavigationUrl(url)) {
          const tab = { id: -1, url: "about:blank", active: false };
          if (typeof callback === "function") callback(tab);
          return Promise.resolve(tab);
        }
        return originalCreate(props, callback);
      };
    }
  } catch {}

  try {
    if (root.document && root.document.addEventListener) {
      root.document.addEventListener(
        "click",
        (event) => {
          const link = event.target && event.target.closest && event.target.closest("a[href]");
          if (link && blockNavigationUrl(link.href)) {
            event.preventDefault();
            event.stopPropagation();
          }
        },
        true
      );
    }
  } catch {}

  root.__DATATOOL_LOCAL_FREE_MODE__ = {
    enabled: true,
    localUser: LOCAL_USER,
    translateBatch
  };
})();
