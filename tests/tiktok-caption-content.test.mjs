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
    children: [],
    closest() {
      return null;
    },
    getAttribute() {
      return null;
    },
  };
}

function createRect(left, top, width, height) {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
  };
}

function createVideoNode(rect) {
  return {
    ...createTextNode(""),
    tagName: "video",
    getBoundingClientRect() {
      return rect;
    },
  };
}

function createVideoLinkNode(href, rect) {
  return {
    ...createTextNode(""),
    href,
    tagName: "a",
    getAttribute(name) {
      return name === "href" ? href : null;
    },
    getBoundingClientRect() {
      return rect;
    },
  };
}

function createVisibleCaptionNode(textContent, rect) {
  return {
    ...createTextNode(textContent),
    tagName: "div",
    getAttribute(name) {
      return name === "data-e2e" ? "video-caption" : null;
    },
    getBoundingClientRect() {
      return rect;
    },
  };
}

function createTrackNode(src) {
  return {
    ...createTextNode(""),
    tagName: "track",
    getAttribute(name) {
      return name === "src" ? src : null;
    },
  };
}

function createFetchCaption(captionsByUrl) {
  return async (url) => {
    if (!Object.hasOwn(captionsByUrl, url)) {
      throw new Error(`Unexpected subtitle URL: ${url}`);
    }

    return {
      ok: true,
      async text() {
        return captionsByUrl[url];
      },
    };
  };
}

function createVtt(text) {
  return [
    "WEBVTT",
    "",
    "00:00:00.000 --> 00:00:01.000",
    text,
  ].join("\n");
}

function createTikTokRehydrationHtml(itemStruct) {
  return [
    "<!doctype html>",
    "<html>",
    "<body>",
    `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({
      __DEFAULT_SCOPE__: {
        "webapp.video-detail": {
          itemInfo: {
            itemStruct,
          },
        },
      },
    })}</script>`,
    "</body>",
    "</html>",
  ].join("");
}

function createExtensionTextNode(textContent) {
  return {
    ...createTextNode(textContent),
    closest(selector) {
      return selector === ".msj-tiktok-caption-root" ? {} : null;
    },
  };
}

