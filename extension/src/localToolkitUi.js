const LOCAL_TOOLKIT_PAGE_PATH = "local-toolkit/local-toolkit.html";
const LOCAL_TOOLKIT_FLOATING_ICON_KEY = "dt_show_floating_icon";

export async function getLocalToolkitFloatingIconEnabled(storageArea = chrome.storage.local) {
  const result = await storageArea.get(LOCAL_TOOLKIT_FLOATING_ICON_KEY);

  return result[LOCAL_TOOLKIT_FLOATING_ICON_KEY] !== 0;
}

export async function saveLocalToolkitFloatingIconEnabled(
  storageArea = chrome.storage.local,
  enabled,
) {
  const normalizedEnabled = Boolean(enabled);

  await storageArea.set({
    [LOCAL_TOOLKIT_FLOATING_ICON_KEY]: normalizedEnabled ? 1 : 0,
  });

  return normalizedEnabled;
}

export function getLocalToolkitPageUrl(runtimeApi = chrome.runtime) {
  return runtimeApi.getURL(LOCAL_TOOLKIT_PAGE_PATH);
}

export function openLocalToolkitPage(tabsApi = chrome.tabs, runtimeApi = chrome.runtime) {
  return tabsApi.create({
    active: true,
    url: getLocalToolkitPageUrl(runtimeApi),
  });
}

export function initLocalToolkitButton(button, options = {}) {
  if (!button) {
    return;
  }

  const {
    runtimeApi = chrome.runtime,
    tabsApi = chrome.tabs,
  } = options;

  button.addEventListener("click", () => {
    openLocalToolkitPage(tabsApi, runtimeApi).catch((error) => console.error(error));
  });
}
