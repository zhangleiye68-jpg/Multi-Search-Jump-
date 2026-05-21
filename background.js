import { openManagedSearchTabs } from "./tabLauncher.js";

async function handleOpenSearchGroup(message) {
  await openManagedSearchTabs({
    tabsApi: chrome.tabs,
    tabGroupsApi: chrome.tabGroups,
    storageArea: chrome.storage.local,
    urls: message.urls,
    title: message.title,
    autoClosePrevious: message.autoClosePrevious,
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_SEARCH_GROUP") {
    return false;
  }

  handleOpenSearchGroup(message)
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch((error) => {
      console.error(error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return true;
});
