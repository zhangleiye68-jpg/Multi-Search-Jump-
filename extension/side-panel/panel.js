import { initOptionsButton, initSearchUi } from "../src/searchUi.js";

initSearchUi({
  closeOnSuccess: false,
  form: document.querySelector("#search-form"),
  historyList: document.querySelector("#search-history"),
  input: document.querySelector("#search-input"),
  searchButton: document.querySelector("#search-button"),
  statusMessage: document.querySelector("#status-message"),
});
initOptionsButton(document.querySelector("#options-button"));
