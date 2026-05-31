import { buildSearchUrls, normalizeQuery } from "./searchTargets.js";
import { containsChinese, translateQueryForSearch } from "./queryTranslator.js";
import { addSearchHistoryRecord } from "./searchHistory.js";
import { getSearchSettings } from "./searchSettings.js";
import { buildGroupTitle, openManagedSearchTabs } from "./tabLauncher.js";

export const CONTEXT_MENU_ID = "multi-search-jump-selection";
export const SEARCH_SELECTED_COMMAND = "search-selected-text";

const SCRIPTABLE_SELECTION_PROTOCOLS = new Set(["http:", "https:"]);

export function canReadSelectionFromTab(tab) {
  if (!Number.isInteger(tab?.id)) {
    return false;
  }

  const tabUrl = tab.url || tab.pendingUrl;
  if (!tabUrl) {
    return false;
  }

  try {
    const url = new URL(tabUrl);
    return SCRIPTABLE_SELECTION_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function isRestrictedSelectionError(error) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Cannot access a chrome:// URL") ||
    message.includes("Cannot access contents of url \"chrome://") ||
    message.includes("Cannot access contents of url \"chrome-extension://") ||
    message.includes("Cannot access contents of url \"edge://") ||
    message.includes("The extensions gallery cannot be scripted")
  );
}

export async function resetSelectionContextMenu(contextMenusApi) {
  await contextMenusApi.removeAll();
  contextMenusApi.create({
    contexts: ["selection"],
    id: CONTEXT_MENU_ID,
    title: "用 Multi Search Jump 搜索 “%s”",
  });
}

export async function getSelectionFromActiveTab({ activeTab, scriptingApi, tabsApi }) {
  let targetTab = activeTab;

  if (!targetTab) {
    [targetTab] = await tabsApi.query({ active: true, currentWindow: true });
  }

  if (!canReadSelectionFromTab(targetTab)) {
    return "";
  }

  let injectionResult;
  try {
    [injectionResult] = await scriptingApi.executeScript({
      target: { tabId: targetTab.id },
      func: () => window.getSelection()?.toString() ?? "",
    });
  } catch (error) {
    if (isRestrictedSelectionError(error)) {
      return "";
    }

    throw error;
  }

  return normalizeQuery(injectionResult?.result);
}

async function getFinalQueryForSearch({
  query,
  settings,
  translateQuery,
}) {
  if (!settings.translateChineseToEnglish || !containsChinese(query)) {
    return query;
  }

  try {
    return normalizeQuery(await translateQuery(query, { enabled: true })) || query;
  } catch {
    return query;
  }
}

export async function openSearchForText({
  query,
  storageArea,
  tabGroupsApi,
  tabsApi,
  translateQuery = translateQueryForSearch,
}) {
  const selectedText = normalizeQuery(query);

  if (!selectedText) {
    return {
      opened: false,
      reason: "empty-selection",
    };
  }

  const settings = await getSearchSettings(storageArea);
  const finalQuery = await getFinalQueryForSearch({
    query: selectedText,
    settings,
    translateQuery,
  });
  const urls = buildSearchUrls(finalQuery, settings);

  if (urls.length === 0) {
    return {
      opened: false,
      reason: "no-enabled-targets",
    };
  }

  const title = buildGroupTitle(finalQuery);
  await openManagedSearchTabs({
    autoClosePrevious: settings.autoClosePrevious,
    storageArea,
    tabGroupsApi,
    tabsApi,
    title,
    urls,
  });
  await addSearchHistoryRecord(storageArea, finalQuery);

  return {
    count: urls.length,
    opened: true,
    title,
  };
}

export async function openSearchForActiveSelection({
  activeTab,
  scriptingApi,
  storageArea,
  tabGroupsApi,
  tabsApi,
}) {
  const query = await getSelectionFromActiveTab({
    activeTab,
    scriptingApi,
    tabsApi,
  });

  return openSearchForText({
    query,
    storageArea,
    tabGroupsApi,
    tabsApi,
  });
}
