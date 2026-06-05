import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  installLocalToolkitDownloadNaming,
  normalizeLocalToolkitDownloadFilename,
} from "../extension/src/localToolkitDownloadNames.js";

describe("local toolkit download naming", () => {
  it("saves downloads directly under the browser downloads folder", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename("cat-video.mp4"),
      "cat-video.mp4",
    );
  });

  it("replaces DataTool default names with a stable local toolkit fallback", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename("datatool.mp4"),
      "local-toolkit-download.mp4",
    );
    assert.equal(
      normalizeLocalToolkitDownloadFilename("DataTool.txt"),
      "local-toolkit-download.txt",
    );
  });

  it("sanitizes illegal filename characters while preserving Chinese titles and extensions", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename("TikTok/猫咪:视频?.mp4"),
      "TikTok/猫咪_视频_.mp4",
    );
  });

  it("uses a platform folder when platform metadata is available", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename({
        filename: "作品下载.xlsx",
        platform: "Xiaohongshu",
      }),
      "Xiaohongshu/作品下载.xlsx",
    );
  });

  it("removes hash-like filename residue and repeated timestamps", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename("TikTok_2026-06-02_2026-06-02_video.588cc70c.mp4"),
      "TikTok_2026-06-02_video.mp4",
    );
  });

  it("strips the old Multi Search Jump local toolkit folder from existing names", () => {
    const filename = "Multi Search Jump Local Toolkit/TikTok/video.mp4";

    assert.equal(normalizeLocalToolkitDownloadFilename(filename), "TikTok/video.mp4");
  });

  it("wraps chrome.downloads.download without changing callback behavior", async () => {
    const calls = [];
    const downloadsApi = {
      download(options, callback) {
        calls.push(options);
        callback?.(42);
        return Promise.resolve(42);
      },
    };

    installLocalToolkitDownloadNaming(downloadsApi);

    let callbackValue = null;
    const result = await downloadsApi.download(
      { filename: "datatool.mp4", url: "https://example.com/video.mp4" },
      (downloadId) => {
        callbackValue = downloadId;
      },
    );

    assert.equal(result, 42);
    assert.equal(callbackValue, 42);
    assert.deepEqual(calls, [
      {
        filename: "local-toolkit-download.mp4",
        url: "https://example.com/video.mp4",
      },
    ]);
  });
});
