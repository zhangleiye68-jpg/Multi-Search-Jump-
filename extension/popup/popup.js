import { initOptionsButton, initPinButton, initSearchUi } from "../src/searchUi.js";
import { initLocalToolkitButton } from "../src/localToolkitUi.js";

const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const searchHistory = document.querySelector("#search-history");
const sidePanelButton = document.querySelector("#side-panel-button");
const localToolkitButton = document.querySelector("#local-toolkit-button");
const localToolkitQuickButton = document.querySelector("#local-toolkit-quick-button");
const optionsButton = document.querySelector("#options-button");
const statusMessage = document.querySelector("#status-message");

initSearchUi({
  closeOnSuccess: true,
  form,
  historyList: searchHistory,
  input,
  searchButton,
  statusMessage,
  useHistoryVisibilityPreference: true,
});
initPinButton(sidePanelButton, statusMessage);
initLocalToolkitButton(localToolkitButton);
initLocalToolkitButton(localToolkitQuickButton);
initOptionsButton(optionsButton);
