import { initOptionsButton, initSearchUi } from "./searchUi.js";

initSearchUi({
  closeOnSuccess: false,
  form: document.querySelector("#search-form"),
  input: document.querySelector("#search-input"),
  searchButton: document.querySelector("#search-button"),
  statusMessage: document.querySelector("#status-message"),
});
initOptionsButton(document.querySelector("#options-button"));
