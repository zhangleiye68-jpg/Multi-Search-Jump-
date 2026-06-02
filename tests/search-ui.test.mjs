import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { initPinButton, initSearchUi } from "../extension/src/searchUi.js";

function createClassList() {
  const values = new Set();

  return {
    contains(value) {
      return values.has(value);
    },
    toggle(value, enabled) {
      if (enabled) {
        values.add(value);
      } else {
        values.delete(value);
      }
    },
  };
}

function createFormHarness() {
  let submitHandler = null;
  const inputHandlers = new Map();
  let submitRequests = 0;
  const form = {
    addEventListener(type, handler) {
      if (type === "submit") {
        submitHandler = handler;
      }
    },
    requestSubmit() {
      submitRequests += 1;
    },
  };
  const input = {
    focused: false,
    scrollHeight: 38,
    style: {},
    value: "maga",
    addEventListener(type, handler) {
      inputHandlers.set(type, handler);
    },
    focus() {
      this.focused = true;
    },
  };
  const searchButton = {
    disabled: false,
  };
  const statusMessage = {
    classList: createClassList(),
    textContent: "",
  };

  return {
    dispatchInputEvent() {
      inputHandlers.get("input")?.({});
    },
    dispatchInputKeydown(event) {
      inputHandlers.get("keydown")?.(event);
    },
    get submitRequests() {
      return submitRequests;
    },
    async submit() {
      await submitHandler({
        preventDefault() {},
      });
    },
    form,
    input,
    searchButton,
    statusMessage,
  };
}

function createHistoryListHarness() {
  const children = [];

  return {
    children,
    hidden: false,
    textContent: "",
    addEventListener() {},
    append(child) {
      children.push(child);
    },
  };
}

function createHistoryToggleHarness() {
  let changeHandler = null;

  return {
    checked: false,
    addEventListener(type, handler) {
      if (type === "change") {
        changeHandler = handler;
      }
    },
    async change(checked) {
      this.checked = checked;
      await changeHandler?.();
    },
  };
}

function createElementHarness() {
  return {
    dataset: {},
    setAttribute() {},
    append(...children) {
      this.children = children;
    },
  };
}

function createSwitchHarness() {
  let changeHandler = null;

  return {
    checked: false,
    disabled: false,
    title: "",
    type: "checkbox",
    addEventListener(type, handler) {
      if (type === "change") {
        changeHandler = handler;
      }
    },
    async change(checked) {
      this.checked = checked;
      await changeHandler?.();
    },
  };
}

