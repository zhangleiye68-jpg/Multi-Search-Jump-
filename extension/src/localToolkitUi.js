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
