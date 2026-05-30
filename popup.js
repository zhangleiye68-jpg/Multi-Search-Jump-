import {
  initOptionsButton,
  initPinButton,
  initSearchUi,
} from "./searchUi.js";

const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const searchHistory = document.querySelector("#search-history");
const showHistoryToggle = document.querySelector("#show-history-toggle");
const pinPanelButton = document.querySelector("#pin-panel-button");
const optionsButton = document.querySelector("#options-button");
const statusMessage = document.querySelector("#status-message");

initSearchUi({
  closeOnSuccess: true,
  form,
  historyList: searchHistory,
  historyToggle: showHistoryToggle,
  input,
  searchButton,
  statusMessage,
});
initPinButton(pinPanelButton, statusMessage);
initOptionsButton(optionsButton);
