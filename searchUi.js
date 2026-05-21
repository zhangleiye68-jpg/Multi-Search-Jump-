import { buildSearchUrls, normalizeQuery } from "./searchTargets.js";
import { getSearchSettings } from "./searchSettings.js";
import { buildGroupTitle } from "./tabLauncher.js";

export function initSearchUi({
  closeOnSuccess,
  form,
  input,
  searchButton,
  statusMessage,
}) {
  function setStatus(message, state = "idle") {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", state === "error");
    statusMessage.classList.toggle("is-busy", state === "busy");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = normalizeQuery(input.value);

    if (!query) {
      setStatus("请输入关键词。", "error");
      input.focus();
      return;
    }

    const settings = await getSearchSettings(chrome.storage.local);
    const urls = buildSearchUrls(query, settings);

    if (urls.length === 0) {
      setStatus("请先在设置里选择至少一个搜索网站。", "error");
      input.focus();
      return;
    }

    searchButton.disabled = true;
    setStatus("正在整理搜索页。", "busy");

    try {
      const response = await chrome.runtime.sendMessage({
        type: "OPEN_SEARCH_GROUP",
        urls,
        title: buildGroupTitle(query),
        autoClosePrevious: settings.autoClosePrevious,
      });

      if (!response?.ok) {
        throw new Error(response?.error ?? "Unable to open search group");
      }

      setStatus("搜索页已打开。");

      if (closeOnSuccess) {
        window.close();
      }
    } catch (error) {
      console.error(error);
      searchButton.disabled = false;
      setStatus("无法打开搜索页，请重新加载扩展后再试。", "error");
      input.focus();
    }
  });

  input.focus();
}

export function initOptionsButton(button) {
  button.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

export function initPinButton(button, statusMessage) {
  if (!chrome.sidePanel?.open) {
    button.disabled = true;
    button.title = "当前浏览器不支持固定侧边栏";
    return;
  }

  button.addEventListener("click", async () => {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: currentWindow.id });
      window.close();
    } catch (error) {
      console.error(error);
      statusMessage.textContent = "无法打开固定面板，请确认浏览器支持 Side Panel。";
      statusMessage.classList.add("is-error");
    }
  });
}
