import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TIKTOK_CAPTION_BACKGROUND_MESSAGE_TYPE,
  handleTikTokCaptionBackgroundMessage,
  runTikTokCaptionOverlayCommand,
} from "../extension/src/tiktokCaptionBackgroundBridge.js";

const CAPTION_BOARD_MESSAGE_TYPES = Object.freeze({
  ADJUST_FONT_SCALE: "MSJ_TIKTOK_CAPTION_ADJUST_FONT_SCALE",
  GET_STATE: "MSJ_TIKTOK_CAPTION_GET_STATE",
  REFRESH: "MSJ_TIKTOK_CAPTION_REFRESH",
  REFRESH_IF_SOURCE_CHANGED: "MSJ_TIKTOK_CAPTION_REFRESH_IF_SOURCE_CHANGED",
  SET_DISPLAY_MODE: "MSJ_TIKTOK_CAPTION_SET_DISPLAY_MODE",
});

function createCaptionState(overrides = {}) {
  return {
    copyText: "Fallback subtitle\n兜底字幕",
    displayMode: "bilingual",
    fontScale: 100,
    lines: [{ original: "Fallback subtitle", translation: "兜底字幕" }],
    status: "已读取 1 条字幕。",
    ...overrides,
  };
}

async function withOverlay(overlay, callback) {
  const previousDocument = globalThis.document;

  globalThis.document = {
    querySelector(selector) {
      assert.equal(selector, ".msj-tiktok-caption-root");
      return overlay ? { __msjTikTokCaptionOverlay: overlay } : null;
    },
  };

  try {
    return await callback();
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
}

describe("TikTok caption background bridge", () => {
  it("reads the existing overlay state through scripting injection", async () => {
    const state = createCaptionState();
    const executeScriptCalls = [];
    const scriptingApi = {
      async executeScript(options) {
        executeScriptCalls.push(options);
        assert.deepEqual(options.target, { tabId: 42 });
        assert.deepEqual(options.args, [{ type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE }]);
        return [{ result: { ok: true, state } }];
      },
    };

    const result = await handleTikTokCaptionBackgroundMessage({
      message: {
        command: { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE },
        tabId: 42,
        type: TIKTOK_CAPTION_BACKGROUND_MESSAGE_TYPE,
      },
      scriptingApi,
    });

    assert.deepEqual(result, { ok: true, state });
    assert.equal(executeScriptCalls.length, 1);
    assert.equal(executeScriptCalls[0].func, runTikTokCaptionOverlayCommand);
  });

  it("runs overlay commands and returns the updated state", async () => {
    const calls = [];
    const state = createCaptionState({ displayMode: "original", fontScale: 110 });
    const overlay = {
      adjustFontScale(delta) {
        calls.push(["font", delta]);
      },
      getCaptionBoardState() {
        calls.push(["state"]);
        return state;
      },
      refreshCaptions() {
        calls.push(["refresh"]);
      },
      refreshCaptionsIfSourceChanged(options) {
        calls.push(["refresh-if-source", options]);
      },
      setDisplayMode(displayMode) {
        calls.push(["mode", displayMode]);
      },
    };

    await withOverlay(overlay, async () => {
      assert.deepEqual(
        await runTikTokCaptionOverlayCommand({ type: CAPTION_BOARD_MESSAGE_TYPES.REFRESH }),
        { ok: true, state },
      );
      assert.deepEqual(
        await runTikTokCaptionOverlayCommand({
          force: true,
          type: CAPTION_BOARD_MESSAGE_TYPES.REFRESH_IF_SOURCE_CHANGED,
        }),
        { ok: true, state },
      );
      assert.deepEqual(
        await runTikTokCaptionOverlayCommand({
          displayMode: "original",
          type: CAPTION_BOARD_MESSAGE_TYPES.SET_DISPLAY_MODE,
        }),
        { ok: true, state },
      );
      assert.deepEqual(
        await runTikTokCaptionOverlayCommand({
          delta: 10,
          type: CAPTION_BOARD_MESSAGE_TYPES.ADJUST_FONT_SCALE,
        }),
        { ok: true, state },
      );
    });

    assert.deepEqual(calls, [
      ["refresh"],
      ["state"],
      ["refresh-if-source", { force: true }],
      ["state"],
      ["mode", "original"],
      ["state"],
      ["font", 10],
      ["state"],
    ]);
  });

  it("returns ok false when no existing overlay is available", async () => {
    await withOverlay(null, async () => {
      assert.deepEqual(
        await runTikTokCaptionOverlayCommand({ type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE }),
        {
          error: "TikTok caption overlay is unavailable",
          ok: false,
        },
      );
    });
  });

  it("rejects invalid background bridge messages", async () => {
    const scriptingApi = {
      async executeScript() {
        assert.fail("invalid messages should not inject scripts");
      },
    };

    assert.deepEqual(
      await handleTikTokCaptionBackgroundMessage({
        message: {
          command: { type: CAPTION_BOARD_MESSAGE_TYPES.GET_STATE },
          tabId: "42",
          type: TIKTOK_CAPTION_BACKGROUND_MESSAGE_TYPE,
        },
        scriptingApi,
      }),
      { error: "Invalid TikTok tab id", ok: false },
    );
    assert.deepEqual(
      await handleTikTokCaptionBackgroundMessage({
        message: {
          command: { type: "UNKNOWN" },
          tabId: 42,
          type: TIKTOK_CAPTION_BACKGROUND_MESSAGE_TYPE,
        },
        scriptingApi,
      }),
      { error: "Invalid TikTok caption command", ok: false },
    );
  });
});
