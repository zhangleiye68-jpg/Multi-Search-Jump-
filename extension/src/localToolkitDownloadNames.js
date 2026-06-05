export const LOCAL_TOOLKIT_DOWNLOAD_DIR = "Multi Search Jump Local Toolkit";

const DEFAULT_LOCAL_TOOLKIT_BASENAME = "local-toolkit-download";
const INSTALLED_FLAG = "__multiSearchJumpLocalToolkitDownloadNamingInstalled";
const ORIGINAL_DOWNLOAD = "__multiSearchJumpOriginalDownload";

function getFilenameFromUrl(url) {
  if (!url) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);
    return decodeURIComponent(parsedUrl.pathname.split("/").filter(Boolean).at(-1) ?? "");
  } catch {
    return "";
  }
}

function getRawFilename(input) {
  if (typeof input === "string") {
    return input;
  }

  if (!input || typeof input !== "object") {
    return "";
  }

  return input.filename || input.suggestedFilename || getFilenameFromUrl(input.url);
}

function getPlatformName(input) {
  if (!input || typeof input !== "object") {
    return "";
  }

  return input.platform || input.platformName || input.dpCode || input.dp_code || "";
}

function removeDataToolWords(value) {
  return value
    .replace(/data[\s._-]*tool/giu, "")
    .replace(/datatool/giu, "");
}

function collapseRepeatedTimestamps(value) {
  return value
    .replace(/(\d{4}[-_]\d{2}[-_]\d{2}[-_ ]\d{2}[-_:]\d{2}(?:[-_:]\d{2})?)(?:[-_ ]+\1)+/gu, "$1")
    .replace(/(\d{4}[-_]\d{2}[-_]\d{2})(?:[-_ ]+\1)+/gu, "$1");
}

function sanitizeSegment(value) {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/gu, "_")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/^[. ]+|[. ]+$/gu, "");
}

function splitExtension(filename) {
  const match = filename.match(/^(?<stem>.*?)(?<extension>\.[A-Za-z0-9]{1,10})$/u);

  if (!match?.groups || !match.groups.stem) {
    return {
      extension: "",
      stem: filename,
    };
  }

  return {
    extension: match.groups.extension,
    stem: match.groups.stem,
  };
}

function hasMeaningfulFilenameText(value) {
  return /[\p{L}\p{N}]/u.test(value);
}

function normalizeLastSegment(segment) {
  const safeSegment = sanitizeSegment(segment);
  const { extension, stem } = splitExtension(safeSegment);
  const cleanedStem = collapseRepeatedTimestamps(removeDataToolWords(stem))
    .replace(/[._-][a-f0-9]{8,}$/iu, "")
    .trim();
  const basename = hasMeaningfulFilenameText(cleanedStem)
    ? cleanedStem
    : DEFAULT_LOCAL_TOOLKIT_BASENAME;

  return `${basename}${extension}`;
}

function normalizePathSegment(segment) {
  const cleanedSegment = collapseRepeatedTimestamps(removeDataToolWords(sanitizeSegment(segment)));

  if (!hasMeaningfulFilenameText(cleanedSegment)) {
    return "";
  }

  return cleanedSegment;
}

function normalizePathParts(input) {
  const rawFilename = String(getRawFilename(input) ?? "").trim();

  if (rawFilename.startsWith(`${LOCAL_TOOLKIT_DOWNLOAD_DIR}/`)) {
    return rawFilename.split("/").slice(1);
  }

  const rawParts = rawFilename.split(/[\\/]+/u).filter(Boolean);
  const lastRawPart = rawParts.pop() ?? "";
  const normalizedParts = rawParts
    .map(normalizePathSegment)
    .filter(Boolean);
  const platformName = normalizePathSegment(getPlatformName(input));

  if (platformName && normalizedParts[0]?.toLowerCase() !== platformName.toLowerCase()) {
    normalizedParts.unshift(platformName);
  }

  normalizedParts.push(normalizeLastSegment(lastRawPart));

  return normalizedParts;
}

export function normalizeLocalToolkitDownloadFilename(input = "") {
  return normalizePathParts(input).join("/");
}

export function installLocalToolkitDownloadNaming(downloadsApi = globalThis.chrome?.downloads) {
  if (!downloadsApi || typeof downloadsApi.download !== "function") {
    return null;
  }

  if (downloadsApi[INSTALLED_FLAG]) {
    return downloadsApi[ORIGINAL_DOWNLOAD] ?? downloadsApi.download;
  }

  const originalDownload = downloadsApi.download.bind(downloadsApi);

  downloadsApi.download = function downloadWithLocalToolkitNaming(options, callback) {
    if (!options || typeof options !== "object") {
      return originalDownload(options, callback);
    }

    return originalDownload(
      {
        ...options,
        filename: normalizeLocalToolkitDownloadFilename(options),
      },
      callback,
    );
  };

  try {
    Object.defineProperties(downloadsApi, {
      [INSTALLED_FLAG]: {
        value: true,
      },
      [ORIGINAL_DOWNLOAD]: {
        value: originalDownload,
      },
    });
  } catch {
    downloadsApi[INSTALLED_FLAG] = true;
    downloadsApi[ORIGINAL_DOWNLOAD] = originalDownload;
  }

  return originalDownload;
}
