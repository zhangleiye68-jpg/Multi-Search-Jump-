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
