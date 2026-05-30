import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ENABLED_TARGET_IDS_KEY,
  GOOGLE_SEARCH_TYPE_KEY,
  TARGET_ORDER_KEY,
  TRANSLATE_CHINESE_TO_ENGLISH_KEY,
  getSearchSettings,
  saveSearchSettings,
} from "../searchSettings.js";
import { AUTO_CLOSE_PREVIOUS_KEY } from "../tabLauncher.js";

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
      googleSearchType: "web",
      targetOrder: ["facebook", "google", "x", "tiktok"],
      translateChineseToEnglish: true,
    });

    assert.deepEqual(storageArea.values, {
      [AUTO_CLOSE_PREVIOUS_KEY]: false,
      [ENABLED_TARGET_IDS_KEY]: ["facebook", "google"],
      [GOOGLE_SEARCH_TYPE_KEY]: "web",
      [TARGET_ORDER_KEY]: [
        "facebook",
        "google",
        "x",
        "tiktok",
        "xiaohongshu",
        "douyin",
        "weibo",
        "zhihu",
        "bilibili",
      ],
      [TRANSLATE_CHINESE_TO_ENGLISH_KEY]: true,
    });
  });

  it("keeps enabled targets before disabled targets when saving order", async () => {
    const storageArea = createStorageArea();

    await saveSearchSettings(storageArea, {
      enabledTargetIds: ["google", "tiktok"],
      targetOrder: ["weibo", "tiktok", "google", "x"],
    });

    assert.deepEqual(storageArea.values[TARGET_ORDER_KEY], [
      "tiktok",
      "google",
      "weibo",
      "x",
      "facebook",
      "xiaohongshu",
      "douyin",
      "zhihu",
      "bilibili",
    ]);
    assert.deepEqual(storageArea.values[ENABLED_TARGET_IDS_KEY], ["tiktok", "google"]);
  });
});
