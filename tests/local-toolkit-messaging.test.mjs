import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LOCAL_TOOLKIT_MESSAGE_NAME,
  handleLocalToolkitMessage,
  isLocalToolkitMessage,
} from "../extension/src/localToolkitMessaging.js";

function createStorageArea(initialValues = {}) {
  const values = { ...initialValues };

  return {
    values,
    async get(key) {
      return { [key]: values[key] };
    },
    async remove(key) {
      delete values[key];
    },
    async set(nextValues) {
      Object.assign(values, nextValues);
    },
  };
}

describe("local toolkit background messaging", () => {
  it("recognizes DataTool relay messages only by the local toolkit message name", () => {
    assert.equal(isLocalToolkitMessage({ name: LOCAL_TOOLKIT_MESSAGE_NAME }), true);
    assert.equal(isLocalToolkitMessage({ type: "OPEN_SEARCH_GROUP" }), false);
  });

  it("opens the unified download sites settings when the floating icon requests the popup", async () => {
    const createdTabs = [];
    const result = await handleLocalToolkitMessage(
      { name: LOCAL_TOOLKIT_MESSAGE_NAME, body: { action: "openPopup", data: {} } },
      {
        runtimeApi: {
          getURL(path) {
            return `chrome-extension://abc/${path}`;
          },
        },
        tabsApi: {
          async create(options) {
            createdTabs.push(options);
            return { id: 7, ...options };
          },
        },
      },
    );

    assert.deepEqual(createdTabs, [
      {
        active: true,
        url: "chrome-extension://abc/options/options.html#settings-download-sites",
      },
    ]);
    assert.deepEqual(result, { success: true });
  });

  it("returns extension id and reads/writes storage for platform scripts", async () => {
    const storageArea = createStorageArea({ dt_show_floating_icon: 1 });
    const runtimeApi = { id: "abc" };

    assert.equal(
      await handleLocalToolkitMessage(
        { name: LOCAL_TOOLKIT_MESSAGE_NAME, body: { action: "get_extension_id" } },
        { runtimeApi },
      ),
      "abc",
    );
    assert.equal(
      await handleLocalToolkitMessage(
        {
          name: LOCAL_TOOLKIT_MESSAGE_NAME,
          body: { action: "getStorage", data: { key: "dt_show_floating_icon" } },
        },
        { storageArea },
      ),
      1,
    );

    await handleLocalToolkitMessage(
      {
        name: LOCAL_TOOLKIT_MESSAGE_NAME,
        body: { action: "setStorage", data: { key: "dt_show_floating_icon", value: 0 } },
      },
      { storageArea },
    );

    assert.equal(storageArea.values.dt_show_floating_icon, 0);
  });

  it("downloads local toolkit media through chrome downloads with normalized names", async () => {
    const calls = [];
    const downloadsApi = {
      async download(options) {
        calls.push(options);
        return 42;
      },
    };

    const result = await handleLocalToolkitMessage(
      {
        name: LOCAL_TOOLKIT_MESSAGE_NAME,
        body: {
          action: "download",
          data: { fileName: "DataTool.mp4", url: "https://example.com/video.mp4" },
        },
      },
      { downloadsApi },
    );

    assert.deepEqual(calls, [
      {
        filename: "local-toolkit-download.mp4",
        saveAs: false,
        url: "https://example.com/video.mp4",
      },
    ]);
    assert.deepEqual(result, { downloadId: 42, success: true });
  });

  it("answers DataTool backend proxy calls locally and blocks cloud speech services", async () => {
    const userInfo = await handleLocalToolkitMessage(
      {
        name: LOCAL_TOOLKIT_MESSAGE_NAME,
        body: {
          action: "proxy",
          data: { method: "get", url: "https://www.datatool.vip/api/user/info" },
        },
      },
    );
    const cloud = await handleLocalToolkitMessage(
      {
        name: LOCAL_TOOLKIT_MESSAGE_NAME,
        body: {
          action: "proxy",
          data: { method: "post", url: "https://dashscope.aliyuncs.com/api/v1/services/audio/asr" },
        },
      },
    );

    assert.equal(userInfo.success, true);
    assert.equal(userInfo.data.email, "open-access@datatool.local");
    assert.equal(userInfo.data.access.unlimited, true);
    assert.equal(cloud.success, false);
    assert.equal(cloud.code, 451);
  });
});