function createButtonHarness() {
  let clickHandler = null;

  return {
    disabled: false,
    title: "",
    type: "button",
    addEventListener(type, handler) {
      if (type === "click") {
        clickHandler = handler;
      }
    },
    async click() {
      await clickHandler?.();
    },
  };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("search UI", () => {
  function createStorageArea(initialValues = {}) {
    const values = { ...initialValues };

    return {
      values,
      async get(keys) {
        const requestedKeys = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(requestedKeys.map((key) => [key, values[key]]));
      },
      async set(nextValues) {
        Object.assign(values, nextValues);
      },
    };
  }

  it("shows busy feedback before reading saved settings", async () => {
    const harness = createFormHarness();
    let resolveStorageGet = null;
    const storageGetPromise = new Promise((resolve) => {
      resolveStorageGet = resolve;
    });

    globalThis.chrome = {
      runtime: {
        async sendMessage() {
          return { ok: true };
        },
      },
      storage: {
        local: {
          async get(keys) {
            const requestedKeys = Array.isArray(keys) ? keys : [keys];
            return storageGetPromise.then(() =>
              Object.fromEntries(requestedKeys.map((key) => [key, undefined])),
            );
          },
          async set() {},
        },
      },
    };

    initSearchUi({
      closeOnSuccess: false,
      form: harness.form,
      input: harness.input,
      searchButton: harness.searchButton,
      statusMessage: harness.statusMessage,
    });

    const submitPromise = harness.submit();
    await Promise.resolve();

    assert.equal(harness.searchButton.disabled, true);
    assert.equal(harness.statusMessage.textContent, "正在整理搜索页。");
    assert.equal(harness.statusMessage.classList.contains("is-busy"), true);

    resolveStorageGet();
    await submitPromise;
  });

  it("re-enables the search button after a successful side panel search", async () => {
    const harness = createFormHarness();
    const messages = [];

    globalThis.chrome = {
      runtime: {
        async sendMessage(message) {
          messages.push(message);
          return { ok: true };
        },
      },
      storage: {
        local: {
          async get(keys) {
            const requestedKeys = Array.isArray(keys) ? keys : [keys];
            return Object.fromEntries(requestedKeys.map((key) => [key, undefined]));
          },
          async set() {},
        },
      },
    };

    initSearchUi({
      closeOnSuccess: false,
      form: harness.form,
      input: harness.input,
      searchButton: harness.searchButton,
      statusMessage: harness.statusMessage,
    });

    await harness.submit();

    assert.equal(harness.searchButton.disabled, false);
    assert.equal(harness.statusMessage.textContent, "搜索页已打开。");
    assert.equal(messages.length, 1);
  });

  it("delegates successful search history to the background worker", async () => {
    const harness = createFormHarness();
    const storageArea = createStorageArea();
    const messages = [];

    globalThis.chrome = {
      runtime: {
        async sendMessage(message) {
          messages.push(message);
          return { ok: true };
        },
      },
      storage: {
        local: storageArea,
      },
    };

    initSearchUi({
      closeOnSuccess: false,
      form: harness.form,
      input: harness.input,
      searchButton: harness.searchButton,
      statusMessage: harness.statusMessage,
    });

    await harness.submit();

    assert.equal(messages[0].query, "maga");
    assert.equal(storageArea.values.searchHistory, undefined);
  });

  it("submits multiline search fields with Enter but keeps Shift+Enter for line breaks", () => {
    const harness = createFormHarness();

    initSearchUi({
      closeOnSuccess: false,
      form: harness.form,
      input: harness.input,
      searchButton: harness.searchButton,
      statusMessage: harness.statusMessage,
    });

    let prevented = false;
    harness.dispatchInputKeydown({
      key: "Enter",
      shiftKey: false,
      isComposing: false,
      preventDefault() {
        prevented = true;
      },
    });

    assert.equal(prevented, true);
    assert.equal(harness.submitRequests, 1);

    prevented = false;
    harness.dispatchInputKeydown({
      key: "Enter",
      shiftKey: true,
      isComposing: false,
      preventDefault() {
        prevented = true;
      },
    });

    assert.equal(prevented, false);
    assert.equal(harness.submitRequests, 1);
  });

  it("resizes multiline search fields as their content wraps", () => {
    const harness = createFormHarness();
    harness.input.scrollHeight = 72;

    initSearchUi({
      closeOnSuccess: false,
      form: harness.form,
      input: harness.input,
      searchButton: harness.searchButton,
      statusMessage: harness.statusMessage,
    });

    assert.equal(harness.input.style.height, "72px");

    harness.input.scrollHeight = 96;
    harness.dispatchInputEvent();

    assert.equal(harness.input.style.height, "96px");
  });

  it("uses the translated query for manual Chinese searches when enabled", async () => {
    const harness = createFormHarness();
    const storageArea = createStorageArea({
      translateChineseToEnglish: true,
      enabledTargetIds: ["google"],
      googleSearchType: "web",
    });
    const messages = [];
    harness.input.value = "红色连衣裙";

    globalThis.chrome = {
      runtime: {
        async sendMessage(message) {
          messages.push(message);
          return { ok: true };
        },
      },
      storage: {
        local: storageArea,
      },
    };

    initSearchUi({
      closeOnSuccess: false,
      form: harness.form,
      input: harness.input,
      searchButton: harness.searchButton,
      statusMessage: harness.statusMessage,
      translateQuery: async () => "red dress",
    });

    await harness.submit();

    assert.equal(messages[0].query, "red dress");
    assert.equal(messages[0].title, "Search: red dress");
    assert.deepEqual(messages[0].urls, ["https://www.google.com/search?q=red%20dress"]);
  });

  it("hides popup history when the popup visibility preference is off", async () => {
    const harness = createFormHarness();
    const historyList = createHistoryListHarness();
    const historyToggle = createHistoryToggleHarness();
    const originalDocument = globalThis.document;
    const storageArea = createStorageArea({
      showPopupSearchHistory: false,
      searchHistory: [
        { id: "one", query: "alpha", searchedAt: 2 },
        { id: "two", query: "beta", searchedAt: 1 },
      ],
    });

    globalThis.chrome = {
      runtime: {
        async sendMessage() {
          return { ok: true };
        },
      },
      storage: {
        local: storageArea,
      },
    };
    globalThis.document = {
      createElement: createElementHarness,
    };

    try {
      initSearchUi({
        closeOnSuccess: true,
        form: harness.form,
        historyList,
        historyToggle,
        input: harness.input,
        searchButton: harness.searchButton,
        statusMessage: harness.statusMessage,
      });
      await flushAsyncWork();

      assert.equal(historyToggle.checked, false);
      assert.equal(historyList.hidden, true);

      await historyToggle.change(true);

      assert.equal(storageArea.values.showPopupSearchHistory, true);
      assert.equal(historyList.hidden, false);
      assert.equal(historyList.children.length, 2);
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it("can apply popup history visibility preference without an inline toggle", async () => {
    const harness = createFormHarness();
    const historyList = createHistoryListHarness();
    const originalDocument = globalThis.document;
    const storageArea = createStorageArea({
      showPopupSearchHistory: false,
      searchHistory: [
        { id: "one", query: "alpha", searchedAt: 2 },
        { id: "two", query: "beta", searchedAt: 1 },
      ],
    });

    globalThis.chrome = {
      runtime: {
        async sendMessage() {
          return { ok: true };
        },
      },
      storage: {
        local: storageArea,
      },
    };
    globalThis.document = {
      createElement: createElementHarness,
    };

    try {
      initSearchUi({
        closeOnSuccess: true,
        form: harness.form,
        historyList,
        input: harness.input,
        searchButton: harness.searchButton,
        statusMessage: harness.statusMessage,
        useHistoryVisibilityPreference: true,
      });
      await flushAsyncWork();

      assert.equal(historyList.hidden, true);
      assert.equal(historyList.children.length, 0);
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it("opens the side panel from a switch only when switched on", async () => {
    const sidePanelSwitch = createSwitchHarness();
    const openedWindows = [];
    const statusMessage = {
      classList: createClassList(),
      textContent: "",
    };

    globalThis.chrome = {
      sidePanel: {
        async open(options) {
          openedWindows.push(options.windowId);
        },
      },
      windows: {
        async getCurrent() {
          return { id: 7 };
        },
      },
    };

    initPinButton(sidePanelSwitch, statusMessage, { closeOnSuccess: false });

    await sidePanelSwitch.change(true);
    await sidePanelSwitch.change(false);

    assert.deepEqual(openedWindows, [7]);
    assert.equal(sidePanelSwitch.checked, false);
  });

  it("opens the side panel from a popup icon button and closes the popup", async () => {
    const sidePanelButton = createButtonHarness();
    const openedWindows = [];
    const originalWindow = globalThis.window;
    let closeCount = 0;
    const statusMessage = {
      classList: createClassList(),
      textContent: "",
    };

    globalThis.chrome = {
      sidePanel: {
        async open(options) {
          openedWindows.push(options.windowId);
        },
      },
      windows: {
        async getCurrent() {
          return { id: 9 };
        },
      },
    };
    globalThis.window = {
      close() {
        closeCount += 1;
      },
    };

    try {
      initPinButton(sidePanelButton, statusMessage);
      await sidePanelButton.click();

      assert.deepEqual(openedWindows, [9]);
      assert.equal(closeCount, 1);
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
