import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SHORTCUT_SETTINGS_URL,
  openShortcutSettings,
} from "../extension/src/shortcutSettings.js";

describe("shortcut settings", () => {
  it("opens Chrome's extension shortcut settings page", async () => {
    const calls = [];
    const tabsApi = {
      async create(options) {
        calls.push(options);
      },
    };

    await openShortcutSettings(tabsApi);

    assert.equal(SHORTCUT_SETTINGS_URL, "chrome://extensions/shortcuts");
    assert.deepEqual(calls, [
      {
        active: true,
        url: "chrome://extensions/shortcuts",
      },
    ]);
  });
});
