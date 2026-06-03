import { initOptionsButton, initSearchUi } from "../src/searchUi.js";
import { initCaptionBoardUi } from "../src/sidePanelCaptionBoard.js";

initSearchUi({
  closeOnSuccess: false,
  form: document.querySelector("#search-form"),
  input: document.querySelector("#search-input"),
  searchButton: document.querySelector("#search-button"),
  statusMessage: document.querySelector("#status-message"),
});
initOptionsButton(document.querySelector("#options-button"));

const modeButtons = Object.fromEntries(
  [...document.querySelectorAll("[data-caption-mode]")]
    .map((button) => [button.dataset.captionMode, button]),
);

const captionBoard = initCaptionBoardUi({
  elements: {
    captionList: document.querySelector("#caption-board-list"),
    copyButton: document.querySelector("#caption-board-copy-button"),
    detailsCopyButton: document.querySelector("#caption-board-details-copy-button"),
    detailsOriginal: document.querySelector("#caption-board-details-original"),
    detailsTranslation: document.querySelector("#caption-board-details-translation"),
    fontDecreaseButton: document.querySelector("#caption-board-font-decrease-button"),
    fontIncreaseButton: document.querySelector("#caption-board-font-increase-button"),
    metrics: document.querySelector("#caption-board-metrics"),
    modeButtons,
    potentialBadge: document.querySelector("#caption-board-potential"),
    refreshButton: document.querySelector("#caption-board-refresh-button"),
    section: document.querySelector("#caption-board-section"),
    status: document.querySelector("#caption-board-status"),
    unavailable: document.querySelector("#caption-board-unavailable"),
    warnings: document.querySelector("#caption-board-warnings"),
  },
});

captionBoard.syncActiveTab();
