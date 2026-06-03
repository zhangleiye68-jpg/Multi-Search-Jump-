import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const EXTENSION_DISPLAY_NAME = "Multi Search Jump";
export const EXTENSION_DIR = "extension";

const BASE_EXTENSION_FILES = Object.freeze([
  "manifest.json",
  "src/background.js",
  "src/localToolkitDownloadNames.js",
  "src/localToolkitUi.js",
  "src/queryTranslator.js",
  "src/searchHistory.js",
  "src/searchSettings.js",
  "src/searchTargets.js",
  "src/searchUi.js",
  "src/selectionSearch.js",
  "src/shortcutSettings.js",
  "src/tabLauncher.js",
  "src/tiktokCaptionBridge.js",
  "src/tiktokCaptionContent.js",
  "src/tiktokCaptionCore.js",
  "src/tiktokCaptionOverlay.css",
  "popup/popup.html",
  "popup/popup.css",
  "popup/popup.js",
  "options/options.html",
  "options/options.css",
  "options/options.js",
  "side-panel/panel.html",
  "side-panel/panel.css",
  "side-panel/panel.js",
  "assets/icons/icon16.png",
  "assets/icons/icon48.png",
  "assets/icons/icon128.png",
]);

const LOCAL_TOOLKIT_FILES = Object.freeze([
  "rules/localToolkitBackendBlock.json",
  "src/localToolkit/localToolkitBackground.js",
  "src/localToolkit/localToolkitContent.js",
  "src/localToolkit/localToolkitContent.css",
  "src/localToolkit/localToolkitContentElements.css",
  "src/localToolkit/localToolkitFreeMode.js",
  "src/localToolkit/localToolkitPageBridge.js",
  "src/localToolkit/localToolkitRelay.js",
  "src/localToolkit/platforms/platformAiChat.js",
  "src/localToolkit/platforms/platformBilibili.js",
  "src/localToolkit/platforms/platformCommon.js",
  "src/localToolkit/platforms/platformDouyin.js",
  "src/localToolkit/platforms/platformFacebook.js",
  "src/localToolkit/platforms/platformInstagram.js",
  "src/localToolkit/platforms/platformKuaishou.js",
  "src/localToolkit/platforms/platformKwai.js",
  "src/localToolkit/platforms/platformSharedButtons.js",
  "src/localToolkit/platforms/platformTaobao.js",
  "src/localToolkit/platforms/platformTikTok.js",
  "src/localToolkit/platforms/platformVimeo.js",
  "src/localToolkit/platforms/platformX.js",
  "src/localToolkit/platforms/platformXiaohongshu.js",
  "src/localToolkit/platforms/platformXinpianchang.js",
  "src/localToolkit/platforms/platformYouTube.js",
  "assets/localToolkit/ffmpeg/814.ffmpeg.js",
  "assets/localToolkit/ffmpeg/ffmpeg-core.js",
  "assets/localToolkit/ffmpeg/ffmpeg-core.wasm",
  "assets/localToolkit/ffmpeg/ffmpeg-worker.js",
  "assets/localToolkit/image/audio.png",
  "assets/localToolkit/image/datatool.png",
  "assets/localToolkit/image/dt.png",
  "assets/localToolkit/image/googleIcon.png",
  "assets/localToolkit/image/mute.png",
  "assets/localToolkit/image/tiktok.png",
  "assets/localToolkit/js/ext.js",
]);

export const EXTENSION_FILES = Object.freeze([
  ...BASE_EXTENSION_FILES,
  ...LOCAL_TOOLKIT_FILES,
]);

const REMOTE_CODE_PATTERNS = Object.freeze([
  {
    pattern: /<script\b[^>]+src=["']https?:\/\//iu,
    message: "HTML must not load remote script files.",
  },
  {
    pattern: /\beval\s*\(/u,
    message: "Extension code must not use eval().",
  },
  {
    pattern: /\bnew\s+Function\s*\(/u,
    message: "Extension code must not construct functions from strings.",
  },
  {
    pattern: /\bimportScripts\s*\(\s*["']https?:\/\//iu,
    message: "Extension service workers must not import remote scripts.",
  },
]);

function extensionRoot(rootDir) {
  return join(rootDir, EXTENSION_DIR);
}

function collectManifestFiles(manifest) {
  const contentScriptFiles = (manifest.content_scripts ?? [])
    .flatMap((script) => [
      ...(script.js ?? []),
      ...(script.css ?? []),
    ]);
  const ruleResourceFiles = (manifest.declarative_net_request?.rule_resources ?? [])
    .map((rule) => rule.path);
  const webAccessibleFiles = (manifest.web_accessible_resources ?? [])
    .flatMap((entry) => entry.resources ?? [])
    .filter((resource) => !resource.includes("*"));

  return [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    manifest.options_ui?.page,
    manifest.side_panel?.default_path,
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
    ...contentScriptFiles,
    ...ruleResourceFiles,
    ...webAccessibleFiles,
  ].filter(Boolean);
}

export async function readManifest(rootDir = process.cwd()) {
  return JSON.parse(await readFile(join(extensionRoot(rootDir), "manifest.json"), "utf8"));
}

export function validateStoreManifest(manifest, extensionFiles = EXTENSION_FILES) {
  const errors = [];

  if (manifest.manifest_version !== 3) {
    errors.push("manifest_version must be 3 for Chrome Web Store submission.");
  }

  if (manifest.name !== EXTENSION_DISPLAY_NAME) {
    errors.push(`manifest name must be ${EXTENSION_DISPLAY_NAME}.`);
  }

  if (!manifest.description?.trim()) {
    errors.push("manifest description must be present.");
  }

  if (!manifest.icons?.["128"]) {
    errors.push("manifest must include a 128x128 extension icon.");
  }

  for (const file of collectManifestFiles(manifest)) {
    if (!extensionFiles.includes(file)) {
      errors.push(`manifest references ${file}, but it is not in ${EXTENSION_DIR}.`);
    }
  }

  return errors;
}

export async function validateStoreSources(rootDir = process.cwd()) {
  const errors = [];
  const root = extensionRoot(rootDir);

  for (const file of EXTENSION_FILES) {
    if (!/\.(?:html|js)$/u.test(file)) {
      continue;
    }

    const source = await readFile(join(root, file), "utf8");

    for (const { pattern, message } of REMOTE_CODE_PATTERNS) {
      if (pattern.test(source)) {
        errors.push(`${file}: ${message}`);
      }
    }
  }

  return errors;
}

async function assertExtensionFilesExist(rootDir) {
  const root = extensionRoot(rootDir);
  const missingFiles = [];

  for (const file of EXTENSION_FILES) {
    try {
      await stat(join(root, file));
    } catch {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(`Missing extension files: ${missingFiles.join(", ")}`);
  }
}

export async function validateStoreStructure(rootDir = process.cwd()) {
  await assertExtensionFilesExist(rootDir);

  const manifest = await readManifest(rootDir);
  const errors = [
    ...validateStoreManifest(manifest),
    ...(await validateStoreSources(rootDir)),
  ];

  if (errors.length > 0) {
    throw new Error(`Chrome extension structure validation failed:\n- ${errors.join("\n- ")}`);
  }
}

async function main() {
  await validateStoreStructure(process.cwd());
  console.log("Chrome extension structure validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
