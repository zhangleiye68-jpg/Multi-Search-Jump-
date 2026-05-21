import { AUTO_CLOSE_PREVIOUS_KEY } from "./tabLauncher.js";
import { SEARCH_TARGETS } from "./searchTargets.js";

export const TARGET_ORDER_KEY = "targetOrder";
export const ENABLED_TARGET_IDS_KEY = "enabledTargetIds";
export const GOOGLE_SEARCH_TYPE_KEY = "googleSearchType";

export const GOOGLE_SEARCH_TYPES = Object.freeze({
  WEB: "web",
  IMAGES: "images",
});

const DEFAULT_AUTO_CLOSE_PREVIOUS = true;
const DEFAULT_GOOGLE_SEARCH_TYPE = GOOGLE_SEARCH_TYPES.IMAGES;
const DEFAULT_TARGET_ORDER = SEARCH_TARGETS.map((target) => target.id);
const VALID_TARGET_IDS = new Set(DEFAULT_TARGET_ORDER);

function normalizeTargetOrder(value) {
  const savedOrder = Array.isArray(value) ? value : [];
  const validSavedOrder = savedOrder.filter((id) => VALID_TARGET_IDS.has(id));

  return [
    ...validSavedOrder,
    ...DEFAULT_TARGET_ORDER.filter((id) => !validSavedOrder.includes(id)),
  ];
}

function normalizeEnabledTargetIds(value, targetOrder) {
  const savedIds = Array.isArray(value) ? value : DEFAULT_TARGET_ORDER;
  const enabledIds = new Set(savedIds.filter((id) => VALID_TARGET_IDS.has(id)));

  return targetOrder.filter((id) => enabledIds.has(id));
}

function groupTargetOrderByEnabled(targetOrder, enabledTargetIds) {
  const enabledIds = new Set(enabledTargetIds);

  return [
    ...targetOrder.filter((id) => enabledIds.has(id)),
    ...targetOrder.filter((id) => !enabledIds.has(id)),
  ];
}

export function normalizeSearchSettings(value = {}) {
  let targetOrder = normalizeTargetOrder(value[TARGET_ORDER_KEY] ?? value.targetOrder);
  let enabledTargetIds = normalizeEnabledTargetIds(
    value[ENABLED_TARGET_IDS_KEY] ?? value.enabledTargetIds,
    targetOrder,
  );
  targetOrder = groupTargetOrderByEnabled(targetOrder, enabledTargetIds);
  enabledTargetIds = normalizeEnabledTargetIds(enabledTargetIds, targetOrder);
  const googleSearchType =
    (value[GOOGLE_SEARCH_TYPE_KEY] ?? value.googleSearchType) === GOOGLE_SEARCH_TYPES.WEB
      ? GOOGLE_SEARCH_TYPES.WEB
      : DEFAULT_GOOGLE_SEARCH_TYPE;
  const autoClosePrevious = typeof (value[AUTO_CLOSE_PREVIOUS_KEY] ?? value.autoClosePrevious) === "boolean"
    ? (value[AUTO_CLOSE_PREVIOUS_KEY] ?? value.autoClosePrevious)
    : DEFAULT_AUTO_CLOSE_PREVIOUS;

  return {
    autoClosePrevious,
    enabledTargetIds,
    googleSearchType,
    targetOrder,
  };
}

export async function getSearchSettings(storageArea) {
  const result = await storageArea.get([
    AUTO_CLOSE_PREVIOUS_KEY,
    TARGET_ORDER_KEY,
    ENABLED_TARGET_IDS_KEY,
    GOOGLE_SEARCH_TYPE_KEY,
  ]);

  return normalizeSearchSettings(result);
}

export async function saveSearchSettings(storageArea, settings) {
  const normalized = normalizeSearchSettings(settings);

  await storageArea.set({
    [AUTO_CLOSE_PREVIOUS_KEY]: normalized.autoClosePrevious,
    [TARGET_ORDER_KEY]: normalized.targetOrder,
    [ENABLED_TARGET_IDS_KEY]: normalized.enabledTargetIds,
    [GOOGLE_SEARCH_TYPE_KEY]: normalized.googleSearchType,
  });

  return normalized;
}
