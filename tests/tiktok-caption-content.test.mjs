import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

async function loadCaptionCore() {
  delete globalThis.MultiSearchJumpTikTokCaptions;
  await import(`../extension/src/tiktokCaptionCore.js?cache=${Date.now()}-${Math.random()}`);
  return globalThis.MultiSearchJumpTikTokCaptions;
}

function createTextNode(textContent) {
  return {
    hidden: false,
    scrollTop: 0,
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

function createVideoNode(rect, options = {}) {
  return {
    ...createTextNode(""),
    ended: options.ended ?? false,
    paused: options.paused,
    readyState: options.readyState,
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

function createVideoDescriptionNode(textContent, rect) {
  return {
    ...createTextNode(textContent),
    tagName: "div",
    getAttribute(name) {
      return name === "data-e2e" ? "video-desc" : null;
    },
    getBoundingClientRect() {
      return rect;
    },
  };
}

function createVideoAuthorTextNode(textContent, rect) {
  return {
    ...createTextNode(textContent),
    tagName: "div",
    getAttribute(name) {
      return name === "data-e2e" ? "video-author-uniqueid" : null;
    },
    getBoundingClientRect() {
      return rect;
    },
  };
}

function createVisibleMetricNode(textContent, rect, attributes = {}) {
  return {
    ...createTextNode(textContent),
    tagName: "div",
    getAttribute(name) {
      return attributes[name] ?? null;
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

      if (selector.includes("video-desc") || selector.includes("VideoDesc")) {
        return nodes.filter((node) => {
          const marker = [
            node.getAttribute?.("data-e2e"),
            node.getAttribute?.("class"),
            node.className,
          ]
            .filter(Boolean)
            .join(" ");

          return /video-desc|VideoDesc/u.test(marker);
        });
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
  const capturedPointers = new Set();
  let ownTextContent = "";

  return {
    attributes: {},
    children: [],
    classList: createClassList(),
    dataset: {},
    hidden: false,
    style: {},
    tagName,
    get textContent() {
      if (this.children.length > 0) {
        return `${ownTextContent}${this.children.map((child) => child.textContent ?? "").join("")}`;
      }

      return ownTextContent;
    },
    set textContent(value) {
      ownTextContent = String(value ?? "");
    },
    append(...children) {
      for (const child of children) {
        child.parentNode = this;
        this.children.push(child);
      }
    },
    insertBefore(child, beforeChild) {
      if (child.parentNode?.children) {
        const oldIndex = child.parentNode.children.indexOf(child);

        if (oldIndex >= 0) {
          child.parentNode.children.splice(oldIndex, 1);
        }
      }

      child.parentNode = this;

      const index = this.children.indexOf(beforeChild);

      if (index >= 0) {
        this.children.splice(index, 0, child);
      } else {
        this.children.push(child);
      }
    },
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
    dispatch(type, event = {}) {
      return handlers.get(type)?.({
        button: 0,
        clientX: 0,
        clientY: 0,
        pointerId: 1,
        preventDefault() {},
        target: this,
        ...event,
      });
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
    getBoundingClientRect() {
      return createRect(
        Number.parseFloat(this.style.left) || 0,
        Number.parseFloat(this.style.top) || 0,
        Number.parseFloat(this.style.width) || 320,
        Number.parseFloat(this.style.height) || 240,
      );
    },
    hasPointerCapture(pointerId) {
      return capturedPointers.has(pointerId);
    },
    releasePointerCapture(pointerId) {
      capturedPointers.delete(pointerId);
    },
    remove() {
      this.removed = true;
    },
    setPointerCapture(pointerId) {
      capturedPointers.add(pointerId);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    matches(selector) {
      return selector.startsWith(".") && this.classList.contains(selector.slice(1));
    },
  };
}

function useHtmlCollectionLikeChildren(element) {
  const orderedChildren = [...element.children];
  const collection = {
    get length() {
      return orderedChildren.length;
    },
    item(index) {
      return orderedChildren[index] ?? null;
    },
    [Symbol.iterator]() {
      return orderedChildren[Symbol.iterator]();
    },
  };
  const syncIndexes = () => {
    for (const key of Object.keys(collection)) {
      if (/^\d+$/u.test(key)) {
        delete collection[key];
      }
    }

    orderedChildren.forEach((child, index) => {
      collection[index] = child;
    });
  };

  syncIndexes();
  Object.defineProperty(element, "children", {
    configurable: true,
    get() {
      return collection;
    },
  });
  element.insertBefore = (child, beforeChild) => {
    const oldIndex = orderedChildren.indexOf(child);

    if (oldIndex >= 0) {
      orderedChildren.splice(oldIndex, 1);
    }

    child.parentNode = element;

    const nextIndex = orderedChildren.indexOf(beforeChild);

    if (nextIndex >= 0) {
      orderedChildren.splice(nextIndex, 0, child);
    } else {
      orderedChildren.push(child);
    }

    syncIndexes();
  };

  return collection;
}

function createDocumentHarness() {
  const elements = [];
  const body = createElementHarness("body");

  return {
    body,
    defaultView: {
      innerHeight: 900,
      innerWidth: 1280,
    },
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

function createMetricsTabNode(surface) {
  return {
    hidden: false,
    textContent: surface === "collection" ? "Favorites" : "Liked",
    getAttribute(name) {
      const values = {
        "aria-selected": "true",
        "data-e2e": surface === "collection" ? "favorites-tab" : "liked-tab",
        id: surface === "collection" ? "favorite-tab" : "liked-tab",
      };

      return values[name] ?? null;
    },
  };
}

function createCardLinkHarness(href) {
  const link = createElementHarness("a");

  link.href = href;
  link.getAttribute = (name) => (name === "href" ? href : link.attributes[name] ?? null);

  return link;
}

function createMetricProfileCardHarness(href) {
  const card = createElementHarness("div");
  const link = createCardLinkHarness(href);

  card.attributes.class = "DivItemContainerV2";
  link.closest = (selector) => selector.includes("DivItemContainerV2") ? card : null;
  card.append(link);

  return { card, link };
}

function findElementByText(document, tagName, text) {
  return document.elements.find((element) =>
    element.tagName === tagName && element.textContent.includes(text),
  );
}

function findControlByKey(document, key) {
  return document.elements.find((element) => element.dataset?.filterKey === key);
}

function createMetricCardContainerHarness(href, dataE2e) {
  const card = createElementHarness("div");
  const link = createCardLinkHarness(href);

  card.children.push(link);
  card.getAttribute = (name) => {
    if (name === "data-e2e") {
      return dataE2e;
    }

    return card.attributes[name] ?? null;
  };
  card.querySelector = (selector) => {
    if (
      selector.includes("a[href*='com/@']") ||
      selector.includes("a[href*=\"com/@\"]") ||
      selector.includes("a[href*='/video/']") ||
      selector.includes("a[href*=\"/video/\"]") ||
      selector.includes("a[href*='/photo/']") ||
      selector.includes("a[href*=\"/photo/\"]")
    ) {
      return link;
    }

    return card.children.find((child) => child.matches?.(selector)) ?? null;
  };

  return { card, link };
}

function createMetricsDocumentHarness({ cards = [], surface = "liked" } = {}) {
  const document = createDocumentHarness();
  const links = cards.map((href) => createCardLinkHarness(href));

  document.location = {
    href: surface === "none"
      ? "https://www.tiktok.com/foryou"
      : `https://www.tiktok.com/@demo?tab=${surface}`,
  };
  document.querySelectorAll = (selector) => {
    if (
      selector.includes("a[href*='/video/']") ||
      selector.includes("a[href*='/photo/']") ||
      selector.includes("a[href*='com/@']")
    ) {
      return links;
    }

    if (selector.includes("aria-selected") || selector.includes("data-e2e") || selector.includes("liked")) {
      return surface === "none" ? [] : [createMetricsTabNode(surface)];
    }

    return [];
  };

  return { document, links };
}

function createMetricsSurfaceDocumentHarness({ cards = [], surface }) {
  const document = createDocumentHarness();
  const dataE2eBySurface = {
    music: "music-item",
    search: "search_video-item",
    tag: "challenge-item",
  };
  const locationPathBySurface = {
    music: "/music/demo-song-123",
    search: "/search/video?q=demo",
    tag: "/tag/demo",
  };
  const cardEntries = cards.map((href) =>
    createMetricCardContainerHarness(href, dataE2eBySurface[surface]),
  );

  document.location = {
    href: `https://www.tiktok.com${locationPathBySurface[surface]}`,
  };
  document.querySelectorAll = (selector) => {
    if (
      (surface === "search" && selector.includes("search_video-item")) ||
      (surface === "tag" && selector.includes("challenge-item")) ||
      (surface === "music" && selector.includes("music-item"))
    ) {
      return cardEntries.map((entry) => entry.card);
    }

    if (
      selector.includes("a[href*='/video/']") ||
      selector.includes("a[href*='/photo/']") ||
      selector.includes("a[href*='com/@']")
    ) {
      return cardEntries.map((entry) => entry.link);
    }

    return [];
  };

  return {
    cards: cardEntries.map((entry) => entry.card),
    document,
    links: cardEntries.map((entry) => entry.link),
  };
}

function createStorageArea(initialValues = {}) {
  return {
    values: { ...initialValues },
    async get(keys) {
      if (typeof keys === "string") {
        return { [keys]: this.values[keys] };
      }

      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, this.values[key]]));
      }

      return { ...this.values };
    },
    async set(nextValues) {
      Object.assign(this.values, nextValues);
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

  it("keeps the CC button pinned to the browser right edge while dragging vertically", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const storageArea = createStorageArea();
    const overlay = createCaptionOverlay({
      document,
      setInterval: null,
      storageArea,
    });

    await overlay.ready;

    assert.equal(overlay.root.style.right, "8px");
    assert.equal(overlay.root.style.left, "auto");
    const css = await readFile("extension/src/tiktokCaptionOverlay.css", "utf8");
    assert.match(css, /\.msj-tiktok-caption-button\s*{[\s\S]*width:\s*30px;[\s\S]*height:\s*30px;/);

    overlay.button.dispatch("pointerdown", { clientX: 100, clientY: 100 });
    await overlay.button.dispatch("pointermove", { clientX: 260, clientY: 160 });
    await overlay.button.dispatch("pointerup", { clientX: 260, clientY: 160 });

    assert.equal(overlay.root.style.right, "8px");
    assert.equal(overlay.root.style.left, "auto");
    assert.equal(overlay.root.style.top, "438px");
    assert.equal(storageArea.values.tiktokCaptionButtonPosition.x, 1242);
    assert.equal(storageArea.values.tiktokCaptionButtonPosition.y, 438);
  });

  it("does not auto-open captions when the setting is missing", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [createTrackNode("https://example.test/default-closed.vtt")],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/default-closed.vtt": createVtt("Default closed subtitle."),
      }),
      setInterval: null,
      storageArea: createStorageArea(),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;

    assert.equal(overlay.panel.hidden, true);
    assert.equal(overlay.captionList.children.length, 0);
  });

  it("force-refreshes captions while the floating board is hidden", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    let activeVideoId = "1111111111";

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "1111111111",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [{ Url: "https://example.test/first-hidden.vtt" }],
          },
        },
        {
          id: "2222222222",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [{ Url: "https://example.test/second-hidden.vtt" }],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      fetchCaption: createFetchCaption({
        "https://example.test/first-hidden.vtt": createVtt("First hidden subtitle."),
        "https://example.test/second-hidden.vtt": createVtt("Second hidden subtitle."),
      }),
      getRoot: () => createRootHarness(),
      getSourceKey: () => `https://www.tiktok.com/@demo/video/${activeVideoId}`,
      setInterval: null,
      storageArea: createStorageArea(),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    activeVideoId = "2222222222";
    await overlay.refreshCaptionsIfSourceChanged({ force: true });

    assert.equal(overlay.panel.hidden, true);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "Second hidden subtitle.");
    assert.match(overlay.status.textContent, /已读取 1 条字幕/);
  });

  it("auto-opens when enabled and a complete WebVTT source is readable", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [createTrackNode("https://example.test/auto-open.vtt")],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/auto-open.vtt": createVtt("Auto opened subtitle."),
      }),
      setInterval: null,
      storageArea: createStorageArea({
        tiktokCaptionAutoOpenEnabled: true,
      }),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;

    assert.equal(overlay.panel.hidden, false);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "Auto opened subtitle.");
  });

  it("does not auto-open from visible DOM captions alone", async () => {
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
      setInterval: null,
      storageArea: createStorageArea({
        tiktokCaptionAutoOpenEnabled: true,
      }),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;

    assert.equal(overlay.panel.hidden, true);
    assert.equal(overlay.captionList.children.length, 0);
  });

  it("stops auto-opening on the same page after the user closes the board", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    let nodes = [createTrackNode("https://example.test/auto-first.vtt")];
    let sourceKey = "video-1";
    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      fetchCaption: createFetchCaption({
        "https://example.test/auto-first.vtt": createVtt("First auto subtitle."),
        "https://example.test/auto-second.vtt": createVtt("Second auto subtitle."),
      }),
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
      storageArea: createStorageArea({
        tiktokCaptionAutoOpenEnabled: true,
      }),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    assert.equal(overlay.panel.hidden, false);

    await overlay.closeButton.click();
    assert.equal(overlay.panel.hidden, true);

    nodes = [createTrackNode("https://example.test/auto-second.vtt")];
    sourceKey = "video-2";
    await intervalHandlers[0]();

    assert.equal(overlay.panel.hidden, true);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First auto subtitle.");
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

    await overlay.button.click();

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

  it("refreshes an open recommendation overlay when API data arrives after the retry window", async () => {
    const originalWindow = globalThis.window;
    const messageHandlers = [];
    let overlay;

    globalThis.window = {
      addEventListener(type, handler) {
        if (type === "message") {
          messageHandlers.push(handler);
        }
      },
    };

    try {
      const { createCaptionOverlay } = await loadCaptionCore();
      const document = createDocumentHarness();

      overlay = createCaptionOverlay({
        document,
        getRoot: () =>
          createRootHarness({
            links: [
              createVideoLinkNode(
                "https://www.tiktok.com/@creator/video/8234567890",
                createRect(0, 0, 640, 900),
              ),
            ],
            videos: [
              createVideoNode(createRect(0, 0, 640, 900)),
            ],
          }),
        fetchCaption: createFetchCaption({
          "https://example.test/api-arrived-late.vtt": createVtt("API arrived late subtitle."),
        }),
        translateCaption: async (line) => `${line} 中文`,
        setInterval: null,
        autoRefreshRetryAttempts: 0,
      });

      await overlay.button.click();
      assert.match(overlay.status.textContent, /未检测到可读取字幕/);

      assert.equal(messageHandlers.length, 1);
      await messageHandlers[0]({
        data: {
          type: "msj-tiktok-api-response",
          payload: {
            itemList: [
              {
                id: "8234567890",
                textLanguage: "eng-US",
                video: {
                  subtitleInfos: [
                    {
                      Format: "webvtt",
                      LanguageCodeName: "eng-US",
                      Url: "https://example.test/api-arrived-late.vtt",
                    },
                  ],
                },
              },
            ],
          },
        },
        origin: "https://www.tiktok.com",
      });

      assert.equal(overlay.captionList.children[0].children[0].textContent, "API arrived late subtitle.");
    } finally {
      overlay?.destroy();
      globalThis.window = originalWindow;
    }
  });

  it("does not cancel an in-flight hint match when visible playback captions keep changing", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const intervalHandlers = [];
    const firstSubtitleFetch = createDeferred();
    const laterSubtitleFetch = createDeferred();
    let fetchCount = 0;
    let visibleCaption = "Opening visible cue.";

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "9234567890",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/playing-visible-cue.vtt",
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
      fetchCaption: async (url) => {
        assert.equal(url, "https://example.test/playing-visible-cue.vtt");
        fetchCount += 1;

        const deferred = fetchCount === 1 ? firstSubtitleFetch : laterSubtitleFetch;
        await deferred.promise;

        return {
          ok: true,
          async text() {
            return createVtt("Opening visible cue.");
          },
        };
      },
      translateCaption: async (line) => `${line} 中文`,
      setInterval: (handler) => {
        intervalHandlers.push(handler);
        return intervalHandlers.length;
      },
      clearInterval: () => {},
    });

    const openingRefresh = overlay.button.click();
    await Promise.resolve();
    assert.equal(fetchCount, 1);

    visibleCaption = "Playback moved to the next visible cue.";
    const intervalRefresh = intervalHandlers[0]();
    await Promise.resolve();

    firstSubtitleFetch.resolve();
    for (let attempt = 0; attempt < 5 && fetchCount < 2; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    assert.equal(fetchCount, 2);

    laterSubtitleFetch.resolve();
    await openingRefresh;

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Opening visible cue.");

    await intervalRefresh;
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

  it("does not use hint-matched cached subtitles from a different visible author", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemList: [
        {
          author: {
            uniqueId: "wrongcreator",
          },
          desc: "Wrong cached detail.",
          id: "9234567894",
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/wrong-visible-hint.vtt",
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
            createVideoLinkNode("https://www.tiktok.com/@visiblecreator", createRect(120, 760, 180, 36)),
          ],
          nodes: [
            createVideoDescriptionNode("Current visible detail.", createRect(120, 700, 360, 42)),
            createVisibleCaptionNode("Visible cue.", createRect(120, 760, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/wrong-visible-hint.vtt": createVtt("Visible cue."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 0);
    assert.doesNotMatch(overlay.videoDetails.textContent, /Wrong cached detail/);
    assert.match(overlay.videoDetails.textContent, /Current visible detail/);
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

  it("uses visible recommendation details when no TikTok item is resolved", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes: [
            createVideoDescriptionNode("#tiktokfood #asmr", createRect(120, 760, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      getSourceKey: () => "https://www.tiktok.com/foryou|blob:https://www.tiktok.com/current",
      setInterval: null,
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.refreshCaptions();

    assert.match(overlay.videoDetails.textContent, /#tiktokfood #asmr/);
    assert.equal(overlay.videoInfo.textContent.includes("♥ —"), true);
    assert.equal(overlay.videoInfo.textContent.includes("↗ —"), true);
    assert.equal(overlay.videoInfo.textContent.includes("▶ —"), true);
    assert.equal(overlay.videoInfo.textContent.includes("⏱ —"), true);
    assert.equal(overlay.videoInfo.textContent.includes("0/h"), false);
    assert.equal(overlay.videoInfo.textContent.includes("0天"), false);
    assert.match(overlay.status.textContent, /未检测到可读取字幕/);
  });

  it("clears stale recommendation content while the next video detail lookup is pending", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const pendingDetail = createDeferred();
    let currentVideoId = "1234567891";
    let currentDetail = "First visible detail.";

    ingestTikTokApiPayload({
      itemList: [
        {
          desc: "First cached detail.",
          id: "1234567891",
          video: {
            subtitleInfos: [
              {
                Format: "webvtt",
                LanguageCodeName: "eng-US",
                Url: "https://example.test/first-visible.vtt",
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
              `https://www.tiktok.com/@creator/video/${currentVideoId}`,
              createRect(120, 760, 320, 36),
            ),
          ],
          nodes: [
            createVideoDescriptionNode(currentDetail, createRect(120, 700, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: async (url) => {
        if (url === "https://example.test/first-visible.vtt") {
          return {
            ok: true,
            async text() {
              return createVtt("First subtitle.");
            },
          };
        }

        if (url === "https://www.tiktok.com/@creator/video/1234567892") {
          await pendingDetail.promise;

          return {
            ok: false,
            async text() {
              return "";
            },
          };
        }

        throw new Error(`Unexpected URL: ${url}`);
      },
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.refreshCaptions();
    assert.match(overlay.videoDetails.textContent, /First cached detail/);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First subtitle.");

    currentVideoId = "1234567892";
    currentDetail = "Second visible detail.";

    const refresh = overlay.refreshCaptions();
    await Promise.resolve();

    assert.match(overlay.videoDetails.textContent, /Second visible detail/);
    assert.doesNotMatch(overlay.videoDetails.textContent, /First cached detail/);
    assert.equal(overlay.captionList.children.length, 0);

    pendingDetail.resolve();
    await refresh;
  });

  it("detects recommendation changes from visible author text when no author link is available", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    let nodes = [
      createVideoDescriptionNode("First visible detail.", createRect(120, 700, 360, 42)),
      createVideoAuthorTextNode("firstcreator", createRect(120, 760, 180, 36)),
      createTrackNode("https://example.test/first-author-text.vtt"),
    ];

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes,
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/first-author-text.vtt": createVtt("First author text subtitle."),
      }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.button.click();
    assert.match(overlay.videoDetails.textContent, /First visible detail/);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "First author text subtitle.");

    nodes = [
      createVideoAuthorTextNode("secondcreator", createRect(120, 760, 180, 36)),
    ];

    await overlay.refreshCaptionsIfSourceChanged();

    assert.doesNotMatch(overlay.videoDetails.textContent, /First visible detail/);
    assert.equal(overlay.captionList.children.length, 0);
  });

  it("prefers the visible playing recommendation video over a stale paused video", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    let links = [
      createVideoLinkNode("https://www.tiktok.com/@firstcreator", createRect(120, 760, 180, 36)),
    ];
    let nodes = [
      createVideoDescriptionNode("First visible detail.", createRect(120, 700, 360, 42)),
    ];
    let videos = [
      createVideoNode(createRect(0, 0, 640, 900), {
        paused: false,
        readyState: 4,
      }),
    ];

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links,
          nodes,
          videos,
        }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.button.click();
    assert.match(overlay.videoDetails.textContent, /First visible detail/);

    links = [
      createVideoLinkNode("https://www.tiktok.com/@firstcreator", createRect(120, 760, 180, 36)),
      createVideoLinkNode("https://www.tiktok.com/@secondcreator", createRect(700, 760, 180, 36)),
    ];
    nodes = [
      createVideoDescriptionNode("First visible detail.", createRect(120, 700, 360, 42)),
      createVideoDescriptionNode("Second visible detail.", createRect(700, 700, 320, 42)),
    ];
    videos = [
      createVideoNode(createRect(0, 0, 640, 900), {
        paused: true,
        readyState: 4,
      }),
      createVideoNode(createRect(640, 0, 360, 900), {
        paused: false,
        readyState: 4,
      }),
    ];

    await overlay.refreshCaptionsIfSourceChanged();

    assert.match(overlay.videoDetails.textContent, /Second visible detail/);
    assert.doesNotMatch(overlay.videoDetails.textContent, /First visible detail/);
  });

  it("uses the main visible author when a stale video element remains centered", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    let links = [
      createVideoLinkNode("https://www.tiktok.com/@firstcreator", createRect(700, 760, 180, 36)),
    ];
    let nodes = [
      createVideoDescriptionNode("First centered-video detail.", createRect(700, 700, 320, 42)),
    ];

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          links,
          nodes,
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.button.click();
    assert.match(overlay.videoDetails.textContent, /First centered-video detail/);

    links = [
      createVideoLinkNode("https://www.tiktok.com/@firstcreator", createRect(120, 760, 180, 36)),
      createVideoLinkNode("https://www.tiktok.com/@secondcreator", createRect(700, 760, 180, 36)),
    ];
    nodes = [
      createVideoDescriptionNode("First centered-video detail.", createRect(120, 700, 320, 42)),
      createVideoDescriptionNode("Second visible-author detail.", createRect(700, 700, 320, 42)),
    ];

    await overlay.refreshCaptionsIfSourceChanged();

    assert.match(overlay.videoDetails.textContent, /Second visible-author detail/);
    assert.doesNotMatch(overlay.videoDetails.textContent, /First centered-video detail/);
  });

  it("uses visible DOM play metrics for unresolved recommendation fallback", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const nodes = [
      createVideoAuthorTextNode("vidiqcreator", createRect(700, 760, 180, 36)),
      createVideoDescriptionNode("Current vidIQ fallback detail.", createRect(700, 700, 320, 42)),
      createVisibleMetricNode("By vidIQ", createRect(380, 620, 80, 20)),
      createVisibleMetricNode("20%", createRect(380, 650, 60, 20)),
      createVisibleMetricNode("3.5M", createRect(380, 680, 60, 20)),
      createVisibleMetricNode("00:10 / 00:11", createRect(700, 760, 100, 20), {
        "aria-label": "播放",
      }),
      createVisibleMetricNode("569.6K", createRect(1040, 440, 80, 20), {
        "aria-label": "点赞视频 569.6K 个赞",
      }),
    ];

    const overlay = createCaptionOverlay({
      document,
      getRoot: () =>
        createRootHarness({
          nodes,
          videos: [
            createVideoNode(createRect(420, 80, 400, 820), {
              paused: false,
              readyState: 4,
            }),
          ],
        }),
      translateCaption: async (line) => `${line} 中文`,
      setInterval: null,
    });

    await overlay.button.click();

    assert.match(overlay.videoDetails.textContent, /Current vidIQ fallback detail/);
    assert.match(overlay.videoInfo.textContent, /▶ 3\.5百万/);
    assert.doesNotMatch(overlay.videoInfo.textContent, /▶ 569\.6千/);
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

  it("renders video metrics, details, warning, and compact display modes", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const now = Date.UTC(2026, 5, 2, 12, 0, 0);

    ingestTikTokApiPayload({
      itemInfo: {
        itemStruct: {
          createTime: String(Math.floor((now - 12 * 60 * 60 * 1000) / 1000)),
          desc: "A practical breakdown of a travel product.",
          id: "1234567890",
          stats: {
            playCount: 50000,
          },
          statsV2: {
            likeCount: "120,000",
          },
          textLanguage: "es-ES",
          video: {
            subtitleInfos: [
              {
                languageCode: "es-ES",
                Url: "https://example.test/video-metrics.vtt",
              },
            ],
          },
        },
      },
    });

    const overlay = createCaptionOverlay({
      document,
      fetchCaption: createFetchCaption({
        "https://example.test/video-metrics.vtt": createVtt("Original subtitle."),
      }),
      getRoot: () => createRootHarness(),
      getSourceKey: () => "https://www.tiktok.com/@user/video/1234567890|blob:https://www.tiktok.com/current",
      now: () => now,
      setInterval: null,
      storageArea: createStorageArea(),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();

    assert.equal(overlay.modeButtons.original.textContent, "原版");
    assert.equal(overlay.modeButtons.bilingual.textContent, "原+中");
    assert.equal(overlay.modeButtons.chinese.textContent, "中文");
    const videoInfoText = overlay.videoInfo.textContent;

    assert.equal(videoInfoText.startsWith("高"), true);
    assert.equal(videoInfoText.includes("♥ 1万/h"), true);
    assert.equal(videoInfoText.includes("↗ 4.2千/h"), true);
    assert.equal(videoInfoText.includes("▶ 5万"), true);
    assert.equal(videoInfoText.includes("⏱ 0.5天"), true);
    assert.equal(videoInfoText.indexOf("♥ 1万/h") < videoInfoText.indexOf("↗ 4.2千/h"), true);
    assert.equal(videoInfoText.indexOf("↗ 4.2千/h") < videoInfoText.indexOf("▶ 5万"), true);
    assert.equal(videoInfoText.indexOf("▶ 5万") < videoInfoText.indexOf("⏱ 0.5天"), true);
    assert.equal(overlay.potentialBadge.textContent, "高");
    assert.equal(overlay.potentialBadge.classList.contains("is-high"), true);
    assert.equal(overlay.warningBadges.textContent, "非英内容");
    assert.equal(overlay.warningBadges.classList.contains("is-visible"), true);
    assert.doesNotMatch(overlay.videoDetails.textContent, /标题|详情/);
    assert.match(overlay.videoDetails.textContent, /A practical breakdown/);
    assert.match(overlay.videoDetails.textContent, /A practical breakdown of a travel product\. 中文/);
    assert.equal(overlay.detailsTranslation.classList.contains("msj-tiktok-caption-translation"), true);
    assert.equal(overlay.actions.children.includes(overlay.status), true);
    assert.equal(overlay.actions.children.includes(overlay.modeGroup), true);
    assert.equal(overlay.panelHeader.children.includes(overlay.modeGroup), false);
    assert.equal(overlay.actions.children.indexOf(overlay.modeGroup) > overlay.actions.children.indexOf(overlay.status), true);
    assert.equal(overlay.actions.children.indexOf(overlay.modeGroup) < overlay.actions.children.indexOf(overlay.refreshButton), true);
  });

  it("copies only the original video details from the floating board", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const copied = [];

    ingestTikTokApiPayload({
      itemInfo: {
        itemStruct: {
          desc: "Original detail text only.",
          id: "1734567890",
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [{ Url: "https://example.test/details-copy.vtt" }],
          },
        },
      },
    });

    const overlay = createCaptionOverlay({
      document,
      fetchCaption: createFetchCaption({
        "https://example.test/details-copy.vtt": createVtt("Caption line."),
      }),
      getRoot: () => createRootHarness(),
      getSourceKey: () => "https://www.tiktok.com/@user/video/1734567890",
      navigator: {
        clipboard: {
          async writeText(value) {
            copied.push(value);
          },
        },
      },
      setInterval: null,
      storageArea: createStorageArea(),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();
    await overlay.detailsCopyButton.click();

    assert.deepEqual(copied, ["Original detail text only."]);
    assert.equal(overlay.status.textContent, "视频介绍原文已复制。");
  });

  it("switches between original, bilingual, and Chinese-only captions", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const storageArea = createStorageArea();
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
      setInterval: null,
      storageArea,
      translateCaption: async (line) => `${line} 的中文翻译`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Fresh subtitle");
    assert.equal(overlay.captionList.children[0].children[1].textContent, "Fresh subtitle 的中文翻译");

    await overlay.modeButtons.original.click();
    assert.equal(overlay.captionList.children[0].textContent, "Fresh subtitle");
    assert.equal(overlay.captionList.children[0].children.length, 0);

    await overlay.modeButtons.chinese.click();
    assert.equal(overlay.captionList.children[0].children[0].textContent, "Fresh subtitle 的中文翻译");
    assert.equal(overlay.captionList.children[0].children[0].classList.contains("msj-tiktok-caption-translation"), true);
    assert.equal(storageArea.values.tiktokCaptionDisplayMode, "chinese");
  });

  it("classifies potential from hourly like rate", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const now = Date.UTC(2026, 5, 2, 12, 0, 0);
    let activeVideoId = "2234567890";

    ingestTikTokApiPayload({
      itemList: [
        {
          createTime: String(Math.floor((now - 12 * 60 * 60 * 1000) / 1000)),
          id: "2234567890",
          stats: { diggCount: 120000, playCount: 1200 },
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [{ Url: "https://example.test/high-likes.vtt" }],
          },
        },
        {
          createTime: String(Math.floor((now - 12 * 60 * 60 * 1000) / 1000)),
          id: "3234567890",
          stats: { diggCount: 72000, playCount: 1200000 },
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [{ Url: "https://example.test/mid-likes.vtt" }],
          },
        },
        {
          createTime: String(Math.floor((now - 12 * 60 * 60 * 1000) / 1000)),
          id: "4234567891",
          stats: { diggCount: 48000, playCount: 1200000 },
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [{ Url: "https://example.test/low-likes.vtt" }],
          },
        },
        {
          id: "5234567892",
          stats: { diggCount: 120000, playCount: 1200000 },
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [{ Url: "https://example.test/unknown-likes.vtt" }],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      fetchCaption: createFetchCaption({
        "https://example.test/high-likes.vtt": createVtt("High subtitle."),
        "https://example.test/mid-likes.vtt": createVtt("Mid subtitle."),
        "https://example.test/low-likes.vtt": createVtt("Low subtitle."),
        "https://example.test/unknown-likes.vtt": createVtt("Unknown subtitle."),
      }),
      getRoot: () => createRootHarness(),
      getSourceKey: () => `https://www.tiktok.com/@user/video/${activeVideoId}|blob:https://www.tiktok.com/current`,
      now: () => now,
      setInterval: null,
      storageArea: createStorageArea(),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();

    assert.equal(overlay.videoInfo.textContent.startsWith("高"), true);
    assert.equal(overlay.videoInfo.textContent.includes("♥ 1万/h"), true);
    assert.equal(overlay.potentialBadge.classList.contains("is-high"), true);

    activeVideoId = "3234567890";
    await overlay.refreshCaptions({ ignoreScriptCaptions: true });

    assert.equal(overlay.videoInfo.textContent.startsWith("中"), true);
    assert.equal(overlay.videoInfo.textContent.includes("♥ 6千/h"), true);
    assert.equal(overlay.potentialBadge.classList.contains("is-mid"), true);

    activeVideoId = "4234567891";
    await overlay.refreshCaptions({ ignoreScriptCaptions: true });

    assert.equal(overlay.videoInfo.textContent.startsWith("低"), true);
    assert.equal(overlay.videoInfo.textContent.includes("♥ 4千/h"), true);
    assert.equal(overlay.potentialBadge.classList.contains("is-low"), true);

    activeVideoId = "5234567892";
    await overlay.refreshCaptions({ ignoreScriptCaptions: true });

    assert.equal(overlay.videoInfo.textContent.startsWith("—"), true);
    assert.equal(overlay.videoInfo.textContent.includes("♥ —"), true);
    assert.equal(overlay.potentialBadge.textContent, "—");
    assert.equal(overlay.potentialBadge.classList.contains("is-high"), false);
    assert.equal(overlay.potentialBadge.classList.contains("is-mid"), false);
    assert.equal(overlay.potentialBadge.classList.contains("is-low"), false);
  });

  it("hides non-English warning when the setting is disabled", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemInfo: {
        itemStruct: {
          id: "4234567890",
          stats: { playCount: 1 },
          textLanguage: "zh-Hans",
          video: {
            subtitleInfos: [{ Url: "https://example.test/non-english-off.vtt" }],
          },
        },
      },
    });

    const overlay = createCaptionOverlay({
      document,
      fetchCaption: createFetchCaption({
        "https://example.test/non-english-off.vtt": createVtt("Subtitle."),
      }),
      getRoot: () => createRootHarness(),
      getSourceKey: () => "https://www.tiktok.com/@user/video/4234567890",
      setInterval: null,
      storageArea: createStorageArea({
        tiktokCaptionNonEnglishWarningEnabled: false,
      }),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();

    assert.equal(overlay.warningBadges.textContent, "");
    assert.equal(overlay.warningBadges.classList.contains("is-visible"), false);
  });

  it("renders warning badges for non-English, short duration, and videos older than one day", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const now = Date.UTC(2026, 5, 2, 12, 0, 0);
    let activeVideoId = "5234567890";

    ingestTikTokApiPayload({
      itemList: [
        {
          createTime: String(Math.floor((now - 25 * 60 * 60 * 1000) / 1000)),
          id: "5234567890",
          stats: { diggCount: 1000, playCount: 2000 },
          textLanguage: "zh-Hans",
          video: {
            duration: 59,
            subtitleInfos: [{ Url: "https://example.test/warnings.vtt" }],
          },
        },
        {
          createTime: String(Math.floor((now - 24 * 60 * 60 * 1000) / 1000)),
          id: "6234567890",
          stats: { diggCount: 1000, playCount: 2000 },
          textLanguage: "eng-US",
          video: {
            duration: 60,
            subtitleInfos: [{ Url: "https://example.test/no-warnings.vtt" }],
          },
        },
        {
          id: "7234567890",
          stats: { diggCount: 1000, playCount: 2000 },
          textLanguage: "eng-US",
          video: {
            subtitleInfos: [{ Url: "https://example.test/missing-warning-data.vtt" }],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      fetchCaption: createFetchCaption({
        "https://example.test/warnings.vtt": createVtt("Warning subtitle."),
        "https://example.test/no-warnings.vtt": createVtt("No warning subtitle."),
        "https://example.test/missing-warning-data.vtt": createVtt("Missing warning data subtitle."),
      }),
      getRoot: () => createRootHarness(),
      getSourceKey: () => `https://www.tiktok.com/@user/video/${activeVideoId}`,
      now: () => now,
      setInterval: null,
      storageArea: createStorageArea(),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();

    assert.match(overlay.warningBadges.textContent, /非英内容/);
    assert.match(overlay.warningBadges.textContent, /时长<1分/);
    assert.match(overlay.warningBadges.textContent, /发布>1天/);
    assert.equal(overlay.warningBadges.classList.contains("is-visible"), true);

    activeVideoId = "6234567890";
    await overlay.refreshCaptions({ ignoreScriptCaptions: true });

    assert.equal(overlay.warningBadges.textContent, "");
    assert.equal(overlay.warningBadges.classList.contains("is-visible"), false);

    activeVideoId = "7234567890";
    await overlay.refreshCaptions({ ignoreScriptCaptions: true });

    assert.equal(overlay.warningBadges.textContent, "");
    assert.equal(overlay.warningBadges.classList.contains("is-visible"), false);
  });

  it("scales the whole caption panel text and persists the selected scale", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const storageArea = createStorageArea();
    const overlay = createCaptionOverlay({
      document,
      setInterval: null,
      storageArea,
    });

    await overlay.ready;

    assert.equal(overlay.panel.style.fontSize, "100%");

    await overlay.fontIncreaseButton.click();
    assert.equal(overlay.panel.style.fontSize, "110%");
    assert.equal(storageArea.values.tiktokCaptionFontScale, 110);

    await overlay.fontDecreaseButton.click();
    await overlay.fontDecreaseButton.click();
    assert.equal(overlay.panel.style.fontSize, "90%");
    assert.equal(storageArea.values.tiktokCaptionFontScale, 90);

    for (let index = 0; index < 4; index += 1) {
      await overlay.fontDecreaseButton.click();
    }

    assert.equal(overlay.panel.style.fontSize, "80%");
    assert.equal(storageArea.values.tiktokCaptionFontScale, 80);

    for (let index = 0; index < 10; index += 1) {
      await overlay.fontIncreaseButton.click();
    }

    assert.equal(overlay.panel.style.fontSize, "160%");
    assert.equal(storageArea.values.tiktokCaptionFontScale, 160);
  });

  it("restores the saved caption panel font scale", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const overlay = createCaptionOverlay({
      document,
      setInterval: null,
      storageArea: createStorageArea({
        tiktokCaptionFontScale: 130,
      }),
    });

    await overlay.ready;

    assert.equal(overlay.panel.style.fontSize, "130%");
  });

  it("uses hint-matched recommendation item for captions, details, and metrics", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const now = Date.UTC(2026, 5, 2, 12, 0, 0);

    ingestTikTokApiPayload({
      itemList: [
        {
          createTime: String(Math.floor((now - 24 * 60 * 60 * 1000) / 1000)),
          desc: "A matched recommendation detail.",
          id: "5234567891",
          stats: {
            diggCount: 48000,
            playCount: 240000,
          },
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
                Url: "https://example.test/hint-matched-original.vtt",
              },
              {
                Format: "webvtt",
                LanguageCodeName: "zh-Hans",
                Url: "https://example.test/hint-matched-translated.vtt",
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
            createVisibleCaptionNode("可见中文线索", createRect(100, 780, 360, 42)),
          ],
          videos: [
            createVideoNode(createRect(0, 0, 640, 900)),
          ],
        }),
      fetchCaption: createFetchCaption({
        "https://example.test/hint-matched-original.vtt": createVtt("Matched original subtitle."),
        "https://example.test/hint-matched-translated.vtt": createVtt("可见中文线索"),
      }),
      now: () => now,
      setInterval: null,
      storageArea: createStorageArea(),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();

    const videoInfoText = overlay.videoInfo.textContent;

    assert.equal(overlay.captionList.children[0].children[0].textContent, "Matched original subtitle.");
    assert.match(overlay.videoDetails.textContent, /A matched recommendation detail/);
    assert.equal(videoInfoText.includes("♥ 2千/h"), true);
    assert.equal(videoInfoText.includes("↗ 1万/h"), true);
    assert.equal(videoInfoText.includes("▶ 24万"), true);
    assert.equal(videoInfoText.includes("⏱ 1天"), true);
    assert.equal(videoInfoText.indexOf("♥ 2千/h") < videoInfoText.indexOf("↗ 1万/h"), true);
    assert.equal(videoInfoText.indexOf("↗ 1万/h") < videoInfoText.indexOf("▶ 24万"), true);
    assert.equal(videoInfoText.indexOf("▶ 24万") < videoInfoText.indexOf("⏱ 1天"), true);
  });

  it("stores dragged button position and resized panel frame from every edge", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const storageArea = createStorageArea();
    const overlay = createCaptionOverlay({
      document,
      setInterval: null,
      storageArea,
    });

    await overlay.ready;

    overlay.button.dispatch("pointerdown", {
      clientX: 100,
      clientY: 120,
    });
    overlay.button.dispatch("pointermove", {
      clientX: 128,
      clientY: 150,
    });
    await overlay.button.dispatch("pointerup", {
      clientX: 128,
      clientY: 150,
    });

    assert.equal(overlay.panel.hidden, true);
    assert.equal(typeof storageArea.values.tiktokCaptionButtonPosition.x, "number");
    assert.equal(typeof storageArea.values.tiktokCaptionButtonPosition.y, "number");

    overlay.panelHeader.dispatch("pointerdown", {
      clientX: 200,
      clientY: 220,
    });
    overlay.panelHeader.dispatch("pointermove", {
      clientX: 240,
      clientY: 260,
    });
    await overlay.panelHeader.dispatch("pointerup", {
      clientX: 240,
      clientY: 260,
    });

    overlay.resizeHandles.right.dispatch("pointerdown", {
      clientX: 320,
      clientY: 300,
    });
    overlay.resizeHandles.right.dispatch("pointermove", {
      clientX: 380,
      clientY: 300,
    });
    await overlay.resizeHandles.right.dispatch("pointerup", {
      clientX: 380,
      clientY: 300,
    });

    overlay.resizeHandles.left.dispatch("pointerdown", {
      clientX: 200,
      clientY: 300,
    });
    overlay.resizeHandles.left.dispatch("pointermove", {
      clientX: 170,
      clientY: 300,
    });
    await overlay.resizeHandles.left.dispatch("pointerup", {
      clientX: 170,
      clientY: 300,
    });

    overlay.resizeHandles.top.dispatch("pointerdown", {
      clientX: 320,
      clientY: 220,
    });
    overlay.resizeHandles.top.dispatch("pointermove", {
      clientX: 320,
      clientY: 190,
    });
    await overlay.resizeHandles.top.dispatch("pointerup", {
      clientX: 320,
      clientY: 190,
    });

    overlay.resizeHandles.bottom.dispatch("pointerdown", {
      clientX: 320,
      clientY: 420,
    });
    overlay.resizeHandles.bottom.dispatch("pointermove", {
      clientX: 320,
      clientY: 460,
    });
    await overlay.resizeHandles.bottom.dispatch("pointerup", {
      clientX: 320,
      clientY: 460,
    });

    assert.equal(typeof storageArea.values.tiktokCaptionPanelFrame.x, "number");
    assert.equal(typeof storageArea.values.tiktokCaptionPanelFrame.y, "number");
    assert.equal(typeof storageArea.values.tiktokCaptionPanelFrame.width, "number");
    assert.equal(typeof storageArea.values.tiktokCaptionPanelFrame.height, "number");
  });

  it("lets the user resize the video details area independently", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const storageArea = createStorageArea();
    const overlay = createCaptionOverlay({
      document,
      setInterval: null,
      storageArea,
    });

    await overlay.ready;

    assert.equal(overlay.videoDetails.style.maxHeight, "84px");

    overlay.detailsResizeHandle.dispatch("pointerdown", {
      clientX: 320,
      clientY: 220,
    });
    overlay.detailsResizeHandle.dispatch("pointermove", {
      clientX: 320,
      clientY: 300,
    });
    await overlay.detailsResizeHandle.dispatch("pointerup", {
      clientX: 320,
      clientY: 300,
    });

    assert.equal(overlay.videoDetails.style.maxHeight, "164px");
    assert.equal(storageArea.values.tiktokCaptionDetailsHeight, 164);
  });

  it("uses the last details height for long subtitles and falls back for short subtitles", async () => {
    const { createCaptionOverlay } = await loadCaptionCore();
    const document = createDocumentHarness();
    const storageArea = createStorageArea({
      tiktokCaptionDetailsHeight: 160,
    });
    let nodes = [createTrackNode("https://example.test/long.vtt")];
    let sourceKey = "video-long";

    const overlay = createCaptionOverlay({
      document,
      fetchCaption: createFetchCaption({
        "https://example.test/long.vtt": [
          "WEBVTT",
          "",
          "00:00:00.000 --> 00:00:01.000",
          "First subtitle",
          "",
          "00:00:01.000 --> 00:00:02.000",
          "Second subtitle",
          "",
          "00:00:02.000 --> 00:00:03.000",
          "Third subtitle",
          "",
          "00:00:03.000 --> 00:00:04.000",
          "Fourth subtitle",
          "",
          "00:00:04.000 --> 00:00:05.000",
          "Fifth subtitle",
        ].join("\n"),
        "https://example.test/short.vtt": createVtt("Only subtitle"),
      }),
      getRoot: () => createRootHarness({ nodes }),
      getSourceKey: () => sourceKey,
      setInterval: null,
      storageArea,
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();

    assert.equal(overlay.captionList.children.length, 5);
    assert.equal(overlay.videoDetails.style.maxHeight, "160px");

    nodes = [createTrackNode("https://example.test/short.vtt")];
    sourceKey = "video-short";
    await overlay.refreshCaptions({ ignoreScriptCaptions: true });

    assert.equal(overlay.captionList.children.length, 1);
    assert.equal(overlay.videoDetails.style.maxHeight, "84px");
  });

  it("resets caption scroll when the active item changes", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    let activeItemId = "5234567890";

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "5234567890",
          video: {
            subtitleInfos: [{ Url: "https://example.test/scroll-first.vtt" }],
          },
        },
        {
          id: "6234567890",
          video: {
            subtitleInfos: [{ Url: "https://example.test/scroll-second.vtt" }],
          },
        },
      ],
    });

    const overlay = createCaptionOverlay({
      document,
      fetchCaption: createFetchCaption({
        "https://example.test/scroll-first.vtt": createVtt("First scroll subtitle."),
        "https://example.test/scroll-second.vtt": createVtt("Second scroll subtitle."),
      }),
      getRoot: () => createRootHarness(),
      getSourceKey: () => `https://www.tiktok.com/@user/video/${activeItemId}`,
      setInterval: null,
      storageArea: createStorageArea(),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();
    overlay.captionList.scrollTop = 220;

    activeItemId = "6234567890";
    await overlay.refreshCaptions({ ignoreScriptCaptions: true });

    assert.equal(overlay.captionList.scrollTop, 0);
    assert.equal(overlay.captionList.children[0].children[0].textContent, "Second scroll subtitle.");
  });

  it("uses TikTok photo post text when there are no video subtitles", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();

    ingestTikTokApiPayload({
      itemInfo: {
        itemStruct: {
          createTime: "1780401600",
          desc: "A photo post about a new product drop.",
          id: "7234567890",
          imagePost: {
            title: "Photo launch notes",
          },
          stats: {
            collectCount: 10,
            digg_count: 1200,
            playCount: 1200000,
          },
          textLanguage: "eng-US",
        },
      },
    });

    const overlay = createCaptionOverlay({
      document,
      getRoot: () => createRootHarness(),
      getSourceKey: () => "https://www.tiktok.com/@user/photo/7234567890",
      now: () => Date.UTC(2026, 5, 2, 12, 0, 0),
      setInterval: null,
      storageArea: createStorageArea(),
      translateCaption: async (line) => `${line} 中文`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();

    assert.match(overlay.videoInfo.textContent, /1\.2千\/h.*1\.2百万\/h.*1\.2百万/);
    assert.match(overlay.captionList.children[0].children[0].textContent, /Photo launch notes/);
    assert.match(overlay.captionList.children[0].children[1].textContent, /中文/);
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

  it("toggles Chinese translations from the caption board mode buttons", async () => {
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

    assert.equal(overlay.modeButtons.bilingual.classList.contains("is-active"), true);
    assert.equal(overlay.captionList.children[0].children[1].textContent, "Fresh subtitle 的中文翻译");

    await overlay.modeButtons.original.click();

    assert.equal(overlay.modeButtons.original.classList.contains("is-active"), true);
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

  it("exposes a serializable caption board state for the side panel", async () => {
    const {
      createCaptionOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const document = createDocumentHarness();
    const now = Date.UTC(2026, 5, 2, 12, 0, 0);

    ingestTikTokApiPayload({
      itemInfo: {
        itemStruct: {
          author: {
            avatarThumb: "https://example.test/author.jpeg",
            nickname: "Travel Builder",
            uniqueId: "travelbuilder",
          },
          createTime: String(Math.floor((now - 12 * 60 * 60 * 1000) / 1000)),
          desc: "A practical breakdown of a travel product.",
          id: "1234567890",
          stats: {
            playCount: 50000,
          },
          statsV2: {
            likeCount: "120,000",
          },
          textLanguage: "es-ES",
          video: {
            subtitleInfos: [
              {
                languageCode: "es-ES",
                Url: "https://example.test/side-panel-state.vtt",
              },
            ],
          },
        },
      },
    });

    const overlay = createCaptionOverlay({
      document,
      fetchCaption: createFetchCaption({
        "https://example.test/side-panel-state.vtt": createVtt("Fresh subtitle"),
      }),
      getRoot: () => createRootHarness(),
      getSourceKey: () => "https://www.tiktok.com/@user/video/1234567890|blob:https://www.tiktok.com/current",
      now: () => now,
      setInterval: null,
      storageArea: createStorageArea({ tiktokCaptionFontScale: 110 }),
      translateCaption: async (line) => `${line} 的中文翻译`,
    });

    await overlay.ready;
    await overlay.refreshCaptions();

    const state = overlay.getCaptionBoardState();

    assert.equal(state.status, "已读取 1 条字幕。");
    assert.equal(state.displayMode, "bilingual");
    assert.equal(state.fontScale, 110);
    assert.equal(state.canDecreaseFont, true);
    assert.equal(state.canIncreaseFont, true);
    assert.equal(state.copyText, "Fresh subtitle\nFresh subtitle 的中文翻译");
    assert.deepEqual(state.lines, [
      { original: "Fresh subtitle", translation: "Fresh subtitle 的中文翻译" },
    ]);
    assert.deepEqual(state.videoDetails, {
      original: "A practical breakdown of a travel product.",
      translation: "A practical breakdown of a travel product. 的中文翻译",
    });
    assert.deepEqual(state.author, {
      avatarUrl: "https://example.test/author.jpeg",
      name: "Travel Builder",
      profileUrl: "https://www.tiktok.com/@travelbuilder",
      uniqueId: "travelbuilder",
    });
    assert.equal(overlay.authorLink.hidden, false);
    assert.equal(overlay.authorLink.href, "https://www.tiktok.com/@travelbuilder");
    assert.equal(overlay.authorAvatar.src, "https://example.test/author.jpeg");
    assert.equal(overlay.authorName.textContent, "Travel Builder");
    assert.equal(state.metrics[0].value, "1万/h");
    assert.equal(state.metrics[1].value, "4.2千/h");
    assert.equal(state.metrics[2].value, "5万");
    assert.equal(state.metrics[3].value, "0.5天");
    assert.deepEqual(state.warnings, ["非英内容"]);
  });

  it("renders only detail-panel metrics and warnings on liked profile cards", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const createTime = Math.floor(Date.UTC(2026, 4, 23, 12, 0, 0) / 1000);
    const now = Date.UTC(2026, 4, 24, 0, 0, 0);

    ingestTikTokApiPayload({
      itemList: [
        {
          authorStats: {
            followerCount: 7000000,
          },
          createTime,
          id: "1234567890",
          language: "fr",
          stats: {
            collectCount: 15300,
            commentCount: 211,
            diggCount: 360100,
            playCount: 2000000,
            shareCount: 7153,
          },
          video: {
            duration: 11,
            VQScore: 74.39,
          },
        },
      ],
    });

    const { document, links } = createMetricsDocumentHarness({
      cards: ["https://www.tiktok.com/@demo/video/1234567890"],
      surface: "liked",
    });
    const overlay = createTikTokCardMetricsOverlay({
      document,
      mutationObserverClass: null,
      now: () => now,
      setInterval: null,
    });

    assert.equal(overlay.refresh(), 1);
    assert.equal(overlay.refresh(), 1);

    const metricsRoot = links[0].children.find((child) =>
      child.classList.contains("msj-tiktok-card-metrics"),
    );

    assert.ok(metricsRoot);
    assert.equal(metricsRoot.dataset.surface, "liked");
    assert.equal(
      metricsRoot.textContent,
      "High30K/h2M166.7K/h0.5d!<1m!Non-EN",
    );
    const likedLeftColumn = metricsRoot.children.find((child) =>
      child.classList.contains("msj-tiktok-card-metrics-left"),
    );
    const likedRightColumn = metricsRoot.children.find((child) =>
      child.classList.contains("msj-tiktok-card-metrics-right"),
    );

    assert.equal(likedLeftColumn.children.length, 5);
    assert.equal(likedLeftColumn.textContent, "High30K/h2M166.7K/h0.5d");
    assert.equal(likedRightColumn.children.length, 2);
    assert.equal(likedRightColumn.textContent, "!<1m!Non-EN");
    assert.equal(metricsRoot.textContent.includes("211"), false);
    assert.equal(metricsRoot.textContent.includes("15.3k"), false);
    assert.equal(metricsRoot.textContent.includes("7153"), false);
    assert.equal(metricsRoot.textContent.includes("74.39"), false);
    assert.equal(metricsRoot.textContent.includes("7M"), false);
    assert.equal(metricsRoot.textContent.includes("2026/05/23"), false);
    assert.equal(metricsRoot.textContent.includes("百万"), false);
    assert.equal(metricsRoot.textContent.includes("万"), false);
    assert.equal(
      links[0].children.filter((child) => child.classList.contains("msj-tiktok-card-metrics")).length,
      1,
    );
  });

  it("renders detail-panel metrics on collection profile cards", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const createTime = Math.floor(Date.UTC(2026, 4, 24, 12, 0, 0) / 1000);
    const now = Date.UTC(2026, 4, 26, 0, 0, 0);

    ingestTikTokApiPayload({
      itemList: [
        {
          authorStats: {
            followerCount: "1.2M",
          },
          createTime,
          id: "2345678901",
          statsV2: {
            collectCount: "12,000",
            commentCount: 30,
            diggCount: 42000,
            playCount: 100000,
            shareCount: 120,
          },
          video: {
            durationSeconds: 75,
          },
        },
      ],
    });

    const { document, links } = createMetricsDocumentHarness({
      cards: ["https://www.tiktok.com/@demo/video/2345678901"],
      surface: "collection",
    });
    const overlay = createTikTokCardMetricsOverlay({
      document,
      mutationObserverClass: null,
      now: () => now,
      setInterval: null,
    });

    assert.equal(overlay.refresh(), 1);

    const metricsRoot = links[0].children.find((child) =>
      child.classList.contains("msj-tiktok-card-metrics"),
    );

    assert.ok(metricsRoot);
    assert.equal(metricsRoot.dataset.surface, "collection");
    assert.equal(metricsRoot.textContent, "Low1.2K/h100K2.8K/h1.5d!>1d");
  });

  it("does not create a full-page MutationObserver for TikTok card metrics", async () => {
    const { createTikTokCardMetricsOverlay } = await loadCaptionCore();
    const { document } = createMetricsDocumentHarness({
      cards: ["https://www.tiktok.com/@demo/video/4567890123"],
      surface: "liked",
    });
    let observerCount = 0;

    class MutationObserverHarness {
      constructor() {
        observerCount += 1;
      }

      disconnect() {}
      observe() {}
    }

    createTikTokCardMetricsOverlay({
      document,
      mutationObserverClass: MutationObserverHarness,
      setInterval: null,
    });

    assert.equal(observerCount, 0);
  });

  it("does not rebuild unchanged TikTok card metrics on repeated scans", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "4567890123",
          stats: {
            diggCount: 1000,
            playCount: 10000,
          },
          video: {
            duration: 9,
          },
        },
      ],
    });

    const { document, links } = createMetricsDocumentHarness({
      cards: ["https://www.tiktok.com/@demo/video/4567890123"],
      surface: "liked",
    });
    const overlay = createTikTokCardMetricsOverlay({
      document,
      mutationObserverClass: null,
      setInterval: null,
    });
    const firstElementCount = document.elements.length;
    const firstMetricsRoot = links[0].children.find((child) =>
      child.classList.contains("msj-tiktok-card-metrics"),
    );

    assert.equal(overlay.refresh(), 1);
    assert.equal(document.elements.length, firstElementCount);
    assert.equal(
      links[0].children.find((child) => child.classList.contains("msj-tiktok-card-metrics")),
      firstMetricsRoot,
    );
  });

  it("renders TikTok card metrics on search, tag, and music result cards", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "1111111111",
          stats: {
            diggCount: 10000,
            playCount: 20000,
          },
          video: {
            duration: 8,
          },
        },
        {
          id: "2222222222",
          stats: {
            diggCount: 20000,
            playCount: 40000,
          },
          video: {
            duration: 9,
          },
        },
        {
          id: "3333333333",
          stats: {
            diggCount: 30000,
            playCount: 60000,
          },
          video: {
            duration: 10,
          },
        },
      ],
    });

    for (const [surface, id] of [
      ["search", "1111111111"],
      ["tag", "2222222222"],
      ["music", "3333333333"],
    ]) {
      const { cards, document } = createMetricsSurfaceDocumentHarness({
        cards: [`https://www.tiktok.com/@demo/video/${id}`],
        surface,
      });
      const overlay = createTikTokCardMetricsOverlay({
        document,
        mutationObserverClass: null,
        setInterval: null,
      });

      assert.equal(overlay.refresh(), 1);
      assert.equal(
        cards[0].children.some((child) => child.classList.contains("msj-tiktok-card-metrics")),
        true,
        `${surface} should render card metrics`,
      );
    }
  });

  it("adds lightweight TikTok card filter controls only on supported card surfaces", async () => {
    const { createTikTokCardMetricsOverlay } = await loadCaptionCore();
    const supported = createMetricsDocumentHarness({
      cards: ["https://www.tiktok.com/@demo/video/5555555555"],
      surface: "liked",
    });
    const unsupported = createMetricsDocumentHarness({
      cards: ["https://www.tiktok.com/@demo/video/6666666666"],
      surface: "none",
    });

    const supportedOverlay = createTikTokCardMetricsOverlay({
      document: supported.document,
      setInterval: null,
    });
    const unsupportedOverlay = createTikTokCardMetricsOverlay({
      document: unsupported.document,
      setInterval: null,
    });

    supportedOverlay.refresh();
    unsupportedOverlay.refresh();

    assert.ok(supportedOverlay.filterRoot);
    assert.equal(
      supported.document.body.children.some((child) =>
        child.classList.contains("msj-tiktok-card-filter"),
      ),
      true,
    );
    assert.equal(unsupportedOverlay.filterRoot, null);
    assert.equal(
      unsupported.document.body.children.some((child) =>
        child.classList.contains("msj-tiktok-card-filter"),
      ),
      false,
    );
  });

  it("filters loaded TikTok cards by the current core metric specs", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const now = Date.UTC(2026, 4, 26, 0, 0, 0);
    const recentCreateTime = Math.floor((now - 12 * 3600000) / 1000);

    ingestTikTokApiPayload({
      itemList: [
        {
          createTime: recentCreateTime,
          desc: "Strong candidate",
          id: "7777777777",
          stats: {
            diggCount: 360000,
            playCount: 2000000,
          },
          video: {
            duration: 75,
          },
        },
        {
          createTime: recentCreateTime,
          desc: "Small candidate",
          id: "8888888888",
          stats: {
            diggCount: 1200,
            playCount: 90000,
          },
          video: {
            duration: 75,
          },
        },
      ],
    });

    const { document, links } = createMetricsDocumentHarness({
      cards: [
        "https://www.tiktok.com/@demo/video/7777777777",
        "https://www.tiktok.com/@demo/video/8888888888",
      ],
      surface: "liked",
    });
    const overlay = createTikTokCardMetricsOverlay({
      document,
      now: () => now,
      setInterval: null,
    });

    assert.equal(overlay.refresh(), 2);
    overlay.setFilterCriteria({
      minLikeRate: 10000,
      minPlayCount: 1000000,
      potential: "High",
    });

    assert.equal(links[0].style.display, "");
    assert.equal(links[1].style.display, "none");
    assert.equal(
      links[1].children.some((child) => child.classList.contains("msj-tiktok-card-metrics")),
      true,
    );
    assert.equal(overlay.filterSummary.textContent.includes("1/2"), true);

    overlay.resetFilterCriteria();

    assert.equal(links[0].style.display, "");
    assert.equal(links[1].style.display, "");
  });

  it("filters shorthand like-rate input, hides whole cards, and sorts by selected fields", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const now = Date.UTC(2026, 4, 26, 0, 0, 0);
    const createTime = Math.floor((now - 10 * 3600000) / 1000);

    ingestTikTokApiPayload({
      itemList: [
        {
          createTime,
          id: "9511111111",
          stats: {
            diggCount: 90000,
            playCount: 2500000,
          },
          video: { duration: 70 },
        },
        {
          createTime,
          id: "9522222222",
          stats: {
            diggCount: 210000,
            playCount: 1800000,
          },
          video: { duration: 70 },
        },
        {
          createTime,
          id: "9533333333",
          stats: {
            diggCount: 12000,
            playCount: 180000,
          },
          video: { duration: 70 },
        },
      ],
    });

    const cards = [
      createMetricProfileCardHarness("https://www.tiktok.com/@demo/video/9511111111"),
      createMetricProfileCardHarness("https://www.tiktok.com/@demo/video/9522222222"),
      createMetricProfileCardHarness("https://www.tiktok.com/@demo/video/9533333333"),
    ];
    const grid = createElementHarness("div");
    const document = createDocumentHarness();

    grid.append(...cards.map((entry) => entry.card));
    useHtmlCollectionLikeChildren(grid);
    assert.equal(Array.isArray(grid.children), false);
    document.location = { href: "https://www.tiktok.com/@demo?tab=liked" };
    document.querySelectorAll = (selector) => {
      if (
        selector.includes("a[href*='/video/']") ||
        selector.includes("a[href*='/photo/']") ||
        selector.includes("a[href*='com/@']")
      ) {
        return cards.map((entry) => entry.link);
      }

      if (selector.includes("aria-selected") || selector.includes("data-e2e") || selector.includes("liked")) {
        return [createMetricsTabNode("liked")];
      }

      return [];
    };

    const overlay = createTikTokCardMetricsOverlay({
      document,
      now: () => now,
      setInterval: null,
    });

    overlay.refresh();
    overlay.setFilterCriteria({
      minLikeRate: "5k",
      sortFields: ["playCount", "likeRate"],
    });

    assert.equal(cards[0].card.style.display, "");
    assert.equal(cards[1].card.style.display, "");
    assert.equal(cards[2].card.style.display, "none");
    assert.deepEqual(Array.from(grid.children).map((card) => card.children[0].href), [
      "https://www.tiktok.com/@demo/video/9511111111",
      "https://www.tiktok.com/@demo/video/9522222222",
      "https://www.tiktok.com/@demo/video/9533333333",
    ]);
    assert.equal(overlay.filterSummary.textContent.includes("2/3"), true);
  });

  it("uses a compact floating filter button with potential presets and selectable sort fields", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const now = Date.now();
    const recentCreateTime = Math.floor((now - 2 * 86400000) / 1000);
    const oldCreateTime = Math.floor((now - 10 * 86400000) / 1000);

    ingestTikTokApiPayload({
      itemList: [
        {
          createTime: recentCreateTime,
          id: "9611111111",
          stats: { diggCount: 120000, playCount: 900000 },
          video: { duration: 70 },
        },
        {
          createTime: recentCreateTime,
          id: "9622222222",
          stats: { diggCount: 70000, playCount: 600000 },
          video: { duration: 70 },
        },
        {
          createTime: oldCreateTime,
          id: "9633333333",
          stats: { diggCount: 25000, playCount: 400000 },
          video: { duration: 70 },
        },
      ],
    });

    const { document, links } = createMetricsDocumentHarness({
      cards: [
        "https://www.tiktok.com/@demo/video/9611111111",
        "https://www.tiktok.com/@demo/video/9622222222",
        "https://www.tiktok.com/@demo/video/9633333333",
      ],
      surface: "liked",
    });
    const overlay = createTikTokCardMetricsOverlay({
      document,
      now: () => now,
      setInterval: null,
    });

    overlay.refresh();

    assert.match(overlay.filterRoot.textContent, /筛选/u);
    assert.doesNotMatch(overlay.filterRoot.textContent, /加载更多并排序/u);
    assert.equal(overlay.filterPanel.hidden, true);

    findElementByText(document, "button", "筛选").click();

    assert.equal(overlay.filterPanel.hidden, false);
    assert.match(overlay.filterRoot.textContent, /爆款评价/u);
    assert.match(overlay.filterRoot.textContent, /高/u);
    assert.match(overlay.filterRoot.textContent, /中/u);
    assert.match(overlay.filterRoot.textContent, /低/u);
    assert.match(overlay.filterRoot.textContent, /排序条件一/u);
    assert.match(overlay.filterRoot.textContent, /排序条件二/u);
    assert.match(overlay.filterRoot.textContent, /排序条件三/u);
    assert.match(overlay.filterRoot.textContent, /最低每小时点赞量/u);
    assert.match(overlay.filterRoot.textContent, /最低总点赞量/u);
    assert.match(overlay.filterRoot.textContent, /加载更多/u);

    findElementByText(document, "button", "高").click();
    assert.equal(findControlByKey(document, "minLikeRate").value, "10000");

    findElementByText(document, "button", "全部").click();
    assert.equal(findControlByKey(document, "minLikeRate").value, "");

    findElementByText(document, "button", "近7天").click();
    findElementByText(document, "button", "应用筛选").click();

    assert.equal(links[0].style.display, "");
    assert.equal(links[1].style.display, "");
    assert.equal(links[2].style.display, "none");
    assert.equal(overlay.filterSummary.textContent.includes("2/3"), true);
    assert.equal(overlay.filterPanel.hidden, true);
  });

  it("filters cards by an inclusive publish date range", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const now = Date.UTC(2026, 4, 26, 0, 0, 0);

    ingestTikTokApiPayload({
      itemList: [
        {
          createTime: Math.floor(Date.UTC(2026, 4, 21, 12, 0, 0) / 1000),
          id: "9711111111",
          stats: { diggCount: 10000, playCount: 100000 },
          video: { duration: 70 },
        },
        {
          createTime: Math.floor(Date.UTC(2026, 4, 22, 12, 0, 0) / 1000),
          id: "9722222222",
          stats: { diggCount: 10000, playCount: 100000 },
          video: { duration: 70 },
        },
        {
          createTime: Math.floor(Date.UTC(2026, 4, 23, 12, 0, 0) / 1000),
          id: "9733333333",
          stats: { diggCount: 10000, playCount: 100000 },
          video: { duration: 70 },
        },
        {
          createTime: Math.floor(Date.UTC(2026, 4, 24, 12, 0, 0) / 1000),
          id: "9744444444",
          stats: { diggCount: 10000, playCount: 100000 },
          video: { duration: 70 },
        },
      ],
    });

    const { document, links } = createMetricsDocumentHarness({
      cards: [
        "https://www.tiktok.com/@demo/video/9711111111",
        "https://www.tiktok.com/@demo/video/9722222222",
        "https://www.tiktok.com/@demo/video/9733333333",
        "https://www.tiktok.com/@demo/video/9744444444",
      ],
      surface: "liked",
    });
    const overlay = createTikTokCardMetricsOverlay({
      document,
      now: () => now,
      setInterval: null,
    });

    overlay.refresh();
    overlay.setFilterCriteria({
      maxCreateDate: "2026-05-23",
      minCreateDate: "2026-05-22",
    });

    assert.equal(links[0].style.display, "none");
    assert.equal(links[1].style.display, "");
    assert.equal(links[2].style.display, "");
    assert.equal(links[3].style.display, "none");
    assert.equal(overlay.filterSummary.textContent.includes("2/4"), true);
  });

  it("loads more TikTok cards by temporarily scrolling the active page", async () => {
    const { createTikTokCardMetricsOverlay } = await loadCaptionCore();
    const { document } = createMetricsDocumentHarness({
      cards: ["https://www.tiktok.com/@demo/video/9811111111"],
      surface: "liked",
    });
    const scrollCalls = [];

    document.body.scrollHeight = 3000;
    document.defaultView.scrollX = 12;
    document.defaultView.scrollY = 340;
    document.defaultView.scrollTo = (options) => {
      scrollCalls.push(options);
    };
    document.defaultView.dispatchEvent = () => {};

    const overlay = createTikTokCardMetricsOverlay({
      document,
      setInterval: null,
      setTimeout: (callback) => {
        callback();
        return 1;
      },
    });

    overlay.refresh();
    findElementByText(document, "button", "加载更多").click();

    assert.deepEqual(scrollCalls, [
      { behavior: "instant", left: 0, top: 3000 },
      { behavior: "instant", left: 12, top: 340 },
    ]);
  });

  it("excludes TikTok cards by short, old, and non-English warning filters", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();
    const now = Date.UTC(2026, 4, 26, 0, 0, 0);
    const recentCreateTime = Math.floor((now - 2 * 3600000) / 1000);
    const oldCreateTime = Math.floor((now - 36 * 3600000) / 1000);

    ingestTikTokApiPayload({
      itemList: [
        {
          createTime: recentCreateTime,
          id: "9111111111",
          stats: {
            diggCount: 10000,
            playCount: 100000,
          },
          textLanguage: "eng-US",
          video: {
            duration: 75,
          },
        },
        {
          createTime: recentCreateTime,
          id: "9222222222",
          stats: {
            diggCount: 10000,
            playCount: 100000,
          },
          textLanguage: "eng-US",
          video: {
            duration: 45,
          },
        },
        {
          createTime: oldCreateTime,
          id: "9333333333",
          stats: {
            diggCount: 10000,
            playCount: 100000,
          },
          textLanguage: "eng-US",
          video: {
            duration: 75,
          },
        },
        {
          createTime: recentCreateTime,
          id: "9444444444",
          stats: {
            diggCount: 10000,
            playCount: 100000,
          },
          textLanguage: "es-ES",
          video: {
            duration: 75,
          },
        },
      ],
    });

    const { document, links } = createMetricsDocumentHarness({
      cards: [
        "https://www.tiktok.com/@demo/video/9111111111",
        "https://www.tiktok.com/@demo/video/9222222222",
        "https://www.tiktok.com/@demo/video/9333333333",
        "https://www.tiktok.com/@demo/video/9444444444",
      ],
      surface: "liked",
    });
    const overlay = createTikTokCardMetricsOverlay({
      document,
      now: () => now,
      setInterval: null,
    });

    overlay.refresh();
    overlay.setFilterCriteria({
      excludeNonEnglish: true,
      excludeOld: true,
      excludeShort: true,
    });

    assert.equal(links[0].style.display, "");
    assert.equal(links[1].style.display, "none");
    assert.equal(links[2].style.display, "none");
    assert.equal(links[3].style.display, "none");
    assert.equal(overlay.filterSummary.textContent.includes("1/4"), true);
  });

  it("does not render TikTok card metrics outside supported TikTok card surfaces", async () => {
    const {
      createTikTokCardMetricsOverlay,
      ingestTikTokApiPayload,
    } = await loadCaptionCore();

    ingestTikTokApiPayload({
      itemList: [
        {
          id: "3456789012",
          stats: {
            diggCount: 10,
            playCount: 100,
          },
          video: {
            duration: 9,
          },
        },
      ],
    });

    const { document, links } = createMetricsDocumentHarness({
      cards: ["https://www.tiktok.com/@demo/video/3456789012"],
      surface: "none",
    });
    const overlay = createTikTokCardMetricsOverlay({
      document,
      mutationObserverClass: null,
      setInterval: null,
    });

    assert.equal(overlay.refresh(), 0);
    assert.equal(
      links[0].children.some((child) => child.classList.contains("msj-tiktok-card-metrics")),
      false,
    );
  });
});
