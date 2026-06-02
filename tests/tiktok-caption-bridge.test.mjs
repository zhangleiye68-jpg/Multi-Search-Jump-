import assert from "node:assert/strict";
import { describe, it } from "node:test";

async function loadBridge({ localStorageValues = {}, responseText = "{}" } = {}) {
  const messages = [];
  const originalWindow = globalThis.window;
  const originalRequest = globalThis.Request;
  const originalXmlHttpRequest = globalThis.XMLHttpRequest;

  function ResponseHarness(text) {
    return {
      clone() {
        return ResponseHarness(text);
      },
      async text() {
        return text;
      },
    };
  }

  globalThis.Request = class RequestHarness {
    constructor(url) {
      this.url = url;
    }
  };
  globalThis.window = {
    fetch: async () => ResponseHarness(responseText),
    localStorage: {
      getItem(key) {
        return localStorageValues[key] ?? null;
      },
    },
    postMessage(message) {
      messages.push(message);
    },
  };
  globalThis.XMLHttpRequest = class XMLHttpRequestHarness {};
  globalThis.XMLHttpRequest.prototype.open = function open() {};
  globalThis.XMLHttpRequest.prototype.send = function send() {};

  await import(`../extension/src/tiktokCaptionBridge.js?cache=${Date.now()}-${Math.random()}`);

  return {
    messages,
    restore() {
      globalThis.window = originalWindow;
      globalThis.Request = originalRequest;
      globalThis.XMLHttpRequest = originalXmlHttpRequest;
    },
    window: globalThis.window,
  };
}

describe("TikTok caption bridge", () => {
  it("forwards cached recommendation feed payloads on install", async () => {
    const bridge = await loadBridge({
      localStorageValues: {
        "fyp-feed-cache": JSON.stringify({
          itemList: [
            {
              id: "1234567890",
              video: {
                subtitleInfos: [
                  { Url: "https://example.test/cached-recommendation.vtt" },
                ],
              },
            },
          ],
        }),
      },
    });

    try {
      await Promise.resolve();
    } finally {
      bridge.restore();
    }

    assert.equal(bridge.messages.length, 1);
    assert.equal(bridge.messages[0].type, "msj-tiktok-api-response");
    assert.equal(bridge.messages[0].url, "localStorage:fyp-feed-cache");
    assert.equal(bridge.messages[0].payload.itemList[0].id, "1234567890");
  });

  it("forwards favorite and collection TikTok API payloads", async () => {
    const bridge = await loadBridge({
      responseText: JSON.stringify({
        itemList: [
          {
            id: "1234567890",
            video: {
              subtitleInfos: [
                { Url: "https://example.test/favorite.vtt" },
              ],
            },
          },
        ],
      }),
    });

    try {
      await bridge.window.fetch("https://www.tiktok.com/api/favorite/item_list?cursor=0");
      await bridge.window.fetch("https://www.tiktok.com/api/collection/item_list?cursor=0");
      await bridge.window.fetch("https://www.tiktok.com/api/user/collect/item_list/?cursor=0");
    } finally {
      bridge.restore();
    }

    assert.equal(bridge.messages.length, 3);
    assert.deepEqual(
      bridge.messages.map((message) => message.type),
      [
        "msj-tiktok-api-response",
        "msj-tiktok-api-response",
        "msj-tiktok-api-response",
      ],
    );
  });
});
