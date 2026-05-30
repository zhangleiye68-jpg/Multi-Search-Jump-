import { SEARCH_TARGETS, getSearchTargetById } from "./searchTargets.js";
import {
  GOOGLE_SEARCH_TYPES,
  getSearchSettings,
  normalizeSearchSettings,
  saveSearchSettings,
} from "./searchSettings.js";
import {
  clearSearchHistory,
  getSearchHistory,
  getShowPopupSearchHistory,
  removeSearchHistoryRecord,
  saveShowPopupSearchHistory,
} from "./searchHistory.js";
import { initPinButton, initSearchUi } from "./searchUi.js";
import { openShortcutSettings } from "./shortcutSettings.js";

const storageArea = chrome.storage.local;
const allSearchHistory = document.querySelector("#all-search-history");
const allSearchHistoryEmpty = document.querySelector("#all-search-history-empty");
const autoCloseToggle = document.querySelector("#auto-close-toggle");
const clearHistoryButton = document.querySelector("#clear-history-button");
const googleImageToggle = document.querySelector("#google-image-toggle");
const googleModeState = document.querySelector("#google-mode-state");
const historyFilterInput = document.querySelector("#history-filter-input");
const historyTableBody = document.querySelector("#history-table-body");
const optionsSearchButton = document.querySelector("#options-search-button");
const optionsSearchForm = document.querySelector("#options-search-form");
const optionsSearchHistory = document.querySelector("#options-search-history");
const optionsSearchInput = document.querySelector("#options-search-input");
const optionsSearchStatus = document.querySelector("#options-search-status");
const shortcutSettingsButton = document.querySelector("#shortcut-settings-button");
const showPopupHistoryToggle = document.querySelector("#show-popup-history-toggle");
const sidePanelButton = document.querySelector("#side-panel-button");
const targetOrderList = document.querySelector("#target-order-list");
const translateChineseToggle = document.querySelector("#translate-chinese-toggle");
const statusMessage = document.querySelector("#status-message");

let settings = null;
let dragState = null;
let persistToken = 0;
let optionsSearchUi = null;
let allHistoryRecords = [];
let showPopupSearchHistory = true;

function setStatus(message, state = "idle") {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", state === "error");
}

async function persist(nextSettings = settings) {
  const token = persistToken + 1;
  const previousSettings = settings;

  persistToken = token;
  settings = normalizeSearchSettings(nextSettings);
  render();
  setStatus("设置已更新。");

  try {
    const savedSettings = await saveSearchSettings(storageArea, settings);

    if (token === persistToken) {
      settings = savedSettings;
      setStatus("设置已保存。");
    }
  } catch (error) {
    console.error(error);

    if (token === persistToken) {
      settings = previousSettings;
      render();
      setStatus("设置保存失败，请重新尝试。", "error");
    }
  }
}

function isTargetEnabled(id) {
  return settings.enabledTargetIds.includes(id);
}

function reorderTarget(draggedId, targetId, position) {
  if (draggedId === targetId) {
    return;
  }

  if (isTargetEnabled(draggedId) !== isTargetEnabled(targetId)) {
    return;
  }

  const targetOrder = [...settings.targetOrder];
  const fromIndex = targetOrder.indexOf(draggedId);

  if (fromIndex < 0) {
    return;
  }

  const [draggedIdInOrder] = targetOrder.splice(fromIndex, 1);
  const targetIndex = targetOrder.indexOf(targetId);

  if (targetIndex < 0) {
    return;
  }

  targetOrder.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, draggedIdInOrder);
  persist({ ...settings, targetOrder });
}

function getDropLine() {
  return targetOrderList.querySelector(".target-drop-line");
}

function hideDropLine() {
  getDropLine()?.classList.remove("is-visible");
}

function clearDragState() {
  if (dragState?.frameId) {
    cancelAnimationFrame(dragState.frameId);
  }

  dragState = null;
  hideDropLine();
  targetOrderList
    .querySelectorAll(".is-dragging")
    .forEach((row) => row.classList.remove("is-dragging"));
}

