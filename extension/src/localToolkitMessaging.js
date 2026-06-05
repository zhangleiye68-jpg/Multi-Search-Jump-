import { normalizeLocalToolkitDownloadFilename } from "./localToolkitDownloadNames.js";

export const LOCAL_TOOLKIT_MESSAGE_NAME = "datatool_background_trans";

const DOWNLOAD_SITES_OPTIONS_PAGE_PATH = "options/options.html#settings-download-sites";

const OPEN_ACCESS = Object.freeze({
  allowed: true,
  localOnly: true,
  reduced: false,
  restricted: false,
  unlimited: true,
});

const LOCAL_USER = Object.freeze({
  id: "local-open",
  user_id: "local-open",
  userId: "local-open",
  uid: "local-open",
  email: "open-access@datatool.local",
  nickname: "Open Access",
  name: "Open Access",
  access: OPEN_ACCESS,
});

function ok(data = {}, msg = "open-access") {
  return {
    code: 0,
    data,
    message: msg,
    msg,
    status: 200,
    success: true,
  };
}

function disabled(message = "Current page does not expose local data for this action.") {
  return {
    code: 451,
    data: OPEN_ACCESS,
    message,
    msg: message,
    success: false,
  };
}

function isDatatoolBackend(url) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === "api.datatool.vip") {
      return true;
    }

    return parsedUrl.hostname === "www.datatool.vip";
  } catch {
    return /(^|\/\/)(api|www)\.datatool\.vip\//u.test(String(url || ""));
  }
}

function isCloudTranscribeOrUpload(url) {
  return /dashscope\.aliyuncs\.com|\/api\/upload\/oss-token|\/api\/user-task\/tokens|aliyuncs\.com/u
    .test(String(url || ""));
}

export function isLocalToolkitMessage(message) {
  return message?.name === LOCAL_TOOLKIT_MESSAGE_NAME;
}

export function createLocalToolkitBackendPayload(url) {
  if (/\/api\/auth\/login-out/u.test(url)) return ok({});
  if (/\/api\/auth\/|\/api\/user\/info/u.test(url)) return ok(LOCAL_USER);
  if (/\/api\/coupon\/redeem/u.test(url)) return ok({ ...OPEN_ACCESS, redeemed: false });
  if (/\/api\/index\/donate-modal/u.test(url)) return ok({ ...OPEN_ACCESS, enabled: false, show: false });
  if (/\/api\/benefit\/check-benefits/u.test(url)) {
    return ok(OPEN_ACCESS);
  }
  if (/\/api\/benefit\/get-benefit-balance/u.test(url)) {
    return ok(OPEN_ACCESS);
  }
  if (/\/api\/benefit\/reduce-benefits|\/api\/credits\/deduction/u.test(url)) {
    return ok(OPEN_ACCESS);
  }
  if (/\/api\/version\/check/u.test(url)) return ok({ ...OPEN_ACCESS, force: false, has_new: false, version: "open-access" });
  if (/\/api\/data-original\/save|\/frontend\/user\/action-log\/add/u.test(url)) {
    return ok({ ...OPEN_ACCESS, saved: false });
  }
  if (/\/api\/plugin\/proxy-url/u.test(url)) return disabled();
  if (/\/api\/user-task\/|\/api\/video\/parse-original-video|frontend\/material\//u.test(url)) {
    return disabled();
  }

  return ok(OPEN_ACCESS);
}

async function readStorageValue(storageArea, key) {
  const result = await storageArea.get(key);

  return result[key];
}

async function fetchProxy(data, fetchImpl) {
  const url = data?.url || "";

  if (isCloudTranscribeOrUpload(url)) {
    return disabled("Cloud upload and speech-to-text are unavailable in the local extension.");
  }

  if (isDatatoolBackend(url)) {
    return createLocalToolkitBackendPayload(url);
  }

  if (typeof fetchImpl !== "function") {
    return disabled("Fetch is unavailable in this extension context.");
  }

  const method = String(data?.method || "get").toUpperCase();
  const headers = { ...(data?.options?.headers || data?.headers || {}) };
  const init = { method, headers };

  if (data?.json !== undefined) {
    init.body = JSON.stringify(data.json);
    init.headers = {
      "content-type": "application/json",
      ...headers,
    };
  } else if (data?.data !== undefined) {
    init.body = data.data;
  }

  const response = await fetchImpl(url, init);
  const contentType = response.headers?.get?.("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function fetchHtml(data, fetchImpl) {
  if (typeof fetchImpl !== "function") {
    return "";
  }

  const response = await fetchImpl(data?.url, data?.options || {});

  return response.text();
}

export async function handleLocalToolkitMessage(message, apis = {}) {
  const action = message?.body?.action;
  const data = message?.body?.data || {};
  const runtimeApi = apis.runtimeApi || globalThis.chrome?.runtime;
  const tabsApi = apis.tabsApi || globalThis.chrome?.tabs;
  const downloadsApi = apis.downloadsApi || globalThis.chrome?.downloads;
  const storageArea = apis.storageArea || globalThis.chrome?.storage?.local;
  const fetchImpl = apis.fetchImpl || globalThis.fetch;

  switch (action) {
    case "get_extension_id":
      return runtimeApi?.id || "";

    case "openPopup":
      await tabsApi?.create?.({
        active: true,
        url: runtimeApi?.getURL?.(DOWNLOAD_SITES_OPTIONS_PAGE_PATH) ||
          DOWNLOAD_SITES_OPTIONS_PAGE_PATH,
      });
      return { success: true };

    case "openDownloadSetting":
      await tabsApi?.create?.({ active: true, url: "chrome://settings/downloads" });
      return { success: true };

    case "download": {
      if (!data.url) {
        return { msg: "Download URL missing.", success: false };
      }

      const downloadId = await downloadsApi?.download?.({
        filename: normalizeLocalToolkitDownloadFilename(data.fileName || data.filename || ""),
        saveAs: Boolean(data.saveAs),
        url: data.url,
      });

      return { downloadId, success: true };
    }

    case "getStorage":
    case "get_storage":
      return readStorageValue(storageArea, data.key);

    case "setStorage":
    case "set_storage":
      await storageArea?.set?.({ [data.key]: data.value });
      return true;

    case "removeStorage":
    case "remove_storage":
      await storageArea?.remove?.(data.key);
      return true;

    case "proxy":
      return fetchProxy(data, fetchImpl);

    case "fetch_html":
      return fetchHtml(data, fetchImpl);

    case "new_tab":
      await tabsApi?.create?.({ active: true, url: data.url });
      return { success: true };

    case "close_tab":
      await tabsApi?.remove?.(data.tabId);
      return { success: true };

    case "get_cookies_by_names":
      return [];

    case "xhs_enable_user_agent_rule":
    case "xhs_disable_user_agent_rule":
      return { success: true };

    default:
      return { msg: `Unsupported local toolkit action: ${action}`, success: false };
  }
}
