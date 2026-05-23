import { buildSearchUrls, normalizeQuery } from "./searchTargets.js";
import {
  getRecentSearchHistory,
  removeSearchHistoryRecord,
} from "./searchHistory.js";
import { getSearchSettings } from "./searchSettings.js";
import { buildGroupTitle } from "./tabLauncher.js";

export function initSearchUi({
  closeOnSuccess,
  form,
  historyList = null,
  input,
  onHistoryChange = null,
  searchButton,
  statusMessage,
}) {
  function setStatus(message, state = "idle") {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", state === "error");
    statusMessage.classList.toggle("is-busy", state === "busy");
  }

  function renderHistory(records) {
    if (!historyList) {
      return;
    }

    historyList.textContent = "";
    historyList.hidden = records.length === 0;

    for (const record of records) {
      const chip = document.createElement("span");
      const openButton = document.createElement("button");
      const removeButton = document.createElement("button");

      chip.className = "search-history-chip";
      openButton.className = "search-history-open";
      openButton.type = "button";
      openButton.textContent = record.query;
      openButton.dataset.historyQuery = record.query;
      openButton.title = `重新搜索 ${record.query}`;
      removeButton.className = "search-history-remove";
      removeButton.type = "button";
      removeButton.textContent = "×";
      removeButton.dataset.historyRemove = record.id;
      removeButton.setAttribute("aria-label", `删除搜索记录 ${record.query}`);

      chip.append(openButton, removeButton);
      historyList.append(chip);
    }
  }

  async function refreshHistory() {
    if (!historyList) {
      return;
    }

    renderHistory(await getRecentSearchHistory(chrome.storage.local));
    await onHistoryChange?.();
  }

  async function openQuery(value) {
    const query = normalizeQuery(value);

    if (!query) {
      setStatus("请输入关键词。", "error");
      input.focus();
      return;
    }

    searchButton.disabled = true;
    setStatus("正在整理搜索页。", "busy");

    const settings = await getSearchSettings(chrome.storage.local);
    const urls = buildSearchUrls(query, settings);

    if (urls.length === 0) {
      searchButton.disabled = false;
      setStatus("请先在设置里选择至少一个搜索网站。", "error");
      input.focus();
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "OPEN_SEARCH_GROUP",
        query,
        urls,
        title: buildGroupTitle(query),
        autoClosePrevious: settings.autoClosePrevious,
      });

      if (!response?.ok) {
        throw new Error(response?.error ?? "Unable to open search group");
      }

      setStatus("搜索页已打开。");
      await refreshHistory();

      if (closeOnSuccess) {
        window.close();
      } else {
        searchButton.disabled = false;
        input.focus();
      }
    } catch (error) {
      console.error(error);
      searchButton.disabled = false;
      setStatus("无法打开搜索页，请重新加载扩展后再试。", "error");
      input.focus();
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await openQuery(input.value);
  });

  historyList?.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("[data-history-remove]");

    if (removeButton) {
      await removeSearchHistoryRecord(
        chrome.storage.local,
        removeButton.dataset.historyRemove,
      );
      await refreshHistory();
      input.focus();
      return;
    }

    const openButton = event.target.closest("[data-history-query]");

    if (!openButton) {
      return;
    }

    input.value = openButton.dataset.historyQuery;
    await openQuery(input.value);
  });

  refreshHistory();
  input.focus();

  return {
    refreshHistory,
  };
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
