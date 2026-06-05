(() => {
  const root = globalThis;
  const PATCH_KEY = "__DATATOOL_LOCAL_DOWNLOAD_UI_PATCH__";

  if (root[PATCH_KEY]?.installed) return;

  const DOWNLOAD_GREEN_THEME = {
    primary: "#16A34A",
    hover: "#15803D",
    light: "#DCFCE7",
    border: "#BBF7D0",
    text: "#166534"
  };

  const STYLE_ID = "msj-local-download-green-ui";
  const GREEN_DOWNLOAD_ICON_PATH = "assets/localToolkit/image/download-green.svg";
  const SURFACE_SELECTOR = [
    "#engage-csui-tt",
    ".dt-download-dropdown",
    ".dt-popper-class",
    ".overview_new_download_button",
    ".overview_download_button",
    ".ins-extension",
    ".x-extension",
    ".xhs-extension",
    ".bb-extension",
    ".yt-extension",
    ".dy-extension",
    ".tiktok-extension",
    ".batch-download-video-modal",
    ".batch-download-video-list-modal",
    ".batch-download-author-video-modal",
    ".ins-batch-download-video-modal",
    ".ins-batch-download-media-modal"
  ].join(",");
  const LEGACY_DOWNLOAD_ICON_SELECTOR = [
    'img[src*="/assets/localToolkit/image/tiktok.png" i]',
    'img[src*="/assets/localToolkit/image/dt.png" i]',
    'img[src*="/assets/localToolkit/image/datatool.png" i]'
  ].join(",");
  const UNUSED_BULK_DOWNLOAD_ENTRY_SELECTOR = [
    ".tiktok-user-btn-group",
    ".dy-comment-btn-group",
    ".dt-unused-bulk-download-entry"
  ].join(",");
  const FLOATING_DOWNLOAD_BUTTON_SELECTOR = [
    ".overview_new_download_button",
    ".overview_download_button",
    '[class*="download"][class*="button"]',
    '[class*="download"][class*="btn"]'
  ].join(",");
  const LEGACY_ACCENT_COLOR_PATTERN = /#?(?:3470ff|409eff|4986f9|7b68ee)\b/giu;
  const LEGACY_RGB_COLOR_PATTERN =
    /rgba?\(\s*(52\s*,\s*112\s*,\s*255|64\s*,\s*158\s*,\s*255|73\s*,\s*134\s*,\s*249|123\s*,\s*104\s*,\s*238)\s*(,\s*([^)]+))?\)/giu;
  const PAID_BADGE_PATTERN = new RegExp("^\\s*P" + "RO\\s*$", "iu");
  const PAID_TEXT_PATTERN = new RegExp("\\bP" + "RO\\b", "giu");
  const THEME_VARIABLES = [
    "--msj-download-green-primary",
    "--msj-download-green-hover",
    "--msj-download-green-light",
    "--msj-download-green-border",
    "--msj-download-green-text",
    "--el-color-primary",
    "--el-color-primary-light-3",
    "--el-color-primary-light-5",
    "--el-color-primary-light-7",
    "--el-color-primary-light-9",
    "--el-color-primary-dark-2",
    "--ins-color-primary",
    "--ins-color-primary-dark",
    "--ins-color-primary-dark-1",
    "--ins-color-primary-text",
    "--ins-color-primary-border",
    "--x-color-primary",
    "--x-color-primary-dark",
    "--x-color-primary-dark-1",
    "--x-color-primary-text",
    "--x-color-primary-border",
    "--xhs-color-primary",
    "--xhs-color-primary-dark",
    "--xhs-color-primary-dark-1",
    "--xhs-color-primary-text",
    "--xhs-color-primary-border",
    "--bb-color-primary",
    "--bb-color-primary-dark",
    "--bb-color-primary-dark-1",
    "--bb-color-primary-text",
    "--bb-color-primary-border",
    "--yt-color-primary",
    "--yt-color-primary-dark",
    "--yt-color-primary-dark-1",
    "--yt-color-primary-text",
    "--yt-color-primary-border",
    "--dy-color-primary",
    "--dy-color-primary-dark",
    "--dy-color-primary-dark-1",
    "--dy-color-primary-text",
    "--dy-color-primary-border",
    "--dy--color-primary",
    "--dy--color-primary-dark",
    "--dy--color-primary-dark-1",
    "--dy--color-primary-text",
    "--dy--color-primary-border",
    "--tiktok-color-primary",
    "--tiktok-color-primary-dark",
    "--tiktok-color-primary-dark-1",
    "--tiktok-color-primary-text",
    "--tiktok-color-primary-border"
  ];

  function themeValueForVariable(name) {
    if (name.endsWith("dark")) return DOWNLOAD_GREEN_THEME.light;
    if (name.endsWith("dark-1")) return DOWNLOAD_GREEN_THEME.border;
    if (name.endsWith("text") || name.endsWith("border")) return DOWNLOAD_GREEN_THEME.text;
    if (name.includes("light-9")) return DOWNLOAD_GREEN_THEME.light;
    if (name.includes("light-7") || name.includes("light-5") || name.includes("light-3")) {
      return DOWNLOAD_GREEN_THEME.border;
    }
    if (name.includes("dark-2")) return DOWNLOAD_GREEN_THEME.hover;
    if (name.endsWith("hover")) return DOWNLOAD_GREEN_THEME.hover;
    return DOWNLOAD_GREEN_THEME.primary;
  }

  const DOWNLOAD_GREEN_STYLE = `
:host,
:root,
#engage-csui-tt,
.dt-download-dropdown,
.ins-extension,
.x-extension,
.xhs-extension,
.bb-extension,
.yt-extension,
.dy-extension,
.tiktok-extension {
  --msj-download-green-primary: ${DOWNLOAD_GREEN_THEME.primary} !important;
  --msj-download-green-hover: ${DOWNLOAD_GREEN_THEME.hover} !important;
  --msj-download-green-light: ${DOWNLOAD_GREEN_THEME.light} !important;
  --msj-download-green-border: ${DOWNLOAD_GREEN_THEME.border} !important;
  --msj-download-green-text: ${DOWNLOAD_GREEN_THEME.text} !important;
}

.overview_new_download_button,
.overview_download_button {
  background-color: var(--msj-download-green-primary) !important;
  border-color: var(--msj-download-green-border) !important;
  color: #FFFFFF !important;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.28) !important;
}

.overview_new_download_button:hover,
.overview_new_download_button:focus,
.overview_download_button:hover,
.overview_download_button:focus {
  background-color: var(--msj-download-green-hover) !important;
  border-color: var(--msj-download-green-hover) !important;
}

.overview_new_download_button img,
.overview_download_button img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  border-radius: 50% !important;
  object-fit: cover !important;
}

.tiktok-user-btn-group,
.dy-comment-btn-group,
.dt-unused-bulk-download-entry {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.dt-download-dropdown [style*="4986f9" i],
.dt-download-dropdown [style*="409eff" i],
.dt-download-dropdown [style*="3470ff" i],
.dt-download-dropdown [style*="7b68ee" i] {
  background-color: var(--msj-download-green-primary) !important;
  border-color: var(--msj-download-green-primary) !important;
}

.dt-download-dropdown,
.dt-download-dropdown *,
.batch-download-video-modal,
.batch-download-video-modal *,
.batch-download-video-list-modal,
.batch-download-video-list-modal *,
.batch-download-author-video-modal,
.batch-download-author-video-modal *,
.ins-batch-download-video-modal,
.ins-batch-download-video-modal *,
.ins-batch-download-media-modal,
.ins-batch-download-media-modal * {
  scrollbar-color: var(--msj-download-green-primary) transparent;
}

.dt-download-dropdown [stroke*="3470ff" i],
.dt-download-dropdown [stroke*="409eff" i],
.dt-download-dropdown [stroke*="4986f9" i],
.dt-download-dropdown [stroke*="7b68ee" i],
[class*="batch-download"] [stroke*="3470ff" i],
[class*="batch-download"] [stroke*="409eff" i],
[class*="batch-download"] [stroke*="4986f9" i],
[class*="batch-download"] [stroke*="7b68ee" i] {
  stroke: var(--msj-download-green-primary) !important;
}

.dt-download-dropdown [fill*="3470ff" i],
.dt-download-dropdown [fill*="409eff" i],
.dt-download-dropdown [fill*="4986f9" i],
.dt-download-dropdown [fill*="7b68ee" i],
[class*="batch-download"] [fill*="3470ff" i],
[class*="batch-download"] [fill*="409eff" i],
[class*="batch-download"] [fill*="4986f9" i],
[class*="batch-download"] [fill*="7b68ee" i] {
  fill: var(--msj-download-green-primary) !important;
}

.batch-download-video-modal .el-drawer__header,
.ins-batch-download-video-modal .el-drawer__header,
.tiktok-button,
.ins-button,
.x-button,
.xhs-button,
.yt-button,
.dy-button {
  background-color: var(--msj-download-green-primary) !important;
  border-color: var(--msj-download-green-primary) !important;
}

.batch-download-video-modal .folder-progress-bar-inner,
.batch-download-video-modal .folder-progress-text {
  background-color: var(--msj-download-green-primary) !important;
  color: var(--msj-download-green-primary) !important;
}
`;

  function normalizeLocalToolkitQualityLabel(input) {
    if (input == null) return "";
    if (typeof input === "object") {
      const candidates = [
        input.resolution,
        input.quality,
        input.label,
        input.customName,
        input.name,
        input.width && input.height ? `${input.width}x${input.height}` : ""
      ];
      for (const candidate of candidates) {
        const normalized = normalizeLocalToolkitQualityLabel(candidate);
        if (normalized) return normalized;
      }
      return "";
    }

    const value = String(input).trim();
    const dimension = value.match(/\b(\d{3,5})\s*[x×]\s*(\d{3,5})\b/u);
    if (dimension) {
      const shortSide = Math.min(Number(dimension[1]), Number(dimension[2]));
      return shortSide > 0 ? `${shortSide}P` : "";
    }

    const pixelLabel = value.match(/\b([1-9]\d{2,3})\s*p\b/iu);
    if (pixelLabel) return `${Number(pixelLabel[1])}P`;

    const kLabel = value.match(/\b([248])\s*k\b/iu);
    if (kLabel) return `${kLabel[1]}K`;

    return "";
  }

  function normalizeDimensionText(text) {
    return String(text)
      .replace(/\b(\d{3,5})\s*[x×]\s*(\d{3,5})\b/gu, (match) => normalizeLocalToolkitQualityLabel(match) || match)
      .replace(/\b([1-9]\d{2,3})\s*p\b/giu, (_match, value) => `${Number(value)}P`)
      .replace(/\b([248])\s*k\b/giu, (_match, value) => `${value}K`);
  }

  function normalizeLocalToolkitDownloadText(text) {
    const raw = String(text ?? "");
    let value = raw
      .replace(PAID_TEXT_PATTERN, "")
      .replace(/\bmp4\s*\(\s*原画\s*\)/giu, "MP4")
      .replace(/下载\s*原画/gu, "下载视频")
      .replace(/原画/gu, "MP4")
      .replace(/\bmp4\b/giu, "MP4");

    value = normalizeDimensionText(value);
    return value
      .replace(/\(\s*\)/gu, "")
      .replace(/\s+\)/gu, ")")
      .replace(/\(\s+/gu, "(")
      .replace(/\s{2,}/gu, " ")
      .trim();
  }

  function normalizeDownloadOptionLabel(label) {
    return normalizeLocalToolkitDownloadText(label).replace(/\s{2,}/gu, " ").trim();
  }

  function isRedundantPlainMp4DownloadLabel(label) {
    return normalizeDownloadOptionLabel(label).toUpperCase() === "MP4";
  }

  function isQualityMp4DownloadLabel(label) {
    const normalized = normalizeDownloadOptionLabel(label);
    return /^MP4\s*\(\s*(?:[1-9]\d{2,3}P|[248]K)\s*\)$/u.test(normalized) ||
      /^MP4\s+(?:[1-9]\d{2,3}P|[248]K)$/u.test(normalized);
  }

  function filterRedundantPlainMp4DownloadLabels(labels) {
    if (!Array.isArray(labels)) return [];
    if (!labels.some((label) => isQualityMp4DownloadLabel(label))) return labels.slice();

    let removedFirstPlainMp4 = false;
    return labels.filter((label) => {
      if (!removedFirstPlainMp4 && isRedundantPlainMp4DownloadLabel(label)) {
        removedFirstPlainMp4 = true;
        return false;
      }
      return true;
    });
  }

  function isUnusedBulkDownloadEntrypointText(text) {
    const normalized = String(text || "").replace(/\s+/gu, " ").trim().toLowerCase();
    if (!normalized) return false;
    return [
      "batch download",
      "comment download",
      "comments download",
      "download data",
      "get all comments",
      "获取评论",
      "自动获取评论",
      "评论下载",
      "批量下载"
    ].some((label) => normalized.includes(label.toLowerCase()));
  }

  function shouldReplaceLegacyDownloadIconSrc(currentSrc = "", hasFloatingDownloadButton = false) {
    if (!hasFloatingDownloadButton) return false;
    return /\/assets\/localToolkit\/image\/(?:tiktok|dt|datatool)\.png(?:[?#].*)?$/iu.test(String(currentSrc || ""));
  }

  function queryAll(rootNode, selector) {
    try {
      return rootNode?.querySelectorAll ? Array.from(rootNode.querySelectorAll(selector)) : [];
    } catch {
      return [];
    }
  }

  function resolveGreenDownloadIconUrl(currentSrc = "") {
    const runtime = root.chrome?.runtime || root.browser?.runtime;
    const runtimeUrl = runtime?.getURL?.(GREEN_DOWNLOAD_ICON_PATH);
    if (runtimeUrl) return runtimeUrl;

    const source = String(currentSrc || "");
    const replaced = source.replace(
      /assets\/localToolkit\/image\/(?:tiktok|dt|datatool)\.png(?:[?#].*)?$/iu,
      GREEN_DOWNLOAD_ICON_PATH
    );
    return replaced !== source ? replaced : "";
  }

  function findFloatingDownloadButton(element) {
    let current = element;
    for (let depth = 0; current && depth < 8; depth += 1) {
      if (current.matches?.(FLOATING_DOWNLOAD_BUTTON_SELECTOR)) return current;
      const className = String(current.getAttribute?.("class") || "");
      if (/(^|\s)(?:overview_new_download_button|overview_download_button)(?:\s|$)/u.test(className) ||
        /\b(?:single[-_])?download[-_\w]*(?:button|btn)\b/iu.test(className)) {
        return current;
      }
      current = current.parentElement || current.host;
    }
    return null;
  }

  function styleFloatingDownloadButton(element) {
    if (!element?.style) return;
    element.style.setProperty("background-color", DOWNLOAD_GREEN_THEME.primary, "important");
    element.style.setProperty("border-color", DOWNLOAD_GREEN_THEME.border, "important");
    element.style.setProperty("color", "#FFFFFF", "important");
    element.style.setProperty("box-shadow", "0 2px 8px rgba(22, 163, 74, 0.28)", "important");
  }

  function replaceLocalToolkitFloatingIcon(rootNode) {
    let changed = false;
    for (const surface of collectDownloadSurfaces(rootNode)) {
      if (surface.matches?.(FLOATING_DOWNLOAD_BUTTON_SELECTOR)) styleFloatingDownloadButton(surface);
      for (const button of queryAll(surface, FLOATING_DOWNLOAD_BUTTON_SELECTOR)) {
        styleFloatingDownloadButton(button);
      }

      for (const image of queryAll(surface, LEGACY_DOWNLOAD_ICON_SELECTOR)) {
        const currentSrc = image.currentSrc || image.getAttribute?.("src") || image.src || "";
        const downloadButton = findFloatingDownloadButton(image);
        if (!shouldReplaceLegacyDownloadIconSrc(currentSrc, Boolean(downloadButton))) continue;

        const replacementUrl = resolveGreenDownloadIconUrl(currentSrc);
        if (replacementUrl && image.getAttribute?.("src") !== replacementUrl) {
          image.setAttribute("src", replacementUrl);
          changed = true;
        }
        if (image.style) {
          image.style.setProperty("display", "block", "important");
          image.style.setProperty("width", "100%", "important");
          image.style.setProperty("height", "100%", "important");
          image.style.setProperty("border-radius", "50%", "important");
          image.style.setProperty("object-fit", "cover", "important");
        }
        styleFloatingDownloadButton(downloadButton);
      }
    }
    return changed;
  }

  function replaceLegacyColor(value) {
    return String(value)
      .replace(LEGACY_ACCENT_COLOR_PATTERN, DOWNLOAD_GREEN_THEME.primary)
      .replace(LEGACY_RGB_COLOR_PATTERN, (_match, _rgb, alphaGroup, alphaValue) => {
        if (alphaGroup) return `rgba(22, 163, 74, ${String(alphaValue).trim()})`;
        return "rgb(22, 163, 74)";
      });
  }

  function hasLegacyColor(value) {
    LEGACY_ACCENT_COLOR_PATTERN.lastIndex = 0;
    LEGACY_RGB_COLOR_PATTERN.lastIndex = 0;
    const matched = LEGACY_ACCENT_COLOR_PATTERN.test(value) || LEGACY_RGB_COLOR_PATTERN.test(value);
    LEGACY_ACCENT_COLOR_PATTERN.lastIndex = 0;
    LEGACY_RGB_COLOR_PATTERN.lastIndex = 0;
    return matched;
  }

  function setThemeVariables(element) {
    if (!element?.style) return;
    for (const name of THEME_VARIABLES) {
      element.style.setProperty(name, themeValueForVariable(name), "important");
    }
  }

  function installGreenStyle(rootNode) {
    if (!rootNode?.querySelector || rootNode.querySelector(`#${STYLE_ID}`)) return;

    const doc = rootNode.ownerDocument || rootNode;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = DOWNLOAD_GREEN_STYLE;

    if (rootNode.nodeType === 11) {
      rootNode.prepend(style);
      return;
    }

    const target = doc.head || doc.documentElement;
    target?.appendChild(style);
  }

  function collectDownloadSurfaces(rootNode) {
    const surfaces = [];
    if (!rootNode) return surfaces;

    if (rootNode.nodeType === 11 && rootNode.host?.matches?.(SURFACE_SELECTOR)) {
      surfaces.push(rootNode);
    }
    if (rootNode.matches?.(SURFACE_SELECTOR)) surfaces.push(rootNode);
    surfaces.push(...queryAll(rootNode, SURFACE_SELECTOR));
    return Array.from(new Set(surfaces));
  }

  function stripLocalToolkitProBadges(rootNode) {
    let changed = false;
    for (const surface of collectDownloadSurfaces(rootNode)) {
      for (const element of queryAll(surface, "span, i, em, b, strong, div")) {
        if (PAID_BADGE_PATTERN.test(element.textContent || "") && element.children.length === 0) {
          element.remove();
          changed = true;
        }
      }
    }
    return changed;
  }

  function removeElement(element) {
    if (!element?.remove) return false;
    element.remove();
    return true;
  }

  function isSmallEntrypointElement(element) {
    const text = String(element?.textContent || "").replace(/\s+/gu, " ").trim();
    if (!text || text.length > 80) return false;
    if (element.matches?.(UNUSED_BULK_DOWNLOAD_ENTRY_SELECTOR)) return true;
    const className = String(element.getAttribute?.("class") || "");
    return /(btn|button|dropdown|group|download|comment)/iu.test(className) ||
      element.matches?.("button,a,[role='button'],[role='menuitem']") ||
      Boolean(element.querySelector?.("img"));
  }

  function findUnusedBulkDownloadEntrypoint(element) {
    let current = element;
    for (let depth = 0; current && depth < 5; depth += 1) {
      if (current.matches?.(UNUSED_BULK_DOWNLOAD_ENTRY_SELECTOR)) return current;
      if (isSmallEntrypointElement(current) && isUnusedBulkDownloadEntrypointText(current.textContent)) return current;
      current = current.parentElement || current.host;
    }
    return null;
  }

  function removeUnusedBulkDownloadEntrypoints(rootNode) {
    let changed = false;
    const entries = new Set();

    if (rootNode?.matches?.(UNUSED_BULK_DOWNLOAD_ENTRY_SELECTOR)) entries.add(rootNode);
    for (const element of queryAll(rootNode, UNUSED_BULK_DOWNLOAD_ENTRY_SELECTOR)) {
      entries.add(element);
    }

    for (const element of queryAll(rootNode, "button, a, [role='button'], [role='menuitem'], div, span")) {
      if (!isUnusedBulkDownloadEntrypointText(element.textContent)) continue;
      const entry = findUnusedBulkDownloadEntrypoint(element);
      if (entry) entries.add(entry);
    }

    for (const entry of entries) {
      changed = removeElement(entry) || changed;
    }
    return changed;
  }

  function normalizedElementDownloadLabel(element) {
    return normalizeDownloadOptionLabel(element?.textContent || "");
  }

  function findDownloadOptionRow(element, surface) {
    let row = element;
    let current = element;
    const label = normalizedElementDownloadLabel(element);

    for (let depth = 0; current?.parentElement && depth < 5; depth += 1) {
      const parent = current.parentElement;
      if (parent === surface || parent.matches?.(SURFACE_SELECTOR)) break;
      if (normalizedElementDownloadLabel(parent) !== label) break;
      row = parent;
      current = parent;
    }

    return row;
  }

  function collectDownloadOptionRows(surface) {
    const rows = [];
    const seen = new Set();

    for (const element of [surface, ...queryAll(surface, "*")]) {
      const label = normalizedElementDownloadLabel(element);
      if (!isRedundantPlainMp4DownloadLabel(label) && !isQualityMp4DownloadLabel(label)) continue;

      const row = findDownloadOptionRow(element, surface);
      if (!row || seen.has(row)) continue;
      seen.add(row);
      rows.push({ element: row, label: normalizedElementDownloadLabel(row) || label });
    }

    return rows;
  }

  function removeRedundantPlainMp4Options(rootNode) {
    let changed = false;
    for (const surface of collectDownloadSurfaces(rootNode)) {
      const rows = collectDownloadOptionRows(surface);
      if (!rows.some(({ label }) => isQualityMp4DownloadLabel(label))) continue;

      const redundantRow = rows.find(({ label }) => isRedundantPlainMp4DownloadLabel(label));
      if (!redundantRow?.element?.remove) continue;
      redundantRow.element.remove();
      changed = true;
    }
    return changed;
  }

  function normalizeDownloadTextNodes(rootNode) {
    for (const surface of collectDownloadSurfaces(rootNode)) {
      const doc = surface.ownerDocument || root.document;
      if (!doc?.createTreeWalker) continue;

      const walker = doc.createTreeWalker(surface, 4);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|TEXTAREA)$/u.test(parent.tagName)) continue;
        const current = node.nodeValue || "";
        if (!/(原画|\d{3,5}\s*[x×]\s*\d{3,5}|\d{3,4}\s*p\b|[248]\s*k\b)/iu.test(current) &&
          !PAID_TEXT_PATTERN.test(current)) {
          continue;
        }
        PAID_TEXT_PATTERN.lastIndex = 0;
        const normalized = normalizeLocalToolkitDownloadText(current);
        if (normalized !== current.trim()) node.nodeValue = normalized ? normalized : "";
      }
    }
  }

  function recolorInlineStyles(rootNode) {
    for (const surface of collectDownloadSurfaces(rootNode)) {
      setThemeVariables(surface.host || surface);
      for (const element of queryAll(surface, "*")) {
        setThemeVariables(element);

        const style = element.getAttribute?.("style");
        if (style && hasLegacyColor(style)) {
          element.setAttribute("style", replaceLegacyColor(style));
        }

        for (const attr of ["stroke", "fill"]) {
          const value = element.getAttribute?.(attr);
          if (value && hasLegacyColor(value)) {
            element.setAttribute(attr, replaceLegacyColor(value));
          }
        }
      }
    }
  }

  function collectOpenRoots(doc) {
    const roots = [];
    const seen = new Set();
    const enqueue = (item) => {
      if (!item || seen.has(item)) return;
      seen.add(item);
      roots.push(item);
    };

    enqueue(doc);
    for (let index = 0; index < roots.length; index += 1) {
      for (const element of queryAll(roots[index], "*")) {
        if (element.shadowRoot) enqueue(element.shadowRoot);
      }
    }
    return roots;
  }

  function patchRoot(rootNode) {
    installGreenStyle(rootNode);
    if (rootNode.documentElement) setThemeVariables(rootNode.documentElement);
    if (rootNode.body) setThemeVariables(rootNode.body);
    if (rootNode.host) setThemeVariables(rootNode.host);
    removeUnusedBulkDownloadEntrypoints(rootNode);
    recolorInlineStyles(rootNode);
    replaceLocalToolkitFloatingIcon(rootNode);
    stripLocalToolkitProBadges(rootNode);
    normalizeDownloadTextNodes(rootNode);
    removeRedundantPlainMp4Options(rootNode);
  }

  function patchAllOpenRoots() {
    const doc = root.document;
    if (!doc) return;
    for (const openRoot of collectOpenRoots(doc)) patchRoot(openRoot);
  }

  function installOpenAccessDownloadGuards() {
    const blockedDialog = () => null;
    const legacyDialogName = ["open", "Donate", "Dialog"].join("");
    try {
      Object.defineProperty(root, legacyDialogName, {
        configurable: true,
        get: () => blockedDialog,
        set: () => {}
      });
    } catch {
      root[legacyDialogName] = blockedDialog;
    }
  }

  function installLocalToolkitDownloadUiPatch() {
    installOpenAccessDownloadGuards();
    if (!root.document) return;

    let queued = false;
    const schedulePatch = () => {
      if (queued) return;
      queued = true;
      const schedule = root.requestAnimationFrame || ((callback) => setTimeout(callback, 0));
      schedule(() => {
        queued = false;
        patchAllOpenRoots();
      });
    };

    schedulePatch();
    root.document.addEventListener?.("DOMContentLoaded", schedulePatch, { once: true });
    root.addEventListener?.("load", schedulePatch, { once: true });

    if (root.MutationObserver) {
      const observer = new root.MutationObserver(schedulePatch);
      observer.observe(root.document.documentElement || root.document, {
        attributes: true,
        attributeFilter: ["class", "style", "stroke", "fill", "src"],
        characterData: true,
        childList: true,
        subtree: true
      });
    }
  }

  root[PATCH_KEY] = {
    installed: true,
    DOWNLOAD_GREEN_THEME,
    normalizeLocalToolkitQualityLabel,
    normalizeLocalToolkitDownloadText,
    isRedundantPlainMp4DownloadLabel,
    isQualityMp4DownloadLabel,
    filterRedundantPlainMp4DownloadLabels,
    isUnusedBulkDownloadEntrypointText,
    shouldReplaceLegacyDownloadIconSrc,
    resolveGreenDownloadIconUrl,
    replaceLegacyDownloadColor: replaceLegacyColor,
    removeUnusedBulkDownloadEntrypoints,
    replaceLocalToolkitFloatingIcon,
    stripLocalToolkitProBadges,
    installOpenAccessDownloadGuards,
    installLocalToolkitDownloadUiPatch,
    patchAllOpenRoots
  };

  installLocalToolkitDownloadUiPatch();
})();
