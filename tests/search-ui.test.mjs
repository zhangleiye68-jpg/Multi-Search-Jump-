import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { initSearchUi } from "../searchUi.js";

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
  const form = {
    addEventListener(type, handler) {
      if (type === "submit") {
        submitHandler = handler;
      }
    },
  };
  const input = {
    focused: false,
    value: "maga",
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
});
