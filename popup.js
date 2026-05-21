import {
  initOptionsButton,
  initPinButton,
  initSearchUi,
} from "./searchUi.js";

const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const pinPanelButton = document.querySelector("#pin-panel-button");
const optionsButton = document.querySelector("#options-button");
const statusMessage = document.querySelector("#status-message");

initSearchUi({
  closeOnSuccess: true,
  form,
  input,
  searchButton,
  statusMessage,
});
initPinButton(pinPanelButton, statusMessage);
initOptionsButton(optionsButton);
