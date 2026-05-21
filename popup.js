import { SEARCH_TARGETS, buildSearchUrls } from "./searchTargets.js";
import {
  buildGroupTitle,
  closeLastSearchGroup,
  getLastSearchSession,
  openGroupedSearchTabs,
} from "./tabLauncher.js";

const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const button = document.querySelector("#search-button");
const closeGroupButton = document.querySelector("#close-group-button");
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

async function refreshCloseButton() {
  const session = await getLastSearchSession(storageArea);
  closeGroupButton.disabled = !session;
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
  setStatus("正在打开 4 个搜索页。", "busy");

  try {
    await openGroupedSearchTabs({
      tabsApi: chrome.tabs,
      tabGroupsApi: chrome.tabGroups,
      storageArea,
      urls,
      title: buildGroupTitle(input.value),
    });
    window.close();
  } catch (error) {
    console.error(error);
    button.disabled = false;
    setStatus("无法打开搜索页，请重新加载扩展后再试。", "error");
    input.focus();
  }
});

closeGroupButton.addEventListener("click", async () => {
  closeGroupButton.disabled = true;
  setStatus("正在关闭上次搜索组。", "busy");

  try {
    const result = await closeLastSearchGroup({
      tabsApi: chrome.tabs,
      storageArea,
    });

    setStatus(`已关闭 ${result.closedCount} 个搜索页。`);
  } catch (error) {
    console.error(error);
    setStatus("无法关闭搜索组，请手动关闭后重新搜索。", "error");
  } finally {
    await refreshCloseButton();
    input.focus();
  }
});

renderTargets();
refreshCloseButton();
input.focus();
