import { SEARCH_TARGETS, buildSearchUrls } from "./searchTargets.js";

const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const button = document.querySelector("#search-button");
const targetList = document.querySelector("#target-list");
const statusMessage = document.querySelector("#status-message");

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

async function openSearchTabs(urls) {
  for (const url of urls) {
    await chrome.tabs.create({ url });
  }
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
    await openSearchTabs(urls);
    window.close();
  } catch (error) {
    console.error(error);
    button.disabled = false;
    setStatus("无法打开搜索页，请重新加载扩展后再试。", "error");
    input.focus();
  }
});

renderTargets();
input.focus();
