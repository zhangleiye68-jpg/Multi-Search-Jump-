import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LOCAL_TOOLKIT_DOWNLOAD_DIR,
  installLocalToolkitDownloadNaming,
  normalizeLocalToolkitDownloadFilename,
} from "../extension/src/localToolkitDownloadNames.js";

describe("local toolkit download naming", () => {
  it("keeps every download inside the Multi Search Jump local toolkit folder", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename("cat-video.mp4"),
      `${LOCAL_TOOLKIT_DOWNLOAD_DIR}/cat-video.mp4`,
    );
  });

  it("replaces DataTool default names with a stable local toolkit fallback", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename("datatool.mp4"),
      `${LOCAL_TOOLKIT_DOWNLOAD_DIR}/local-toolkit-download.mp4`,
    );
    assert.equal(
      normalizeLocalToolkitDownloadFilename("DataTool Local Free.txt"),
      `${LOCAL_TOOLKIT_DOWNLOAD_DIR}/local-toolkit-download.txt`,
    );
  });

  it("sanitizes illegal filename characters while preserving Chinese titles and extensions", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename("TikTok/猫咪:视频?.mp4"),
      `${LOCAL_TOOLKIT_DOWNLOAD_DIR}/TikTok/猫咪_视频_.mp4`,
    );
  });

  it("uses a platform folder when platform metadata is available", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename({
        filename: "作品下载.xlsx",
        platform: "Xiaohongshu",
      }),
      `${LOCAL_TOOLKIT_DOWNLOAD_DIR}/Xiaohongshu/作品下载.xlsx`,
    );
  });

  it("removes hash-like filename residue and repeated timestamps", () => {
    assert.equal(
      normalizeLocalToolkitDownloadFilename("TikTok_2026-06-02_2026-06-02_video.588cc70c.mp4"),
      `${LOCAL_TOOLKIT_DOWNLOAD_DIR}/TikTok_2026-06-02_video.mp4`,
    );
  });

  it("does not double-prefix names that are already normalized", () => {
    const filename = `${LOCAL_TOOLKIT_DOWNLOAD_DIR}/TikTok/video.mp4`;

    assert.equal(normalizeLocalToolkitDownloadFilename(filename), filename);
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
        filename: `${LOCAL_TOOLKIT_DOWNLOAD_DIR}/local-toolkit-download.mp4`,
        url: "https://example.com/video.mp4",
      },
    ]);
  });
});
