import { closeLastSearchGroup } from "./tabLauncher.js";

export function initCloseLastSearchGroupButton(
  button,
  statusMessage,
  {
    storageArea = chrome.storage.local,
    tabsApi = chrome.tabs,
  } = {},
) {
  button.addEventListener("click", async () => {
    button.disabled = true;
    statusMessage.textContent = "正在关闭上次搜索结果。";
    statusMessage.classList.toggle("is-error", false);

    try {
      const result = await closeLastSearchGroup({ storageArea, tabsApi });

      statusMessage.textContent = result.closedCount > 0
        ? `已关闭 ${result.closedCount} 个上次搜索标签。`
        : "没有可关闭的上次搜索结果。";
    } catch (error) {
      console.error(error);
      statusMessage.textContent = "无法关闭上次搜索结果，请稍后再试。";
      statusMessage.classList.toggle("is-error", true);
    } finally {
      button.disabled = false;
    }
  });
}
