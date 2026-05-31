import { buildSearchUrls, normalizeQuery } from "./searchTargets.js";
import { translateQueryForSearch } from "./queryTranslator.js";
import {
  getRecentSearchHistory,
  getShowPopupSearchHistory,
  removeSearchHistoryRecord,
  saveShowPopupSearchHistory,
} from "./searchHistory.js";
import { getSearchSettings } from "./searchSettings.js";
import { buildGroupTitle } from "./tabLauncher.js";

const SEARCH_INPUT_MAX_HEIGHT = 120;

function resizeSearchInput(input) {
  if (!input.style) {
    return;
  }

  input.style.height = "auto";

  if (input.scrollHeight > 0) {
    input.style.height = `${Math.min(input.scrollHeight, SEARCH_INPUT_MAX_HEIGHT)}px`;
  }
}

export function initSearchUi({
  closeOnSuccess,
  form,
  historyList = null,
  historyToggle = null,
  input,
  onHistoryChange = null,
  searchButton,
  statusMessage,
  translateQuery = translateQueryForSearch,
  useHistoryVisibilityPreference = false,
}) {
  let shouldShowHistory = true;

  if ((historyToggle || useHistoryVisibilityPreference) && historyList) {
    historyList.hidden = true;
  }

  function setStatus(message, state = "idle") {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", state === "error");
    statusMessage.classList.toggle("is-busy", state === "busy");
  }

  function initMultilineInput() {
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
        return;
      }

      event.preventDefault();
      form.requestSubmit();
    });

    input.addEventListener("input", () => {
      resizeSearchInput(input);
    });
    resizeSearchInput(input);
  }

  function renderHistory(records) {
    if (!historyList) {
      return;
    }

    historyList.textContent = "";
    historyList.hidden = !shouldShowHistory || records.length === 0;

    if (!shouldShowHistory) {
      return;
    }

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

  async function initHistoryVisibility() {
    shouldShowHistory = await getShowPopupSearchHistory(chrome.storage.local);

    if (historyToggle) {
      historyToggle.checked = shouldShowHistory;
    }

    await refreshHistory();
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
    const finalQuery = await translateQuery(query, {
      enabled: settings.translateChineseToEnglish,
    });
    const urls = buildSearchUrls(finalQuery, settings);

    if (urls.length === 0) {
      searchButton.disabled = false;
      setStatus("请先在设置里选择至少一个搜索网站。", "error");
      input.focus();
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "OPEN_SEARCH_GROUP",
        query: finalQuery,
        urls,
        title: buildGroupTitle(finalQuery),
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
    resizeSearchInput(input);
    await openQuery(input.value);
  });

  historyToggle?.addEventListener("change", async () => {
    shouldShowHistory = await saveShowPopupSearchHistory(
      chrome.storage.local,
      historyToggle.checked,
    );
    historyToggle.checked = shouldShowHistory;
    await refreshHistory();
    input.focus();
  });

  if (historyToggle || useHistoryVisibilityPreference) {
    initHistoryVisibility();
  } else {
    refreshHistory();
  }
  initMultilineInput();
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

export function initPinButton(button, statusMessage, { closeOnSuccess = true } = {}) {
  if (!chrome.sidePanel?.open) {
    button.disabled = true;
    button.title = "当前浏览器不支持侧边栏显示";
    return;
  }

  const isSwitchControl = button.type === "checkbox";

  button.addEventListener(isSwitchControl ? "change" : "click", async () => {
    if (isSwitchControl && !button.checked) {
      return;
    }

    try {
      const currentWindow = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: currentWindow.id });

      if (closeOnSuccess) {
        window.close();
      }
    } catch (error) {
      console.error(error);
      if (isSwitchControl) {
        button.checked = false;
      }
      statusMessage.textContent = "无法打开侧边栏，请确认浏览器支持 Side Panel。";
      statusMessage.classList.add("is-error");
    }
  });
}
