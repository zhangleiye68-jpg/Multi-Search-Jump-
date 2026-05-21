import { openManagedSearchTabs } from "./tabLauncher.js";
import {
  CONTEXT_MENU_ID,
  SEARCH_SELECTED_COMMAND,
  canReadSelectionFromTab,
  isRestrictedSelectionError,
  openSearchForActiveSelection,
  openSearchForText,
  resetSelectionContextMenu,
} from "./selectionSearch.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error(error));
  resetSelectionContextMenu(chrome.contextMenus).catch((error) => console.error(error));
});

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

function handleCommandSearchError(error) {
  if (isRestrictedSelectionError(error)) {
    return;
  }

  console.error(error);
}

async function handleCommandSearch() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!canReadSelectionFromTab(activeTab)) {
    return;
  }

  await openSearchForActiveSelection({
    activeTab,
    scriptingApi: chrome.scripting,
    storageArea: chrome.storage.local,
    tabGroupsApi: chrome.tabGroups,
    tabsApi: chrome.tabs,
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

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  openSearchForText({
    query: info.selectionText,
    storageArea: chrome.storage.local,
    tabGroupsApi: chrome.tabGroups,
    tabsApi: chrome.tabs,
  }).catch((error) => console.error(error));
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== SEARCH_SELECTED_COMMAND) {
    return;
  }

  handleCommandSearch().catch(handleCommandSearchError);
});
