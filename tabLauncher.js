export const LAST_SEARCH_SESSION_KEY = "lastSearchSession";

const SEARCH_GROUP_COLOR = "cyan";

function getTabIds(tabs) {
  return tabs
    .map((tab) => tab?.id)
    .filter((id) => Number.isInteger(id));
}

async function resolveLiveTabIds(tabsApi, session) {
  if (Number.isInteger(session?.groupId)) {
    const groupedTabs = await tabsApi.query({ groupId: session.groupId });
    const groupedTabIds = getTabIds(groupedTabs);

    if (groupedTabIds.length > 0) {
      return groupedTabIds;
    }
  }

  const savedTabIds = Array.isArray(session?.tabIds) ? session.tabIds : [];
  const liveTabIds = [];

  for (const tabId of savedTabIds) {
    if (!Number.isInteger(tabId)) {
      continue;
    }

    try {
      const tab = await tabsApi.get(tabId);

      if (Number.isInteger(tab?.id)) {
        liveTabIds.push(tab.id);
      }
    } catch {
      // Tabs may have been closed manually; ignore stale IDs.
    }
  }

  return liveTabIds;
}

export function buildGroupTitle(value) {
  const query = String(value ?? "").trim();

  if (!query) {
    return "Search";
  }

  return `Search: ${query.slice(0, 32)}`;
}

export async function getLastSearchSession(storageArea) {
  const result = await storageArea.get(LAST_SEARCH_SESSION_KEY);
  return result[LAST_SEARCH_SESSION_KEY] ?? null;
}

export async function openGroupedSearchTabs({
  tabsApi,
  tabGroupsApi,
  storageArea,
  urls,
  title,
}) {
  if (urls.length === 0) {
    return null;
  }

  const createdTabs = [];

  for (const url of urls) {
    const tab = await tabsApi.create({ url, active: false });
    createdTabs.push(tab);
  }

  const tabIds = getTabIds(createdTabs);

  if (tabIds.length === 0) {
    return null;
  }

  const groupId = await tabsApi.group({ tabIds });
  await tabGroupsApi.update(groupId, {
    title,
    color: SEARCH_GROUP_COLOR,
    collapsed: false,
  });
  await storageArea.set({
    [LAST_SEARCH_SESSION_KEY]: {
      groupId,
      tabIds,
      title,
    },
  });

  await tabsApi.update(tabIds[0], { active: true });

  return {
    groupId,
    tabIds,
    title,
  };
}

export async function closeLastSearchGroup({ tabsApi, storageArea }) {
  const session = await getLastSearchSession(storageArea);

  if (!session) {
    return { closedCount: 0 };
  }

  const tabIds = await resolveLiveTabIds(tabsApi, session);

  if (tabIds.length > 0) {
    await tabsApi.remove(tabIds);
  }

  await storageArea.remove(LAST_SEARCH_SESSION_KEY);

  return { closedCount: tabIds.length };
}
