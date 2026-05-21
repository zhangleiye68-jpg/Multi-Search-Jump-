import { SEARCH_TARGETS, buildSearchUrls } from "./searchTargets.js";
import {
  buildGroupTitle,
  getAutoClosePrevious,
  openManagedSearchTabs,
  setAutoClosePrevious,
} from "./tabLauncher.js";

const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const button = document.querySelector("#search-button");
const autoCloseToggle = document.querySelector("#auto-close-toggle");
const autoCloseState = document.querySelector("#auto-close-state");
const targetList = document.querySelector("#target-list");
const statusMessage = document.querySelector("#status-message");
const storageArea = chrome.storage.local;

function renderTargets() {
  targetList.innerHTML = SEARCH_TARGETS.map(
    (target) => `
      <li class="target-item">
        <span class="target-dot" aria-hidden="true"></span>
        <span class="target-name">${target.name}</span>
      </li>
    `,
  ).join("");
}

function setStatus(message, state = "idle") {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", state === "error");
  statusMessage.classList.toggle("is-busy", state === "busy");
}

function renderAutoCloseState(enabled) {
  autoCloseToggle.checked = enabled;
  autoCloseState.textContent = enabled ? "开启" : "关闭";
}

async function loadAutoClosePreference() {
  renderAutoCloseState(await getAutoClosePrevious(storageArea));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const urls = buildSearchUrls(input.value);

  if (urls.length === 0) {
    setStatus("请输入关键词。", "error");
    input.focus();
    return;
  }

  button.disabled = true;
  autoCloseToggle.disabled = true;
  setStatus("正在整理搜索页。", "busy");

  try {
    const autoClosePrevious = autoCloseToggle.checked;
    await setAutoClosePrevious(storageArea, autoClosePrevious);
    await openManagedSearchTabs({
      tabsApi: chrome.tabs,
      tabGroupsApi: chrome.tabGroups,
      storageArea,
      urls,
      title: buildGroupTitle(input.value),
      autoClosePrevious,
    });
    window.close();
  } catch (error) {
    console.error(error);
    button.disabled = false;
    autoCloseToggle.disabled = false;
    setStatus("无法打开搜索页，请重新加载扩展后再试。", "error");
    input.focus();
  }
});

autoCloseToggle.addEventListener("change", async () => {
  const enabled = autoCloseToggle.checked;
  renderAutoCloseState(enabled);
  await setAutoClosePrevious(storageArea, enabled);
  setStatus(enabled ? "下次搜索前会关闭上次结果。" : "下次搜索会保留上次结果。");
});

renderTargets();
loadAutoClosePreference();
input.focus();
