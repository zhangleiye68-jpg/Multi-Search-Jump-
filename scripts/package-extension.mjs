import { execFile } from "node:child_process";
import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const EXTENSION_DISPLAY_NAME = "Multi Search Jump";
export const PACKAGE_FILE_NAME = `${EXTENSION_DISPLAY_NAME}.zip`;
export const DIST_DIR = "dist";
export const PACKAGE_WORK_DIR = join(DIST_DIR, "chrome-web-store");

export const EXTENSION_FILES = Object.freeze([
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "panel.html",
  "panel.css",
  "panel.js",
  "options.html",
  "options.css",
  "options.js",
  "queryTranslator.js",
  "searchHistory.js",
  "searchSettings.js",
  "searchTargets.js",
  "searchUi.js",
  "selectionSearch.js",
  "shortcutSettings.js",
  "tabLauncher.js",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
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

function collectManifestFiles(manifest) {
  return [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    manifest.options_ui?.page,
    manifest.side_panel?.default_path,
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
  ].filter(Boolean);
}

export async function readManifest(rootDir = process.cwd()) {
  return JSON.parse(await readFile(join(rootDir, "manifest.json"), "utf8"));
}

export function validateStoreManifest(manifest, packageFiles = EXTENSION_FILES) {
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
    if (!packageFiles.includes(file)) {
      errors.push(`manifest references ${file}, but it is not in the package allowlist.`);
    }
  }

  return errors;
}

export async function validateStoreSources(rootDir = process.cwd()) {
  const errors = [];

  for (const file of EXTENSION_FILES) {
    if (!/\.(?:html|js)$/u.test(file)) {
      continue;
    }

    const source = await readFile(join(rootDir, file), "utf8");

    for (const { pattern, message } of REMOTE_CODE_PATTERNS) {
      if (pattern.test(source)) {
        errors.push(`${file}: ${message}`);
      }
    }
  }

  return errors;
}

async function assertPackageFilesExist(rootDir) {
  const missingFiles = [];

  for (const file of EXTENSION_FILES) {
    try {
      await stat(join(rootDir, file));
    } catch {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(`Missing package files: ${missingFiles.join(", ")}`);
  }
}

async function copyPackageFiles(rootDir, packageWorkDir) {
  await rm(packageWorkDir, { force: true, recursive: true });
  await mkdir(packageWorkDir, { recursive: true });

  for (const file of EXTENSION_FILES) {
    const source = join(rootDir, file);
    const destination = join(packageWorkDir, file);

    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination);
  }
}

async function createZip(packageWorkDir) {
  const packagePath = join("..", PACKAGE_FILE_NAME);

  await rm(join(packageWorkDir, packagePath), { force: true });
  await execFileAsync("zip", ["-r", "-X", packagePath, "."], {
    cwd: packageWorkDir,
  });

  return join(DIST_DIR, PACKAGE_FILE_NAME);
}

export async function validateStorePackage(rootDir = process.cwd()) {
  await assertPackageFilesExist(rootDir);

  const manifest = await readManifest(rootDir);
  const errors = [
    ...validateStoreManifest(manifest),
    ...(await validateStoreSources(rootDir)),
  ];

  if (errors.length > 0) {
    throw new Error(`Store package validation failed:\n- ${errors.join("\n- ")}`);
  }
}

export async function buildStorePackage(rootDir = process.cwd()) {
  await validateStorePackage(rootDir);
  await copyPackageFiles(rootDir, join(rootDir, PACKAGE_WORK_DIR));
  return createZip(join(rootDir, PACKAGE_WORK_DIR));
}

async function main() {
  const rootDir = process.cwd();

  if (process.argv.includes("--check")) {
    await validateStorePackage(rootDir);
    console.log("Chrome Web Store package validation passed.");
    return;
  }

  const packagePath = await buildStorePackage(rootDir);
  console.log(`Created ${packagePath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
