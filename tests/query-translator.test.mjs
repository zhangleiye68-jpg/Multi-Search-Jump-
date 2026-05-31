import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  containsChinese,
  translateChineseQueryToEnglish,
  translateChineseQueryWithGoogle,
  translateQueryForSearch,
} from "../extension/src/queryTranslator.js";

describe("query translator", () => {
  it("detects Chinese text before translating", () => {
    assert.equal(containsChinese("红色 dress"), true);
    assert.equal(containsChinese("red dress"), false);
  });

  it("returns the original query when translation is disabled or unnecessary", async () => {
    let calls = 0;
    const translatorApi = {
      async create() {
        calls += 1;
        return {
          async translate() {
            return "red dress";
          },
        };
      },
    };

    assert.equal(
      await translateQueryForSearch("红色连衣裙", {
        enabled: false,
        translatorApi,
      }),
      "红色连衣裙",
    );
    assert.equal(
      await translateQueryForSearch("red dress", {
        enabled: true,
        translatorApi,
      }),
      "red dress",
    );
    assert.equal(calls, 0);
  });

  it("translates Chinese queries to English with Chrome Translator", async () => {
    const calls = [];
    const translatorApi = {
      async create(options) {
        calls.push(options);
        return {
          async translate(query) {
            assert.equal(query, "红色连衣裙");
            return " red dress ";
          },
        };
      },
    };

    assert.equal(
      await translateChineseQueryToEnglish("红色连衣裙", translatorApi),
      "red dress",
    );
    assert.deepEqual(calls, [{ sourceLanguage: "zh", targetLanguage: "en" }]);
  });

  it("falls back to the original query when all translation paths fail", async () => {
    const translatorApi = {
      async create() {
        throw new Error("not available");
      },
    };
    const fetchApi = async () => {
      throw new Error("network unavailable");
    };

    assert.equal(
      await translateQueryForSearch("红色连衣裙", {
        enabled: true,
        fetchApi,
        translatorApi,
      }),
      "红色连衣裙",
    );
  });

  it("uses Google web translation when Chrome Translator is unavailable", async () => {
    const requests = [];
    const fetchApi = async (url) => {
      requests.push(url);

      return {
        ok: true,
        async json() {
          return [[[ "red dress", "红色连衣裙" ]]];
        },
      };
    };

    assert.equal(
      await translateQueryForSearch("红色连衣裙", {
        enabled: true,
        fetchApi,
        translatorApi: null,
      }),
      "red dress",
    );
    assert.equal(requests.length, 1);
    assert.match(requests[0], /^https:\/\/translate\.googleapis\.com\/translate_a\/single\?/);
  });

  it("parses Google web translation response chunks", async () => {
    const fetchApi = async () => ({
      ok: true,
      async json() {
        return [
          [
            ["red ", "红色"],
            ["dress", "连衣裙"],
          ],
        ];
      },
    });

    assert.equal(await translateChineseQueryWithGoogle("红色连衣裙", fetchApi), "red dress");
  });
});
