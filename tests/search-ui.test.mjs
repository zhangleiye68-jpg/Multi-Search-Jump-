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

describe("search UI", () => {
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
            return storageGetPromise.then(() =>
              Object.fromEntries(keys.map((key) => [key, undefined])),
            );
          },
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
            return Object.fromEntries(keys.map((key) => [key, undefined]));
          },
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
});