function showDropIndicator(row, position) {
  if (
    dragState?.dropTargetId === row.dataset.targetId &&
    dragState?.dropPosition === position
  ) {
    return;
  }

  if (dragState) {
    dragState.dropTargetId = row.dataset.targetId;
    dragState.dropPosition = position;
  }

  const listRect = targetOrderList.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const lineTop = position === "before" ? rowRect.top : rowRect.bottom;
  const dropLine = getDropLine();

  if (!dropLine) {
    return;
  }

  dropLine.style.transform = `translateY(${Math.round(lineTop - listRect.top)}px)`;
  dropLine.classList.add("is-visible");
}

function getPointerDragRows(draggedId) {
  const draggedIsEnabled = isTargetEnabled(draggedId);

  return [...targetOrderList.querySelectorAll("[data-target-id]")]
    .filter((row) => {
      const id = row.dataset.targetId;
      return id !== draggedId && isTargetEnabled(id) === draggedIsEnabled;
    })
    .map((row) => {
      const rect = row.getBoundingClientRect();

      return {
        id: row.dataset.targetId,
        middleY: rect.top + rect.height / 2,
        row,
      };
    });
}

function getDropTargetFromPointer(clientY) {
  if (!dragState || dragState.dragPreviewRows.length === 0) {
    return null;
  }

  for (const previewRow of dragState.dragPreviewRows) {
    if (clientY < previewRow.middleY) {
      return {
        position: "before",
        row: previewRow.row,
        targetId: previewRow.id,
      };
    }
  }

  const lastPreviewRow = dragState.dragPreviewRows.at(-1);

  return {
    position: "after",
    row: lastPreviewRow.row,
    targetId: lastPreviewRow.id,
  };
}

function updatePointerDropIndicator() {
  if (!dragState) {
    return;
  }

  dragState.frameId = null;
  const dropTarget = getDropTargetFromPointer(dragState.pointerY);

  if (!dropTarget) {
    hideDropLine();
    dragState.dropTargetId = null;
    dragState.dropPosition = null;
    return;
  }

  if (
    dragState.dropTargetId === dropTarget.targetId &&
    dragState.dropPosition === dropTarget.position
  ) {
    return;
  }

  showDropIndicator(dropTarget.row, dropTarget.position);
}

function schedulePointerDropUpdate(clientY) {
  if (!dragState) {
    return;
  }

  dragState.pointerY = clientY;

  if (!dragState.frameId) {
    dragState.frameId = requestAnimationFrame(updatePointerDropIndicator);
  }
}

function toggleTarget(id) {
  const isEnabled = settings.enabledTargetIds.includes(id);
  const enabledTargetIds = isEnabled
    ? settings.enabledTargetIds.filter((targetId) => targetId !== id)
    : [...new Set([...settings.enabledTargetIds, id])];

  if (enabledTargetIds.length === 0) {
    setStatus("至少保留一个搜索网站。", "error");
    render();
    return;
  }

  persist({ ...settings, enabledTargetIds });
}

function renderTargetRow(id, index) {
  const target = getSearchTargetById(id);
  const isEnabled = settings.enabledTargetIds.includes(id);
  const orderNumber = String(index + 1).padStart(2, "0");

  return `
    <li class="target-row" data-target-id="${id}">
      <span class="target-label">
        <span class="target-index">${orderNumber}</span>
        <span>${target.name}</span>
      </span>
      <span class="target-actions">
        <button
          class="target-toggle ${isEnabled ? "is-on" : "is-off"}"
          type="button"
          aria-pressed="${isEnabled}"
          aria-label="${isEnabled ? "关闭" : "开启"} ${target.name}"
          title="${isEnabled ? "关闭" : "开启"} ${target.name}"
        >
          <span class="target-toggle-track" aria-hidden="true">
            <span class="target-toggle-thumb"></span>
          </span>
        </button>
      </span>
    </li>
  `;
}

