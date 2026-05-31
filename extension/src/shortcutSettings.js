export const SHORTCUT_SETTINGS_URL = "chrome://extensions/shortcuts";

export async function openShortcutSettings(tabsApi) {
  await tabsApi.create({
    active: true,
    url: SHORTCUT_SETTINGS_URL,
  });
}
