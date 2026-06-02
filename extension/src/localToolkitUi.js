const LOCAL_TOOLKIT_PAGE_PATH = "local-toolkit/local-toolkit.html";

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