function renderTargetSection(title, ids, startIndex) {
  const rows = ids
    .map((id, sectionIndex) => renderTargetRow(id, startIndex + sectionIndex))
    .join("");

  return `
    <li class="target-section-row">${title}</li>
    ${rows}
  `;
}

function renderTargetList() {
  const enabledIds = settings.targetOrder.filter(isTargetEnabled);
  const disabledIds = settings.targetOrder.filter((id) => !isTargetEnabled(id));

  targetOrderList.innerHTML = [
    '<li class="target-drop-line" aria-hidden="true"></li>',
    renderTargetSection("已开启", enabledIds, 0),
    renderTargetSection("未开启", disabledIds, enabledIds.length),
  ].join("");
}

function formatHistoryTime(searchedAt) {
  if (!Number.isFinite(searchedAt) || searchedAt <= 0) {
    return "未知时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(searchedAt));
}

function getFilteredHistoryRecords() {
  const filterText = historyFilterInput.value.trim().toLowerCase();

  if (!filterText) {
    return allHistoryRecords;
  }

  return allHistoryRecords.filter((record) =>
    record.query.toLowerCase().includes(filterText),
  );
}

function createHistoryTableRow(record) {
  const row = document.createElement("tr");
  const timeCell = document.createElement("td");
  const queryCell = document.createElement("td");
  const actionCell = document.createElement("td");
  const openButton = document.createElement("button");
  const removeButton = document.createElement("button");

  timeCell.className = "history-time-cell";
  timeCell.textContent = formatHistoryTime(record.searchedAt);
  queryCell.className = "history-query-cell";
  queryCell.textContent = record.query;
  openButton.type = "button";
  openButton.textContent = "重新搜索";
  openButton.dataset.historyQuery = record.query;
  removeButton.type = "button";
  removeButton.textContent = "删除";
  removeButton.dataset.historyRemove = record.id;
  removeButton.setAttribute("aria-label", `删除搜索记录 ${record.query}`);
  actionCell.className = "history-action-cell";
  actionCell.append(openButton, removeButton);
  row.append(timeCell, queryCell, actionCell);

  return row;
}

function renderHistoryTable() {
  const records = getFilteredHistoryRecords();

  historyTableBody.textContent = "";
  allSearchHistoryEmpty.hidden = allHistoryRecords.length > 0;
  clearHistoryButton.disabled = allHistoryRecords.length === 0;

  for (const record of records) {
    historyTableBody.append(createHistoryTableRow(record));
  }
}

async function renderAllSearchHistory() {
  allHistoryRecords = await getSearchHistory(storageArea);
  renderHistoryTable();
}

function render() {
  autoCloseToggle.checked = settings.autoClosePrevious;
  googleImageToggle.checked = settings.googleSearchType === GOOGLE_SEARCH_TYPES.IMAGES;
  googleModeState.textContent = googleImageToggle.checked ? "图片搜索" : "普通搜索";
  showPopupHistoryToggle.checked = showPopupSearchHistory;
  translateChineseToggle.checked = settings.translateChineseToEnglish;
  renderTargetList();
}

autoCloseToggle.addEventListener("change", () => {
  persist({ ...settings, autoClosePrevious: autoCloseToggle.checked });
});

googleImageToggle.addEventListener("change", () => {
  persist({
    ...settings,
    googleSearchType: googleImageToggle.checked
      ? GOOGLE_SEARCH_TYPES.IMAGES
      : GOOGLE_SEARCH_TYPES.WEB,
  });
});

translateChineseToggle.addEventListener("change", () => {
  persist({ ...settings, translateChineseToEnglish: translateChineseToggle.checked });
});

showPopupHistoryToggle.addEventListener("change", async () => {
  try {
    showPopupSearchHistory = await saveShowPopupSearchHistory(
      storageArea,
      showPopupHistoryToggle.checked,
    );
    showPopupHistoryToggle.checked = showPopupSearchHistory;
    setStatus("设置已保存。");
  } catch (error) {
    console.error(error);
    showPopupHistoryToggle.checked = showPopupSearchHistory;
    setStatus("设置保存失败，请重新尝试。", "error");
  }
});

targetOrderList.addEventListener("click", (event) => {
  const row = event.target.closest("[data-target-id]");

  if (!row) {
    return;
  }

  if (event.target.closest(".target-toggle")) {
    toggleTarget(row.dataset.targetId);
  }
});

targetOrderList.addEventListener("pointerdown", (event) => {
  const row = event.target.closest("[data-target-id]");

  if (
    !row ||
    event.button !== 0 ||
    event.target.closest(".target-toggle")
  ) {
    return;
  }

  event.preventDefault();
  row.setPointerCapture(event.pointerId);
  const draggedTargetId = row.dataset.targetId;
  row.classList.add("is-dragging");

  dragState = {
    dragPreviewRows: getPointerDragRows(draggedTargetId),
    draggedTargetId,
    dropPosition: null,
    dropTargetId: null,
    frameId: null,
    pointerId: event.pointerId,
    pointerY: event.clientY,
    row,
  };
  schedulePointerDropUpdate(event.clientY);
});

targetOrderList.addEventListener("pointermove", (event) => {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  event.preventDefault();
  schedulePointerDropUpdate(event.clientY);
});

targetOrderList.addEventListener("pointerup", (event) => {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  event.preventDefault();

  if (dragState.frameId) {
    cancelAnimationFrame(dragState.frameId);
    updatePointerDropIndicator();
  }

  const { draggedTargetId, dropPosition, dropTargetId, row } = dragState;

  if (row.hasPointerCapture(event.pointerId)) {
    row.releasePointerCapture(event.pointerId);
  }

  if (dropTargetId && dropPosition) {
    reorderTarget(draggedTargetId, dropTargetId, dropPosition);
  }

  clearDragState();
});

targetOrderList.addEventListener("pointercancel", clearDragState);

allSearchHistory.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-history-remove]");

  if (removeButton) {
    await removeSearchHistoryRecord(storageArea, removeButton.dataset.historyRemove);
    await renderAllSearchHistory();
    await optionsSearchUi?.refreshHistory();
    optionsSearchInput.focus();
    return;
  }

  const openButton = event.target.closest("[data-history-query]");

  if (!openButton) {
    return;
  }

  optionsSearchInput.value = openButton.dataset.historyQuery;
  optionsSearchForm.requestSubmit();
});

