import { SEARCH_TARGETS, getSearchTargetById } from "./searchTargets.js";
import {
  GOOGLE_SEARCH_TYPES,
  getSearchSettings,
  saveSearchSettings,
} from "./searchSettings.js";

const storageArea = chrome.storage.local;
const autoCloseToggle = document.querySelector("#auto-close-toggle");
const googleImageToggle = document.querySelector("#google-image-toggle");
const googleModeState = document.querySelector("#google-mode-state");
const targetOrderList = document.querySelector("#target-order-list");
const statusMessage = document.querySelector("#status-message");

let settings = null;

function setStatus(message, state = "idle") {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", state === "error");
}

async function persist(nextSettings = settings) {
  settings = await saveSearchSettings(storageArea, nextSettings);
  render();
  setStatus("设置已保存。");
}

function moveTarget(id, direction) {
  const index = settings.targetOrder.indexOf(id);
  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || nextIndex >= settings.targetOrder.length) {
    return;
  }

  const targetOrder = [...settings.targetOrder];
  [targetOrder[index], targetOrder[nextIndex]] = [targetOrder[nextIndex], targetOrder[index]];
  persist({ ...settings, targetOrder });
}

function toggleTarget(id, enabled) {
  const enabledTargetIds = enabled
    ? [...settings.enabledTargetIds, id]
    : settings.enabledTargetIds.filter((targetId) => targetId !== id);

  if (enabledTargetIds.length === 0) {
    setStatus("至少保留一个搜索网站。", "error");
    render();
    return;
  }

  persist({ ...settings, enabledTargetIds });
}

function renderTargetList() {
  targetOrderList.innerHTML = settings.targetOrder
    .map((id, index) => {
      const target = getSearchTargetById(id);

      return `
        <li class="target-row" data-target-id="${id}">
          <label class="target-label">
            <input
              class="target-enabled"
              type="checkbox"
              ${settings.enabledTargetIds.includes(id) ? "checked" : ""}
            >
            <span>${target.name}</span>
          </label>
          <span class="target-actions">
            <button class="move-up" type="button" ${index === 0 ? "disabled" : ""}>上移</button>
            <button class="move-down" type="button" ${
              index === settings.targetOrder.length - 1 ? "disabled" : ""
            }>下移</button>
          </span>
        </li>
      `;
    })
    .join("");
}

function render() {
  autoCloseToggle.checked = settings.autoClosePrevious;
  googleImageToggle.checked = settings.googleSearchType === GOOGLE_SEARCH_TYPES.IMAGES;
  googleModeState.textContent = googleImageToggle.checked ? "图片搜索" : "普通搜索";
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

targetOrderList.addEventListener("change", (event) => {
  if (!event.target.classList.contains("target-enabled")) {
    return;
  }

  const row = event.target.closest("[data-target-id]");
  toggleTarget(row.dataset.targetId, event.target.checked);
});

targetOrderList.addEventListener("click", (event) => {
  const row = event.target.closest("[data-target-id]");

  if (!row) {
    return;
  }

  if (event.target.classList.contains("move-up")) {
    moveTarget(row.dataset.targetId, -1);
  }

  if (event.target.classList.contains("move-down")) {
    moveTarget(row.dataset.targetId, 1);
  }
});

settings = await getSearchSettings(storageArea);
settings.targetOrder = settings.targetOrder.filter((id) =>
  SEARCH_TARGETS.some((target) => target.id === id),
);
render();