function createRootHarness({
  links = [],
  nodes = [],
  scripts = [],
  videos = [],
  viewport = { innerHeight: 900, innerWidth: 1280 },
} = {}) {
  return {
    defaultView: viewport,
    querySelectorAll(selector) {
      if (selector === "script") {
        return scripts;
      }

      if (selector === "video") {
        return videos;
      }

      if (selector === "a[href*='/video/']") {
        return links.filter((link) => String(link.href ?? "").includes("/video/"));
      }

      if (selector === "a[href*='/@']") {
        return links.filter((link) => String(link.href ?? "").includes("/@"));
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
      if (this.tagName === "input" && this.type === "checkbox") {
        this.checked = !this.checked;
      }

      const result = handlers.get("click")?.();

      if (this.tagName === "input" && this.type === "checkbox") {
        return handlers.get("change")?.() ?? result;
      }

      return result;
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
  it("extracts track caption lines and removes duplicates", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      nodes: [
        createTrackNode("https://example.test/track.vtt"),
      ],
    });

    assert.deepEqual(await extractCaptionLines(root, {
      fetchCaption: createFetchCaption({
        "https://example.test/track.vtt": [
          "WEBVTT",
          "",
          "00:00:00.000 --> 00:00:01.000",
          "Hello world",
          "",
          "00:00:01.000 --> 00:00:02.000",
          "Hello world",
          "",
          "00:00:02.000 --> 00:00:03.000",
          "Second line",
        ].join("\n"),
      }),
    }), ["Hello world", "Second line"]);
  });

  it("does not treat ordinary DOM text as captions", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      nodes: [
        createTextNode("qianhe01"),
        createTextNode("Visible subtitle-looking text"),
      ],
    });

    assert.deepEqual(await extractCaptionLines(root), []);
  });

  it("extracts visible caption text from the active video area", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness({
      nodes: [
        createVisibleCaptionNode("qianhe01", createRect(850, 360, 120, 40)),
        createVisibleCaptionNode("and we had a good time together.", createRect(120, 720, 340, 42)),
      ],
      videos: [
        createVideoNode(createRect(0, 0, 640, 900)),
      ],
    });

    assert.deepEqual(await extractCaptionLines(root), ["and we had a good time together."]);
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

  it("reads current video subtitles from captured TikTok API data", async () => {
    const {
      extractCaptionLines,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const root = createRootHarness();

    ingestTikTokApiPayload({
      itemInfo: {
        itemStruct: {
          id: "1234567890",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [
              {
                languageCode: "eng-US",
                Url: "https://example.test/current-video.vtt",
              },
            ],
          },
        },
      },
    });

    const fetchCaption = async (url) => {
      assert.equal(url, "https://example.test/current-video.vtt");

      return {
        ok: true,
        async text() {
          return [
            "WEBVTT",
            "",
            "00:00:00.000 --> 00:00:01.000",
            "Current API subtitle.",
          ].join("\n");
        },
      };
    };

    assert.deepEqual(await extractCaptionLines(root, {
      currentVideoId: "1234567890",
      fetchCaption,
    }), ["Current API subtitle."]);
  });

  it("prefers original language WebVTT subtitles from captured TikTok API data", async () => {
    const {
      extractCaptionLines,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const root = createRootHarness();

    ingestTikTokApiPayload({
      itemInfo: {
        itemStruct: {
          id: "1234567890",
          textLanguage: "zh-Hans",
          video: {
            claInfo: {
              originalLanguageInfo: {
                language: "eng-US",
              },
            },
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "zh-Hans",
                Url: "https://example.test/chinese.vtt",
              },
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/english.vtt",
              },
            ],
          },
        },
      },
    });

    assert.deepEqual(await extractCaptionLines(root, {
      currentVideoId: "1234567890",
      fetchCaption: createFetchCaption({
        "https://example.test/english.vtt": createVtt("Original English subtitle."),
      }),
    }), ["Original English subtitle."]);
  });

  it("reads current video subtitles from TikTok rehydration detail data", async () => {
    const { extractCaptionLines } = await loadCaptionCore();
    const root = createRootHarness();

    const fetchCaption = async (url) => {
      if (url === "https://www.tiktok.com/@user/video/1234567890") {
        return {
          ok: true,
          async text() {
            return createTikTokRehydrationHtml({
              id: "1234567890",
              textLanguage: "zh-Hans",
              video: {
                claInfo: {
                  originalLanguageInfo: {
                    language: "eng-US",
                  },
                },
                subtitleInfos: [
                  {
                    Format: "webvtt",
                    LanguageCodeName: "eng-US",
                    Url: "https://example.test/detail-english.vtt",
                  },
                ],
              },
            });
          },
        };
      }

      if (url === "https://example.test/detail-english.vtt") {
        return {
          ok: true,
          async text() {
            return createVtt("Detail English subtitle.");
          },
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    assert.deepEqual(await extractCaptionLines(root, {
      currentPageUrl: "https://www.tiktok.com/@user/video/1234567890",
      currentVideoId: "1234567890",
      fetchCaption,
    }), ["Detail English subtitle."]);
  });

  it("does not use captured TikTok API subtitles from a different video", async () => {
    const {
      extractCaptionLines,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const root = createRootHarness();

    ingestTikTokApiPayload({
      itemInfo: {
        itemStruct: {
          id: "9999999999",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [
              {
                languageCode: "eng-US",
                Url: "https://example.test/wrong-video.vtt",
              },
            ],
          },
        },
      },
    });

    assert.deepEqual(await extractCaptionLines(root, {
      currentVideoId: "1234567890",
      fetchCaption: async () => {
        throw new Error("Should not fetch subtitles for another video");
      },
    }), []);
  });

  it("ignores subtitle info labels and ordinary DOM text", async () => {
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

    assert.deepEqual(await extractCaptionLines(root), []);
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
      fetchCaption: createFetchCaption({
        "https://example.test/fresh.vtt": createVtt("Fresh subtitle"),
      }),
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

    nodes = [createTrackNode("https://example.test/fresh.vtt")];
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
    let nodes = [createTrackNode("https://example.test/first.vtt")];
    let sourceKey = "video-1";

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      fetchCaption: createFetchCaption({
        "https://example.test/first.vtt": createVtt("First subtitle"),
        "https://example.test/second.vtt": createVtt("Second subtitle"),
      }),
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

    nodes = [createTrackNode("https://example.test/second.vtt")];
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
    let nodes = [createTrackNode("https://example.test/first.vtt")];
    let sourceKey = "video-1";

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      fetchCaption: createFetchCaption({
        "https://example.test/first.vtt": createVtt("First subtitle"),
      }),
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
    let nodes = [createTrackNode("https://example.test/first.vtt")];
    let sourceKey = "video-1";

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      fetchCaption: createFetchCaption({
        "https://example.test/first.vtt": createVtt("First subtitle"),
        "https://example.test/delayed.vtt": createVtt("Delayed subtitle"),
      }),
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

    nodes = [createTrackNode("https://example.test/delayed.vtt")];
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
      fetchCaption: createFetchCaption({
        "https://example.test/second-video.vtt": createVtt("Second video visible subtitle"),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First video script subtitle");

    nodes = [createTrackNode("https://example.test/second-video.vtt")];
    sourceKey = "video-2";
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Second video visible subtitle");
  });

  it("does not render a pending refresh result after the video changes", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const delayedTranslation = createDeferred();
    let nodes = [createTrackNode("https://example.test/pending-first.vtt")];
    let sourceKey = "video-1";

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      fetchCaption: createFetchCaption({
        "https://example.test/pending-first.vtt": createVtt("First pending subtitle"),
        "https://example.test/pending-second.vtt": createVtt("Second subtitle"),
      }),
      translateCaption: async (line) => {
        if (line === "First pending subtitle") {
          return delayedTranslation.promise;
        }

        return `${line} 中文`;
      },
      setInterval: null,
    });

    const firstRefresh = overlay.button.click();

    nodes = [createTrackNode("https://example.test/pending-second.vtt")];
    sourceKey = "video-2";
    delayedTranslation.resolve("第一条的中文");
    await firstRefresh;

    assert.equal(overlay.captionList.children.length, 0);

    await overlay.refreshCaptions();
    assert.equal(overlay.captionList.children[0].children[0].textContent, "Second subtitle");
  });

  it("prefers current DOM track captions over preloaded script captions in the overlay", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [createTrackNode("https://example.test/current-visible.vtt")],
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
      fetchCaption: createFetchCaption({
        "https://example.test/current-visible.vtt": createVtt("Current visible subtitle"),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Current visible subtitle");
  });

  it("prefers complete script captions over a single visible caption in the overlay", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [
            createVisibleCaptionNode("Only the current cue", createRect(100, 780, 360, 42)),
          ],
          scripts: [
            {
              textContent: JSON.stringify({
                item: {
                  subtitles: [
                    { text: "First full subtitle" },
                    { text: "Second full subtitle" },
                  ],
                },
              }),
            },
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 2);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First full subtitle");
    assert.equal(overlay.captionList.children[1].children[0].textContent, "Second full subtitle");
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

  it("renders subtitles from captured TikTok API data for the current video", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemInfo: {
        itemStruct: {
          id: "1234567890",
          textLanguage: "eng-US",
          video: {
            claInfo: {
              captionInfos: [
                {
                  languageCode: "eng-US",
                  url: "https://example.test/current-overlay.vtt",
                },
              ],
            },
          },
        },
      },
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness(),
      getSourceKey: () => "https://www.tiktok.com/@user/video/1234567890|blob:https://www.tiktok.com/current",
      fetchCaption: async (url) => {
        assert.equal(url, "https://example.test/current-overlay.vtt");

        return {
          ok: true,
          async text() {
            return [
              "WEBVTT",
              "",
              "00:00:00.000 --> 00:00:01.000",
              "Overlay API subtitle.",
            ].join("\n");
          },
        };
      },
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Overlay API subtitle.");
  });

  it("renders subtitles in the recommendation feed by reading the active video link", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "1234567890",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/recommendation.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links: [
            createVideoLinkNode(
              "https://www.tiktok.com/@creator/video/1234567890",
              createRect(0, 0, 640, 900),
            ),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/recommendation.vtt": createVtt("Recommendation feed subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Recommendation feed subtitle.");
    assert.equal(overlay.captionList.children[0].children[1].textContent, "Recommendation feed subtitle. 中文");
  });

  it("automatically refreshes recommendation feed subtitles when the active video link changes", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    let activeVideoId = "1234567890";

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "1234567890",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/recommendation-first.vtt",
              },
            ],
          },
        },
        {
          id: "2234567890",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/recommendation-second.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links: [
            createVideoLinkNode(
              `https://www.tiktok.com/@creator/video/${activeVideoId}`,
              createRect(0, 0, 640, 900),
            ),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/recommendation-first.vtt": createVtt("First recommendation subtitle."),
        "https://example.test/recommendation-second.vtt": createVtt("Second recommendation subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First recommendation subtitle.");

    activeVideoId = "2234567890";
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Second recommendation subtitle.");
    assert.equal(overlay.captionList.children[0].children[1].textContent, "Second recommendation subtitle. 中文");
  });

  it("keeps retrying recommendation subtitles when API data arrives after opening", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links: [
            createVideoLinkNode(
              "https://www.tiktok.com/@creator/video/7234567890",
              createRect(0, 0, 640, 900),
            ),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/delayed-recommendation.vtt": createVtt("Delayed recommendation subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "7234567890",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/delayed-recommendation.vtt",
              },
            ],
          },
        },
      ],
    });
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Delayed recommendation subtitle.");
  });

  it("renders recommendation subtitles when the current video link is next to the video", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "3234567890",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/recommendation-side-link.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links: [
            createVideoLinkNode(
              "https://www.tiktok.com/@creator/video/3234567890",
              createRect(680, 120, 260, 80),
            ),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/recommendation-side-link.vtt": createVtt("Side link recommendation subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Side link recommendation subtitle.");
  });

  it("uses the active recommendation video link when probing the detail page", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    document.location = { href: "https://www.tiktok.com/foryou" };

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links: [
            createVideoLinkNode(
              "https://www.tiktok.com/@creator/video/8234567890",
              createRect(680, 120, 260, 80),
            ),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://www.tiktok.com/@creator/video/8234567890": createTikTokRehydrationHtml({
          id: "8234567890",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/detail-recommendation.vtt",
              },
            ],
          },
        }),
        "https://example.test/detail-recommendation.vtt": createVtt("Detail recommendation subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Detail recommendation subtitle.");
  });

  it("uses visible recommendation captions as a hint to find the full cached WebVTT subtitles", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "4234567890",
          textLanguage: "zh-Hans",
          video: {
            claInfo: {
              originalLanguageInfo: {
                language: "eng-US",
              },
            },
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/recommendation-original.vtt",
              },
              {
                Format: "webvtt",
                LanguageCodeName: "zh-Hans",
                Url: "https://example.test/recommendation-translated.vtt",
              },
            ],
          },
        },
        {
          id: "5234567890",
          textLanguage: "zh-Hans",
          video: {
            claInfo: {
              originalLanguageInfo: {
                language: "eng-US",
              },
            },
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/other-original.vtt",
              },
              {
                Format: "webvtt",
                LanguageCodeName: "zh-Hans",
                Url: "https://example.test/other-translated.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [
            createVisibleCaptionNode("他们想要不叫的双运球", createRect(100, 780, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/recommendation-original.vtt": [
          "WEBVTT",
          "",
          "00:00:00.000 --> 00:00:01.000",
          "They wanted the double dribble.",
          "",
          "00:00:01.000 --> 00:00:02.000",
          "The block wins the game.",
        ].join("\n"),
        "https://example.test/recommendation-translated.vtt": [
          "WEBVTT",
          "",
          "00:00:00.000 --> 00:00:01.000",
          "他们想要不叫的双运球",
        ].join("\n"),
        "https://example.test/other-original.vtt": createVtt("Other original subtitle."),
        "https://example.test/other-translated.vtt": createVtt("其他中文字幕"),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 2);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "They wanted the double dribble.");
    assert.equal(overlay.captionList.children[1].children[0].textContent, "The block wins the game.");
  });

  it("uses the active recommendation author to find cached subtitles when the video link is unavailable", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "6234567892",
          author: {
            uniqueId: "othercreator",
          },
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/other-author.vtt",
              },
            ],
          },
        },
        {
          id: "6234567893",
          author: {
            uniqueId: "joshpeck",
          },
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/active-author.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links: [
            createVideoLinkNode("https://www.tiktok.com/@joshpeck", createRect(120, 760, 180, 36)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/other-author.vtt": createVtt("Wrong author subtitle."),
        "https://example.test/active-author.vtt": createVtt("Active author complete subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 1);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "Active author complete subtitle.");
  });

  it("uses the visible recommendation author instead of an offscreen rendered video", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "7234567892",
          author: {
            uniqueId: "offscreencreator",
          },
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/offscreen-author.vtt",
              },
            ],
          },
        },
        {
          id: "7234567893",
          author: {
            uniqueId: "visiblecreator",
          },
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/visible-author.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links: [
            createVideoLinkNode("https://www.tiktok.com/@offscreencreator", createRect(120, -820, 180, 36)),
            createVideoLinkNode("https://www.tiktok.com/@visiblecreator", createRect(120, 760, 180, 36)),
          ],
          videos: [
            createVideoNode(createRect(0, -900, 640, 900)),
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/offscreen-author.vtt": createVtt("Offscreen subtitle."),
        "https://example.test/visible-author.vtt": createVtt("Visible subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 1);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "Visible subtitle.");
  });

  it("does not use subtitles from a preloaded video when the current visible card has no video", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "8234567892",
          author: {
            uniqueId: "dancekae",
          },
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/preloaded-next-video.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links: [
            createVideoLinkNode("https://www.tiktok.com/@cloutify_ai", createRect(500, 650, 180, 36)),
            createVideoLinkNode("https://www.tiktok.com/@dancekae", createRect(500, 950, 180, 36)),
          ],
          videos: [
            createVideoNode(createRect(440, 900, 360, 700)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/preloaded-next-video.vtt": createVtt("Next preloaded subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 0);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);
  });

  it("does not use same-author cached subtitles when visible cues do not match", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "9234567892",
          author: {
            uniqueId: "primevideo",
          },
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/same-author-wrong-video.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links: [
            createVideoLinkNode("https://www.tiktok.com/@primevideo", createRect(120, 760, 180, 36)),
          ],
          nodes: [
            createVisibleCaptionNode("I didn't see a badge.", createRect(100, 720, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/same-author-wrong-video.vtt": createVtt("bro shawarma ramen am I living in the matrix"),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 0);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);
  });

  it("does not render a visible recommendation caption when no full subtitle source is available", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [
            createVisibleCaptionNode("Only the visible cue", createRect(100, 780, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 0);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);
  });

  it("does not accumulate visible recommendation captions when the video link is unavailable", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    let visibleCaption = "First visible cue";
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [
            createVisibleCaptionNode(visibleCaption, createRect(100, 780, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children.length, 0);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);

    visibleCaption = "Second visible cue";
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children.length, 0);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);
  });

  it("keeps complete captions while visible cues change during playback", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    let visibleCaption = "The matching visible cue.";

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "6234567890",
          textLanguage: "zh-Hans",
          video: {
            claInfo: {
              originalLanguageInfo: {
                language: "eng-US",
              },
            },
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/stable-original.vtt",
              },
              {
                Format: "webvtt",
                LanguageCodeName: "zh-Hans",
                Url: "https://example.test/stable-translated.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [
            createVisibleCaptionNode(visibleCaption, createRect(100, 780, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/stable-original.vtt": [
          "WEBVTT",
          "",
          "00:00:00.000 --> 00:00:01.000",
          "The first complete line.",
          "",
          "00:00:01.000 --> 00:00:02.000",
          "The second complete line.",
        ].join("\n"),
        "https://example.test/stable-translated.vtt": [
          "WEBVTT",
          "",
          "00:00:00.000 --> 00:00:01.000",
          "The matching visible cue.",
        ].join("\n"),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children.length, 2);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "The first complete line.");

    visibleCaption = "A later cue that is not in the cached subtitle file.";
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children.length, 2);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "The first complete line.");
    assert.equal(overlay.status.textContent, "已读取 2 条字幕。");
  });

  it("retries hint matching when a visible cue appears after an empty read", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    let visibleCaption = "Unmatched visible cue.";

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "7234567891",
          textLanguage: "zh-Hans",
          video: {
            claInfo: {
              originalLanguageInfo: {
                language: "eng-US",
              },
            },
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/later-original.vtt",
              },
              {
                Format: "webvtt",
                LanguageCodeName: "zh-Hans",
                Url: "https://example.test/later-translated.vtt",
              },
            ],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [
            createVisibleCaptionNode(visibleCaption, createRect(100, 780, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/later-original.vtt": createVtt("Complete subtitle after hint."),
        "https://example.test/later-translated.vtt": createVtt("稍后出现的可见字幕"),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children.length, 0);

    visibleCaption = "稍后出现的可见字幕";
    await intervalHandlers[0]();

    assert.equal(overlay.captionList.children.length, 1);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "Complete subtitle after hint.");
  });

  it("clears previous complete captions when the stable source changes", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    let nodes = [createTrackNode("https://example.test/first.vtt")];
    let sourceKey = "https://www.tiktok.com/foryou|first-video";
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes,
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      getSourceKey: () => sourceKey,
      fetchCaption: createFetchCaption({
        "https://example.test/first.vtt": createVtt("First complete subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    await overlay.button.click();
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First complete subtitle.");

    nodes = [
      createVisibleCaptionNode("Only the next visible cue", createRect(100, 780, 360, 42)),
    ];
    sourceKey = "https://www.tiktok.com/foryou|second-video";
    await intervalHandlers[0]();

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

  it("toggles Chinese translations from the caption board", async () => {
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

    assert.equal(overlay.bilingualToggle.checked, true);
    assert.equal(overlay.captionList.children[0].children[1].textContent, "Fresh subtitle 的中文翻译");

    await overlay.bilingualToggle.click();

    assert.equal(overlay.bilingualToggle.checked, false);
    assert.equal(overlay.captionList.children[0].textContent, "Fresh subtitle");
    assert.equal(overlay.captionList.children[0].children.length, 0);

    await overlay.copyButton.click();
    assert.equal(overlay.navigator.clipboard.value, "Fresh subtitle");
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
