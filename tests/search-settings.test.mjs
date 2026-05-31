import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ENABLED_TARGET_IDS_KEY,
  GOOGLE_RECENT_24H_KEY,
  GOOGLE_SEARCH_TYPE_KEY,
  TARGET_ORDER_KEY,
  TRANSLATE_CHINESE_TO_ENGLISH_KEY,
  getSearchSettings,
  saveSearchSettings,
} from "../extension/src/searchSettings.js";
import { AUTO_CLOSE_PREVIOUS_KEY } from "../extension/src/tabLauncher.js";

function createStorageArea(initialValues = {}) {
  const values = { ...initialValues };

  return {
    values,
    async get(keys) {
      return Object.fromEntries(keys.map((key) => [key, values[key]]));
    },
    async set(nextValues) {
      Object.assign(values, nextValues);
    },
  };
}

describe("search settings", () => {
  const allTargetIds = [
    "google",
    "x",
    "facebook",
    "tiktok",
    "instagram",
    "reddit",
    "xiaohongshu",
    "douyin",
    "weibo",
    "zhihu",
    "bilibili",
  ];

  it("defaults to auto-close, all sites enabled, configured order, and Google images", async () => {
    const settings = await getSearchSettings(createStorageArea());

    assert.deepEqual(settings, {
      autoClosePrevious: true,
      enabledTargetIds: allTargetIds,
      googleRecent24Hours: true,
      googleSearchType: "images",
      targetOrder: allTargetIds,
      translateChineseToEnglish: false,
    });
  });

  it("persists search settings to chrome storage keys", async () => {
    const storageArea = createStorageArea();

    await saveSearchSettings(storageArea, {
      autoClosePrevious: false,
      enabledTargetIds: ["facebook", "google"],
      googleRecent24Hours: false,
      googleSearchType: "web",
      targetOrder: [
        "facebook",
        "google",
        "x",
        "tiktok",
        "instagram",
        "reddit",
        "xiaohongshu",
        "douyin",
        "weibo",
        "zhihu",
        "bilibili",
      ],
      translateChineseToEnglish: true,
    });

    assert.deepEqual(storageArea.values, {
      [AUTO_CLOSE_PREVIOUS_KEY]: false,
      [ENABLED_TARGET_IDS_KEY]: ["facebook", "google"],
      [GOOGLE_RECENT_24H_KEY]: false,
      [GOOGLE_SEARCH_TYPE_KEY]: "web",
      [TARGET_ORDER_KEY]: [
        "facebook",
        "google",
        "x",
        "tiktok",
        "instagram",
        "reddit",
        "xiaohongshu",
        "douyin",
        "weibo",
        "zhihu",
        "bilibili",
      ],
      [TRANSLATE_CHINESE_TO_ENGLISH_KEY]: true,
    });
  });

  it("migrates the older image-only Google 24 hours setting", async () => {
    const storageArea = createStorageArea({
      googleImageRecent24Hours: false,
    });
    const settings = await getSearchSettings(storageArea);

    assert.equal(settings.googleRecent24Hours, false);
    assert.equal(storageArea.values[GOOGLE_RECENT_24H_KEY], false);
  });

  it("keeps enabled targets before disabled targets when saving order", async () => {
    const storageArea = createStorageArea();

    await saveSearchSettings(storageArea, {
      enabledTargetIds: ["google", "tiktok"],
      targetOrder: [
        "weibo",
        "tiktok",
        "google",
        "x",
        "instagram",
        "reddit",
        "facebook",
        "xiaohongshu",
        "douyin",
        "zhihu",
        "bilibili",
      ],
    });

    assert.deepEqual(storageArea.values[TARGET_ORDER_KEY], [
      "tiktok",
      "google",
      "weibo",
      "x",
      "instagram",
      "reddit",
      "facebook",
      "xiaohongshu",
      "douyin",
      "zhihu",
      "bilibili",
    ]);
    assert.deepEqual(storageArea.values[ENABLED_TARGET_IDS_KEY], ["tiktok", "google"]);
  });

  it("enables newly added targets when normalizing older saved settings", async () => {
    const storageArea = createStorageArea({
      [ENABLED_TARGET_IDS_KEY]: [
        "google",
        "x",
        "facebook",
        "tiktok",
        "xiaohongshu",
        "douyin",
        "weibo",
        "zhihu",
        "bilibili",
      ],
      [TARGET_ORDER_KEY]: [
        "google",
        "x",
        "facebook",
        "tiktok",
        "xiaohongshu",
        "douyin",
        "weibo",
        "zhihu",
        "bilibili",
      ],
    });
    const settings = await getSearchSettings(storageArea);

    assert.equal(settings.enabledTargetIds.includes("instagram"), true);
    assert.equal(settings.enabledTargetIds.includes("reddit"), true);
    assert.deepEqual(storageArea.values[ENABLED_TARGET_IDS_KEY], settings.enabledTargetIds);
    assert.deepEqual(storageArea.values[TARGET_ORDER_KEY], settings.targetOrder);
  });
});
