import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSearchUrls, SEARCH_TARGETS } from "../extension/src/searchTargets.js";

describe("search targets", () => {
  it("defines the required search platforms in order", () => {
    assert.deepEqual(
      SEARCH_TARGETS.map((target) => target.name),
      [
        "Google",
        "X",
        "Facebook",
        "TikTok",
        "Instagram",
        "Reddit",
        "小红书",
        "抖音",
        "微博",
        "知乎",
        "哔哩哔哩",
      ],
    );
  });

  it("builds the default Google web search URL for a query", () => {
    assert.deepEqual(buildSearchUrls("人工智能 写作"), [
      "https://www.google.com/search?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
    ]);
  });

  it("builds encoded search result URLs for every configured target", () => {
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

    assert.deepEqual(buildSearchUrls("人工智能 写作", {
      enabledTargetIds: allTargetIds,
      googleSearchType: "images",
      googleRecent24Hours: true,
      targetOrder: allTargetIds,
    }), [
      "https://www.google.com/search?tbm=isch&tbs=qdr:d&q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://x.com/search?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C&src=typed_query",
      "https://www.facebook.com/search/top/?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://www.tiktok.com/search?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://www.instagram.com/explore/search/keyword/?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://www.reddit.com/search/?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://www.xiaohongshu.com/search_result?keyword=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://www.douyin.com/search/%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C?type=general",
      "https://s.weibo.com/weibo?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://www.zhihu.com/search?type=content&q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://search.bilibili.com/all?keyword=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
    ]);
  });

  it("can switch Google from image search to regular search", () => {
    assert.equal(
      buildSearchUrls("ai", {
        enabledTargetIds: ["google"],
        googleRecent24Hours: true,
        googleSearchType: "web",
      })[0],
      "https://www.google.com/search?tbs=qdr:d&q=ai",
    );
  });

  it("can use Google search without the recent 24 hours filter", () => {
    assert.equal(
      buildSearchUrls("ai", {
        enabledTargetIds: ["google"],
        googleRecent24Hours: false,
        googleSearchType: "images",
      })[0],
      "https://www.google.com/search?tbm=isch&q=ai",
    );
    assert.equal(
      buildSearchUrls("ai", {
        enabledTargetIds: ["google"],
        googleRecent24Hours: false,
        googleSearchType: "web",
      })[0],
      "https://www.google.com/search?q=ai",
    );
  });

  it("uses the configured site order and enabled sites", () => {
    assert.deepEqual(
      buildSearchUrls("ai", {
        enabledTargetIds: ["facebook", "google"],
        googleRecent24Hours: true,
        googleSearchType: "web",
        targetOrder: ["facebook", "x", "google", "tiktok"],
      }),
      [
        "https://www.facebook.com/search/top/?q=ai",
        "https://www.google.com/search?tbs=qdr:d&q=ai",
      ],
    );
  });

  it("does not build URLs for blank input", () => {
    assert.deepEqual(buildSearchUrls("   "), []);
  });
});
