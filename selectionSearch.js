import { buildSearchUrls, normalizeQuery } from "./searchTargets.js";
import { getSearchSettings } from "./searchSettings.js";
import { buildGroupTitle, openManagedSearchTabs } from "./tabLauncher.js";

export const CONTEXT_MENU_ID = "multi-search-jump-selection";
export const SEARCH_SELECTED_COMMAND = "search-selected-text";

export async function resetSelectionContextMenu(contextMenusApi) {
  await contextMenusApi.removeAll();
  contextMenusApi.create({
    contexts: ["selection"],
    id: CONTEXT_MENU_ID,
    title: "用 Multi Search Jump 搜索 “%s”",
  });
}

export async function getSelectionFromActiveTab({ scriptingApi, tabsApi }) {
  const [activeTab] = await tabsApi.query({ active: true, currentWindow: true });

  if (!Number.isInteger(activeTab?.id)) {
    return "";
  }

  const [injectionResult] = await scriptingApi.executeScript({
    target: { tabId: activeTab.id },
    func: () => window.getSelection()?.toString() ?? "",
  });

  return normalizeQuery(injectionResult?.result);
}

export async function openSearchForText({
  query,
  storageArea,
  tabGroupsApi,
  tabsApi,
}) {
  const selectedText = normalizeQuery(query);

  if (!selectedText) {
    return {
      opened: false,
      reason: "empty-selection",
    };
  }

  const settings = await getSearchSettings(storageArea);
  const urls = buildSearchUrls(selectedText, settings);

  if (urls.length === 0) {
    return {
      opened: false,
      reason: "no-enabled-targets",
    };
  }

  const title = buildGroupTitle(selectedText);
  await openManagedSearchTabs({
    autoClosePrevious: settings.autoClosePrevious,
    storageArea,
    tabGroupsApi,
    tabsApi,
    title,
    urls,
  });

  return {
    count: urls.length,
    opened: true,
    title,
  };
}

export async function openSearchForActiveSelection({
  scriptingApi,
  storageArea,
  tabGroupsApi,
  tabsApi,
}) {
  const query = await getSelectionFromActiveTab({ scriptingApi, tabsApi });

  return openSearchForText({
    query,
    storageArea,
    tabGroupsApi,
    tabsApi,
  });
}
