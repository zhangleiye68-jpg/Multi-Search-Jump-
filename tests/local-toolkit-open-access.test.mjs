import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { describe, it } from "node:test";

import { createLocalToolkitBackendPayload } from "../extension/src/localToolkitMessaging.js";

const FREE_MODE_FILE = "extension/src/localToolkit/localToolkitFreeMode.js";
const MESSAGING_FILE = "extension/src/localToolkitMessaging.js";
const SHARED_BUTTONS_FILE = "extension/src/localToolkit/platforms/platformSharedButtons.js";
const UI_PATCH_FILE = "extension/src/localToolkit/localToolkitDownloadUiPatch.js";

const LEGACY_ENTITLEMENT_TEXT = /Local Free|local-free|2099-12-31|999999999|vip_ttl|vip_date_end/u;
const LEGACY_QUOTA_KEYS = [
  "balance",
  "remaining",
  "remaining_seconds",
  "remainingSeconds",
  "daily_free_seconds",
  "dailyGiftSeconds",
  "quota",
];

async function loadFreeModeRoot() {
  const source = await readFile(FREE_MODE_FILE, "utf8");
  const context = vm.createContext({
    console,
    Event,
    Response,
    URL,
    setTimeout,
    globalThis: {
      fetch: async () => new Response(JSON.stringify({ passthrough: true })),
    },
  });

  vm.runInContext(source, context, { filename: FREE_MODE_FILE });
  return context.globalThis;
}

describe("local toolkit open access model", () => {
  it("uses neutral local user and response text without fake VIP dates or huge quotas", async () => {
    for (const file of [FREE_MODE_FILE, MESSAGING_FILE]) {
      const source = await readFile(file, "utf8");

      assert.doesNotMatch(source, LEGACY_ENTITLEMENT_TEXT, `${file} keeps legacy entitlement text`);
    }

    const userInfo = createLocalToolkitBackendPayload("https://www.datatool.vip/api/user/info");

    assert.equal(userInfo.success, true);
    assert.equal(userInfo.data.id, "local-open");
    assert.equal(userInfo.data.name, "Open Access");
    assert.equal(userInfo.data.access.unlimited, true);
    assert.equal(userInfo.data.access.localOnly, true);
    assert.equal("vip_ttl" in userInfo.data, false);
    assert.equal("vip_date_end" in userInfo.data, false);
  });

  it("answers entitlement endpoints as unrestricted open access without balance shapes", async () => {
    const endpoints = [
      "https://www.datatool.vip/api/benefit/check-benefits",
      "https://www.datatool.vip/api/benefit/get-benefit-balance/video_to_text",
      "https://www.datatool.vip/api/benefit/reduce-benefits",
      "https://www.datatool.vip/api/credits/deduction",
    ];

    for (const url of endpoints) {
      const payload = createLocalToolkitBackendPayload(url);

      assert.equal(payload.success, true, `${url} should remain open`);
      assert.equal(payload.data.allowed, true, `${url} should be allowed`);
      assert.equal(payload.data.unlimited, true, `${url} should be unlimited`);
      assert.equal(payload.data.localOnly, true, `${url} should be local-only`);
      assert.equal(payload.data.reduced, false, `${url} should not deduct`);

      for (const key of LEGACY_QUOTA_KEYS) {
        assert.equal(key in payload.data, false, `${url} should not expose ${key}`);
      }
    }
  });

  it("free mode fetch returns the same unrestricted local access shape", async () => {
    const root = await loadFreeModeRoot();
    const benefit = await root
      .fetch("https://www.datatool.vip/api/benefit/check-benefits")
      .then((response) => response.json());
    const balance = await root
      .fetch("https://www.datatool.vip/api/benefit/get-benefit-balance/video_to_text")
      .then((response) => response.json());
    const originalParse = await root
      .fetch("https://www.datatool.vip/api/video/parse-original-video")
      .then((response) => response.json());

    assert.equal(benefit.data.unlimited, true);
    assert.equal(balance.data.unlimited, true);
    assert.equal(originalParse.data.localOnly, true);
    assert.doesNotMatch(JSON.stringify({ benefit, balance, originalParse }), LEGACY_ENTITLEMENT_TEXT);
  });

  it("removes paid gates and paid wording from download surfaces", async () => {
    const sharedButtons = await readFile(SHARED_BUTTONS_FILE, "utf8");
    const uiPatch = await readFile(UI_PATCH_FILE, "utf8");

    assert.doesNotMatch(sharedButtons, /showProTag:!0|openDonateDialog|\bPRO\b|捐赠|权益不足|额度不足|解锁原画/u);
    assert.doesNotMatch(uiPatch, /free|pay|pricing|donation-center|openDonateDialog/u);
    assert.match(uiPatch, /installOpenAccessDownloadGuards/);
  });
});