historyFilterInput.addEventListener("input", renderHistoryTable);

clearHistoryButton.addEventListener("click", async () => {
  if (allHistoryRecords.length === 0) {
    return;
  }

  const confirmed = window.confirm("确定要清空全部历史记录吗？");

  if (!confirmed) {
    return;
  }

  await clearSearchHistory(storageArea);
  await renderAllSearchHistory();
  await optionsSearchUi?.refreshHistory();
  optionsSearchInput.focus();
});

shortcutSettingsButton.addEventListener("click", async () => {
  try {
    await openShortcutSettings(chrome.tabs);
  } catch (error) {
    console.error(error);
    setStatus("无法自动打开快捷键页面，请手动访问 chrome://extensions/shortcuts。", "error");
  }
});

initPinButton(sidePanelButton, statusMessage, { closeOnSuccess: false });

showPopupSearchHistory = await getShowPopupSearchHistory(storageArea);
settings = await getSearchSettings(storageArea);
settings.targetOrder = settings.targetOrder.filter((id) =>
  SEARCH_TARGETS.some((target) => target.id === id),
);
render();
await renderAllSearchHistory();
optionsSearchUi = initSearchUi({
  closeOnSuccess: false,
  form: optionsSearchForm,
  historyList: optionsSearchHistory,
  input: optionsSearchInput,
  onHistoryChange: renderAllSearchHistory,
  searchButton: optionsSearchButton,
  statusMessage: optionsSearchStatus,
});
