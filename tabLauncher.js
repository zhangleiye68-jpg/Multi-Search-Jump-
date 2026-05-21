export async function openSearchTabs(tabsApi, urls) {
  const createdTabs = [];

  for (const url of urls) {
    const tab = await tabsApi.create({ url, active: false });
    createdTabs.push(tab);
  }

  const firstTab = createdTabs[0];

  if (firstTab?.id !== undefined) {
    await tabsApi.update(firstTab.id, { active: true });
  }
}
