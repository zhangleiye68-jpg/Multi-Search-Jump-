import assert from "node:assert/strict";
import { describe, it } from "node:test";

async function loadCaptionCore() {
  delete globalThis.MultiSearchJumpTikTokCaptions;
  await import(`../extension/src/tiktokCaptionCore.js?cache=${Date.now()}-${Math.random()}`);
  return globalThis.MultiSearchJumpTikTokCaptions;
}

function createTextNode(textContent) {
  return {
    hidden: false,
    textContent,
    closest() {
      return null;
    },
    getAttribute() {
      return null;
    },
  };
}

function createExtensionTextNode(textContent) {
  return {
    ...createTextNode(textContent),
    closest(selector) {
      return selector === ".msj-tiktok-caption-root" ? {} : null;
    },
  };
}

function createRootHarness({ nodes = [], scripts = [] } = {}) {
  return {
    querySelectorAll(selector) {
      if (selector === "script") {
        return scripts;
      }

      return nodes;
    },
  };
}

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

function createElementHarness(tagName) {
  const handlers = new Map();

  return {
    attributes: {},
    children: [],
    classList: createClassList(),
    dataset: {},
    hidden: false,
    tagName,
    textContent: "",
    append(...children) {
      this.children.push(...children);
    },
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
    click() {
      return handlers.get("click")?.();
    },
    querySelector(selector) {
      return this.children.find((child) => child.matches?.(selector)) ?? null;
    },
    remove() {
      this.removed = true;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    matches(selector) {
      return selector.startsWith(".") && this.classList.contains(selector.slice(1));
    },
  };
}

function createDocumentHarness() {
  const elements = [];
  const body = createElementHarness("body");

  return {
    body,
    createElement(tagName) {
      const element = createElementHarness(tagName);
      elements.push(element);
      return element;
    },
    get elements() {
      return elements;
    },
    querySelector(selector) {
      return body.children.find((child) => child.matches?.(selector)) ?? null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function createDeferred() {
  let resolve;

  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("TikTok caption content", () => {
  it("extracts visible caption lines and removes duplicates", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      nodes: [
        createTextNode("Hello world"),
        createTextNode("Hello world"),
        createTextNode("Second line\nThird line"),
        createTextNode("   "),
      ],
    });

    assert.deepEqual(await extractCaptionLines(root), ["Hello world", "Second line", "Third line"]);
  });

  it("extracts caption text from page script data", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      scripts: [
        {
          textContent: JSON.stringify({
            item: {
              subtitles: [
                { text: "First subtitle" },
                { text: "Second subtitle" },
              ],
            },
          }),
        },
      ],
    });

    assert.deepEqual(await extractCaptionLines(root), ["First subtitle", "Second subtitle"]);
  });

  it("ignores unrelated script text fields", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      scripts: [
        {
          textContent: JSON.stringify({
            item: {
              description: {
                text: "Video description",
              },
              title: {
                text: "Video title",
              },
            },
          }),
        },
      ],
    });

    assert.deepEqual(await extractCaptionLines(root), []);
  });

  it("ignores extension UI text and non-subtitle caption fields", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      nodes: [
        createExtensionTextNode("TikTok 字幕"),
        createExtensionTextNode("刷新字幕"),
        createTextNode("Visible subtitle"),
      ],
      scripts: [
        {
          textContent: JSON.stringify({
            item: {
              caption: "Video description should not appear",
              subtitles: [{ text: "Script subtitle" }],
            },
          }),
        },
      ],
    });

    assert.deepEqual(await extractCaptionLines(root), ["Script subtitle"]);
  });

  it("ignores cookie and settings text even when keys contain subtitle", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      scripts: [
        {
          textContent: JSON.stringify({
            language: {
              cookie_setting_page_aam_subtitle: "cookie_setting_page_aam_subtitle",
              cookies_essential_desc: "cookies_essential_desc",
              account_security_subtitle: "此设备当前登录 TikTok 所用的密钥将替换为新密钥。",
            },
          }),
        },
      ],
    });

    assert.deepEqual(await extractCaptionLines(root), []);
  });

  it("reads subtitle files referenced by subtitle info", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      scripts: [
        {
          textContent: JSON.stringify({
            item: {
              subtitleInfos: [{ Url: "https://example.test/caption.vtt" }],
            },
          }),
        },
      ],
    });
    const fetchCaption = async (url) => {
      assert.equal(url, "https://example.test/caption.vtt");
      return {
        ok: true,
        async text() {
          return [
            "WEBVTT",
            "",
            "00:00:00.000 --> 00:00:01.000",
            "President Xi.",
            "",
            "2",
            "00:00:01,000 --> 00:00:02,000",
            "<c.white>President Xi.</c>",
            "",
            "00:00:02.000 --> 00:00:03.000",
            "We came back from China.",
          ].join("\n");
        },
      };
    };

    assert.deepEqual(await extractCaptionLines(root, { fetchCaption }), [
      "President Xi.",
      "We came back from China.",
    ]);
  });

  it("ignores subtitle info labels and falls back to visible subtitle text", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      nodes: [
        createTextNode("China and the U S A 🇺🇸 Thank you."),
      ],
      scripts: [
        {
          textContent: JSON.stringify({
            item: {
              subtitleInfos: [{ text: "qianhe01" }],
            },
          }),
        },
      ],
    });

    assert.deepEqual(await extractCaptionLines(root), ["China and the U S A 🇺🇸 Thank you."]);
  });

  it("ignores subtitle info labels when no readable subtitle text exists", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      scripts: [
        {
          textContent: JSON.stringify({
            item: {
              subtitleInfo: { subtitleText: "qianhe01" },
            },
          }),
        },
      ],
    });

    assert.deepEqual(await extractCaptionLines(root), []);
  });

  it("returns an empty list when no readable captions are present", async () => {
    const { extractCaptionLines } = await loadCaptionCore();

    assert.deepEqual(await extractCaptionLines(createRootHarness()), []);
  });

  it("creates a floating button and refreshable caption board", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    let nodes = [];

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      navigator: {
        clipboard: {
          async writeText(value) {
            this.value = value;
          },
        },
      },
      translateCaption: async () => "新鲜字幕",
      setInterval: null,
    });

    assert.equal(document.body.children.length, 1);
    assert.equal(document.body.children[0].classList.contains("msj-tiktok-caption-root"), true);

    await overlay.button.click();
    assert.equal(overlay.panel.hidden, false);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);

    nodes = [createTextNode("Fresh subtitle")];
    await overlay.refreshButton.click();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Fresh subtitle");
    assert.match(overlay.status.textContent, /已读取 1 条字幕/);

    await overlay.copyButton.click();
    assert.equal(overlay.navigator.clipboard.value, "Fresh subtitle\n新鲜字幕");
  });

  it("automatically refreshes captions when the current video changes", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    let nodes = [createTextNode("First subtitle")];
    let sourceKey = "video-1";

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      navigator: {
        clipboard: {
          async writeText(value) {
            this.value = value;
          },
        },
      },
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First subtitle");

    nodes = [createTextNode("Second subtitle")];
    sourceKey = "video-2";
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Second subtitle");
    assert.equal(overlay.captionList.children[0].children[1].textContent, "Second subtitle 中文");
    assert.match(overlay.status.textContent, /已读取 1 条字幕/);
  });

  it("clears stale captions when the next video has no readable captions", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    let nodes = [createTextNode("First subtitle")];
    let sourceKey = "video-1";

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children.length, 1);

    nodes = [];
    sourceKey = "video-2";
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children.length, 0);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);
  });

  it("keeps retrying briefly when captions load after the video changes", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    let nodes = [createTextNode("First subtitle")];
    let sourceKey = "video-1";

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First subtitle");

    nodes = [];
    sourceKey = "video-2";
    await intervalHandlers[0]();
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);

    nodes = [createTextNode("Delayed subtitle")];
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Delayed subtitle");
    assert.equal(overlay.captionList.children[0].children[1].textContent, "Delayed subtitle 中文");
  });

  it("does not reuse stale script captions after switching videos", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    const scripts = [
      {
        textContent: JSON.stringify({
          item: {
            subtitles: [{ text: "First video script subtitle" }],
          },
        }),
      },
    ];
    let nodes = [];
    let sourceKey = "video-1";

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes, scripts }),
      getSourceKey: () => sourceKey,
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First video script subtitle");

    nodes = [createTextNode("Second video visible subtitle")];
    sourceKey = "video-2";
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Second video visible subtitle");
  });

  it("does not render a pending refresh result after the video changes", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const delayedTranslation = createDeferred();
    let nodes = [createTextNode("First pending subtitle")];
    let sourceKey = "video-1";

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      translateCaption: async (line) => {
        if (line === "First pending subtitle") {
          return delayedTranslation.promise;
        }

        return `${line} 中文`;
      },
      setInterval: null,
    });

    const firstRefresh = overlay.button.click();

    nodes = [createTextNode("Second subtitle")];
    sourceKey = "video-2";
    delayedTranslation.resolve("第一条的中文");
    await firstRefresh;

    assert.equal(overlay.captionList.children.length, 0);

    await overlay.refreshCaptions();
    assert.equal(overlay.captionList.children[0].children[0].textContent, "Second subtitle");
  });

  it("prefers current visible captions over preloaded script captions in the overlay", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [createTextNode("Current visible subtitle")],
          scripts: [
            {
              textContent: JSON.stringify({
                item: {
                  subtitles: [{ text: "Preloaded unrelated subtitle" }],
                },
              }),
            },
          ],
        }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Current visible subtitle");
  });

  it("does not use script captions when a concrete video source is active", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          scripts: [
            {
              textContent: JSON.stringify({
                item: {
                  subtitles: [{ text: "Preloaded unrelated subtitle" }],
                },
              }),
            },
          ],
        }),
      getSourceKey: () => "https://www.tiktok.com/@user/video/1|blob:https://www.tiktok.com/current",
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 0);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);
  });

  it("renders each subtitle followed by its Chinese translation", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          scripts: [
            {
              textContent: JSON.stringify({
                item: {
                  subtitles: [{ text: "Fresh subtitle" }],
                },
              }),
            },
          ],
        }),
      navigator: {
        clipboard: {
          async writeText(value) {
            this.value = value;
          },
        },
      },
      translateCaption: async (line) => `${line} 的中文翻译`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Fresh subtitle");
    assert.equal(overlay.captionList.children[0].children[1].textContent, "Fresh subtitle 的中文翻译");

    await overlay.copyButton.click();
    assert.equal(overlay.navigator.clipboard.value, "Fresh subtitle\nFresh subtitle 的中文翻译");
  });

  it("does not render or copy subtitles whose translation fails", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          scripts: [
            {
              textContent: JSON.stringify({
                item: {
                  subtitles: [{ text: "Fresh subtitle" }],
                },
              }),
            },
          ],
        }),
      navigator: {
        clipboard: {
          async writeText(value) {
            this.value = value;
          },
        },
      },
      translateCaption: async () => "",
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 0);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);

    await overlay.copyButton.click();
    assert.equal(overlay.navigator.clipboard.value, undefined);
    assert.match(overlay.status.textContent, /没有可复制的字幕/);
  });
});
