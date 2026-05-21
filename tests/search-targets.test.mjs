import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSearchUrls, SEARCH_TARGETS } from "../searchTargets.js";

describe("search targets", () => {
  it("defines the four required search platforms in order", () => {
    assert.deepEqual(
      SEARCH_TARGETS.map((target) => target.name),
      ["Google", "X", "Facebook", "TikTok"],
    );
  });

  it("builds encoded search result URLs for a query", () => {
    assert.deepEqual(buildSearchUrls("人工智能 写作"), [
      "https://www.google.com/search?tbm=isch&q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://x.com/search?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C&src=typed_query",
      "https://www.facebook.com/search/top/?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
      "https://www.tiktok.com/search?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%20%E5%86%99%E4%BD%9C",
    ]);
  });

  it("can switch Google from image search to regular search", () => {
    assert.equal(
      buildSearchUrls("ai", { googleSearchType: "web" })[0],
      "https://www.google.com/search?q=ai",
    );
  });

  it("uses the configured site order and enabled sites", () => {
    assert.deepEqual(
      buildSearchUrls("ai", {
        enabledTargetIds: ["facebook", "google"],
        googleSearchType: "web",
        targetOrder: ["facebook", "x", "google", "tiktok"],
      }),
      [
        "https://www.facebook.com/search/top/?q=ai",
        "https://www.google.com/search?q=ai",
      ],
    );
  });

  it("does not build URLs for blank input", () => {
    assert.deepEqual(buildSearchUrls("   "), []);
  });
});
