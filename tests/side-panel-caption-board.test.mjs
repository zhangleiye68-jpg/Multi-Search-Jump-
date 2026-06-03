import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  CAPTION_BOARD_MESSAGE_TYPES,
  initCaptionBoardUi,
  isTikTokTab,
} from "../extension/src/sidePanelCaptionBoard.js";

function createClassList() {
  const values = new Set();

  return {
    add(...tokens) {
      for (const token of tokens) {
        values.add(token);
      }
    },
    contains(token) {
      return values.has(token);
    },
    remove(...tokens) {
      for (const token of tokens) {
        values.delete(token);
      }
    },
    toggle(token, force) {
      const shouldAdd = force ?? !values.has(token);

      if (shouldAdd) {
        values.add(token);
      } else {
        values.delete(token);
      }

      return shouldAdd;
    },
  };
}

function createElement(tagName = "div") {
  const handlers = new Map();
  let textContent = "";

  return {
    children: [],
    classList: createClassList(),
    dataset: {},
    disabled: false,
    hidden: false,
    lang: "",
    tagName,
    title: "",
    get textContent() {
      if (this.children.length > 0) {
        return `${textContent}${this.children.map((child) => child.textContent ?? "").join("")}`;
      }

      return textContent;
    },
    set textContent(value) {
      textContent = String(value ?? "");

      if (textContent === "") {
        this.children.length = 0;
      }
    },
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
    append(...children) {
      this.children.push(...children);
    },
    async click() {
      return handlers.get("click")?.({ preventDefault() {} });
    },
    setAttribute(name, value) {
      this[name] = value;
    },
  };
}

function createElements() {
  return {
    captionList: createElement(),
    copyButton: createElement("button"),
    detailsOriginal: createElement("p"),
    detailsTranslation: createElement("p"),
    fontDecreaseButton: createElement("button"),
    fontIncreaseButton: createElement("button"),
    metrics: createElement(),
    modeButtons: {
      bilingual: createElement("button"),
      chinese: createElement("button"),
      original: createElement("button"),
    },
    potentialBadge: createElement("span"),
    refreshButton: createElement("button"),
    section: createElement("section"),
    status: createElement("p"),
    unavailable: createElement("p"),
    warnings: createElement(),
  };
}

function createDocument() {
  return {
    createElement,
  };
}

function createCaptionState(overrides = {}) {
  return {
    canDecreaseFont: true,
    canIncreaseFont: true,
    copyText: "Fresh subtitle\n新鲜字幕",
    displayMode: "bilingual",
    fontScale: 110,
    lines: [{ original: "Fresh subtitle", translation: "新鲜字幕" }],
    metrics: [
      { icon: "♥", label: "每小时点赞量", value: "1万/h" },
    ],
    status: "已读取 1 条字幕。",
    videoDetails: {
      original: "A practical breakdown.",
      translation: "实用拆解。",
    },
    warnings: ["非英内容"],
    ...overrides,
  };
}

describe("side panel caption board", () => {
  it("detects TikTok tabs without matching unrelated pages", () => {
    assert.equal(isTikTokTab({ url: "https://www.tiktok.com/@demo/video/123" }), true);
    assert.equal(isTikTokTab({ url: "https://ads.tiktok.com/i18n/home" }), false);
    assert.equal(isTikTokTab({ url: "https://tiktok.com/@demo/video/123" }), false);
    assert.equal(isTikTokTab({ url: "https://www.google.com/search?q=tiktok" }), false);
    assert.equal(isTikTokTab({ url: "chrome://extensions" }), false);
  });

  it("keeps the side panel and TikTok content script on the same message contract", async () => {
    const source = await readFile("extension/src/tiktokCaptionContent.js", "utf8");

    for (const messageType of Object.values(CAPTION_BOARD_MESSAGE_TYPES)) {
      assert.match(source, new RegExp(messageType));
    }

    assert.match(source, /globalThis\.chrome\?\.runtime\?\.onMessage\?\.addListener/);
  });

  it("syncs active TikTok captions and maps board actions to content script commands", async () => {
    const elements = createElements();
    const messages = [];
    const copied = [];
    const tabsApi = {
      async query() {
        return [{ id: 42, url: "https://www.tiktok.com/@demo/video/123" }];
      },
    };
    const runtimeApi = {
      async sendMessage(tabId, message) {
        messages.push({ message, tabId });

        if (message.type === CAPTION_BOARD_MESSAGE_TYPES.GET_STATE) {
          return {
            ok: true,
            state: createCaptionState(),
          };
        }

        return { ok: true };
      },
    };
    const board = initCaptionBoardUi({
      clipboard: {
        async writeText(value) {
          copied.push(value);
        },
      },
      document: createDocument(),
      elements,
      runtimeApi,
      setInterval: null,
      tabsApi,
    });

    await board.syncActiveTab();

    assert.equal(elements.section.hidden, false);
    assert.equal(elements.unavailable.hidden, true);
    assert.equal(elements.status.textContent, "已读取 1 条字幕。");
    assert.equal(elements.captionList.children[0].textContent, "Fresh subtitle新鲜字幕");
    assert.equal(elements.modeButtons.bilingual.classList.contains("is-active"), true);
    assert.equal(elements.fontDecreaseButton.disabled, false);
    assert.equal(elements.fontIncreaseButton.disabled, false);
    assert.equal(elements.detailsOriginal.textContent, "A practical breakdown.");
    assert.equal(elements.detailsTranslation.textContent, "实用拆解。");
    assert.equal(elements.warnings.textContent, "非英内容");

    await elements.refreshButton.click();
    await elements.modeButtons.original.click();
    await elements.fontIncreaseButton.click();
    await elements.copyButton.click();

    assert.deepEqual(
      messages.map(({ message }) => message),
      [
        { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE },
        { type: CAPTION_BOARD_MESSAGE_TYPES.REFRESH_IF_SOURCE_CHANGED },
        { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE },
        { type: CAPTION_BOARD_MESSAGE_TYPES.REFRESH },
        { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE },
        { displayMode: "original", type: CAPTION_BOARD_MESSAGE_TYPES.SET_DISPLAY_MODE },
        { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE },
        { delta: 10, type: CAPTION_BOARD_MESSAGE_TYPES.ADJUST_FONT_SCALE },
        { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE },
      ],
    );
    assert.deepEqual(copied, ["Fresh subtitle\n新鲜字幕"]);
  });

  it("shows a connecting status when the TikTok content script is temporarily unavailable", async () => {
    const elements = createElements();
    const messages = [];
    const board = initCaptionBoardUi({
      document: createDocument(),
      elements,
      runtimeApi: {
        async sendMessage(tabId, message) {
          messages.push({ message, tabId });
          throw new Error("Receiving end does not exist.");
        },
      },
      setInterval: null,
      tabsApi: {
        async query() {
          return [{ id: 42, url: "https://www.tiktok.com/@demo/video/123" }];
        },
      },
    });

    await board.syncActiveTab();

    assert.equal(elements.section.hidden, false);
    assert.equal(elements.unavailable.hidden, true);
    assert.deepEqual(messages, [
      { message: { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE }, tabId: 42 },
    ]);
    assert.equal(elements.status.textContent, "正在连接 TikTok 字幕看板。");
    assert.doesNotMatch(elements.status.textContent, /无法连接/);
  });

  it("renders existing overlay captions before refreshing and keeps them during transient empty states", async () => {
    const elements = createElements();
    const messages = [];
    const states = [
      createCaptionState(),
      createCaptionState({
        copyText: "",
        lines: [],
        metrics: [],
        status: "正在读取字幕。",
        videoDetails: { original: "", translation: "" },
        warnings: [],
      }),
    ];
    const board = initCaptionBoardUi({
      document: createDocument(),
      elements,
      runtimeApi: {
        async sendMessage(_tabId, message) {
          messages.push(message);

          if (message.type === CAPTION_BOARD_MESSAGE_TYPES.GET_STATE) {
            return { ok: true, state: states.shift() };
          }

          return { ok: true };
        },
      },
      setInterval: null,
      tabsApi: {
        async query() {
          return [{ id: 42, url: "https://www.tiktok.com/@demo/video/123" }];
        },
      },
    });

    await board.syncActiveTab();

    assert.deepEqual(messages, [
      { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE },
      { type: CAPTION_BOARD_MESSAGE_TYPES.REFRESH_IF_SOURCE_CHANGED },
      { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE },
    ]);
    assert.equal(elements.status.textContent, "已读取 1 条字幕。");
    assert.equal(elements.captionList.children[0].textContent, "Fresh subtitle新鲜字幕");
    assert.equal(elements.detailsOriginal.textContent, "A practical breakdown.");
    assert.equal(elements.metrics.textContent, "♥ 1万/h");
    assert.equal(elements.warnings.textContent, "非英内容");
  });

  it("keeps rendered captions when a later sync loses the content-script connection", async () => {
    const elements = createElements();
    let shouldFail = false;
    const board = initCaptionBoardUi({
      clipboard: {
        async writeText(value) {
          this.value = value;
        },
      },
      document: createDocument(),
      elements,
      runtimeApi: {
        async sendMessage(_tabId, message) {
          if (shouldFail) {
            throw new Error("Extension context invalidated.");
          }

          if (message.type === CAPTION_BOARD_MESSAGE_TYPES.GET_STATE) {
            return { ok: true, state: createCaptionState() };
          }

          return { ok: true };
        },
      },
      setInterval: null,
      tabsApi: {
        async query() {
          return [{ id: 42, url: "https://www.tiktok.com/@demo/video/123" }];
        },
      },
    });

    await board.syncActiveTab();
    shouldFail = true;
    await board.syncActiveTab();

    assert.equal(elements.status.textContent, "字幕看板连接恢复中。");
    assert.equal(elements.captionList.children[0].textContent, "Fresh subtitle新鲜字幕");
    assert.equal(elements.detailsOriginal.textContent, "A practical breakdown.");
    assert.equal(elements.metrics.textContent, "♥ 1万/h");
    assert.equal(elements.warnings.textContent, "非英内容");

    await elements.copyButton.click();

    assert.equal(elements.status.textContent, "字幕已复制。");
  });

  it("does not switch away from the last connected TikTok tab until the candidate tab responds", async () => {
    const elements = createElements();
    const sent = [];
    let activeTab = { id: 42, url: "https://www.tiktok.com/@demo/video/123" };
    const board = initCaptionBoardUi({
      document: createDocument(),
      elements,
      runtimeApi: {
        async sendMessage(tabId, message) {
          sent.push({ message, tabId });

          if (tabId === 99) {
            throw new Error("No receiver on candidate tab.");
          }

          if (message.type === CAPTION_BOARD_MESSAGE_TYPES.GET_STATE) {
            return { ok: true, state: createCaptionState() };
          }

          return { ok: true };
        },
      },
      setInterval: null,
      tabsApi: {
        async query() {
          return [activeTab];
        },
      },
    });

    await board.syncActiveTab();
    activeTab = { id: 99, url: "https://www.tiktok.com/search?q=demo" };
    await board.syncActiveTab();
    await elements.refreshButton.click();

    assert.equal(elements.status.textContent, "已读取 1 条字幕。");
    assert.deepEqual(
      sent.map(({ tabId, message }) => [tabId, message.type]),
      [
        [42, CAPTION_BOARD_MESSAGE_TYPES.GET_STATE],
        [42, CAPTION_BOARD_MESSAGE_TYPES.REFRESH_IF_SOURCE_CHANGED],
        [42, CAPTION_BOARD_MESSAGE_TYPES.GET_STATE],
        [99, CAPTION_BOARD_MESSAGE_TYPES.GET_STATE],
        [42, CAPTION_BOARD_MESSAGE_TYPES.REFRESH],
        [42, CAPTION_BOARD_MESSAGE_TYPES.GET_STATE],
      ],
    );
  });

  it("keeps existing captions when manual board commands cannot reach the content script", async () => {
    const elements = createElements();
    let shouldFail = false;
    const board = initCaptionBoardUi({
      document: createDocument(),
      elements,
      runtimeApi: {
        async sendMessage(_tabId, message) {
          if (shouldFail) {
            return { error: "No receiver", ok: false };
          }

          if (message.type === CAPTION_BOARD_MESSAGE_TYPES.GET_STATE) {
            return { ok: true, state: createCaptionState() };
          }

          return { ok: true };
        },
      },
      setInterval: null,
      tabsApi: {
        async query() {
          return [{ id: 42, url: "https://www.tiktok.com/@demo/video/123" }];
        },
      },
    });

    await board.syncActiveTab();
    shouldFail = true;
    await elements.refreshButton.click();
    await elements.modeButtons.original.click();
    await elements.fontIncreaseButton.click();

    assert.equal(elements.status.textContent, "字幕看板连接恢复中。");
    assert.equal(elements.captionList.children[0].textContent, "Fresh subtitle新鲜字幕");
    assert.equal(elements.detailsOriginal.textContent, "A practical breakdown.");
    assert.equal(elements.metrics.textContent, "♥ 1万/h");
  });

  it("renders the latest caption state after a failed connection recovers", async () => {
    const elements = createElements();
    let state = "fail";
    const board = initCaptionBoardUi({
      document: createDocument(),
      elements,
      runtimeApi: {
        async sendMessage(_tabId, message) {
          if (state === "fail") {
            throw new Error("No receiver yet.");
          }

          if (message.type === CAPTION_BOARD_MESSAGE_TYPES.GET_STATE) {
            return {
              ok: true,
              state: createCaptionState({
                copyText: "Recovered subtitle\n恢复字幕",
                lines: [{ original: "Recovered subtitle", translation: "恢复字幕" }],
                status: "已读取 1 条字幕。",
                videoDetails: {
                  original: "Recovered details.",
                  translation: "恢复详情。",
                },
              }),
            };
          }

          return { ok: true };
        },
      },
      setInterval: null,
      tabsApi: {
        async query() {
          return [{ id: 42, url: "https://www.tiktok.com/@demo/video/123" }];
        },
      },
    });

    await board.syncActiveTab();
    state = "ok";
    await board.syncActiveTab();

    assert.equal(elements.status.textContent, "已读取 1 条字幕。");
    assert.equal(elements.captionList.children[0].textContent, "Recovered subtitle恢复字幕");
    assert.equal(elements.detailsOriginal.textContent, "Recovered details.");
  });

  it("hides the caption board outside TikTok", async () => {
    const elements = createElements();
    const messages = [];
    const board = initCaptionBoardUi({
      document: createDocument(),
      elements,
      runtimeApi: {
        async sendMessage(_tabId, message) {
          messages.push(message);
          return { ok: true };
        },
      },
      setInterval: null,
      tabsApi: {
        async query() {
          return [{ id: 7, url: "https://www.google.com/" }];
        },
      },
    });

    await board.syncActiveTab();

    assert.equal(elements.section.hidden, true);
    assert.equal(elements.unavailable.hidden, true);
    assert.equal(messages.length, 0);
  });
});
