import { AUTO_CLOSE_PREVIOUS_KEY } from "./tabLauncher.js";
import { SEARCH_TARGETS } from "./searchTargets.js";

export const TARGET_ORDER_KEY = "targetOrder";
export const ENABLED_TARGET_IDS_KEY = "enabledTargetIds";
export const GOOGLE_RECENT_24H_KEY = "googleRecent24Hours";
export const GOOGLE_SEARCH_TYPE_KEY = "googleSearchType";
export const TRANSLATE_CHINESE_TO_ENGLISH_KEY = "translateChineseToEnglish";

export const GOOGLE_SEARCH_TYPES = Object.freeze({
  WEB: "web",
  IMAGES: "images",
});

const DEFAULT_AUTO_CLOSE_PREVIOUS = true;
const DEFAULT_GOOGLE_RECENT_24H = false;
const DEFAULT_GOOGLE_SEARCH_TYPE = GOOGLE_SEARCH_TYPES.WEB;
const DEFAULT_TRANSLATE_CHINESE_TO_ENGLISH = false;
const DEFAULT_TARGET_ORDER = SEARCH_TARGETS.map((target) => target.id);
const DEFAULT_ENABLED_TARGET_IDS = ["google"];
const AUTO_ENABLE_ADDED_TARGET_IDS = new Set(["instagram", "reddit"]);
const LEGACY_GOOGLE_IMAGE_RECENT_24H_KEY = "googleImageRecent24Hours";
const VALID_TARGET_IDS = new Set(DEFAULT_TARGET_ORDER);

function normalizeTargetOrder(value) {
  const savedOrder = Array.isArray(value) ? value : [];
  const validSavedOrder = savedOrder.filter((id) => VALID_TARGET_IDS.has(id));

  return [
    ...validSavedOrder,
    ...DEFAULT_TARGET_ORDER.filter((id) => !validSavedOrder.includes(id)),
  ];
}

function normalizeEnabledTargetIds(value, targetOrder, savedTargetOrder = null) {
  const savedIds = Array.isArray(value) ? value : DEFAULT_ENABLED_TARGET_IDS;
  const enabledIds = new Set(savedIds.filter((id) => VALID_TARGET_IDS.has(id)));

  if (Array.isArray(value) && Array.isArray(savedTargetOrder)) {
    const missingTargetIds = DEFAULT_TARGET_ORDER.filter((id) => !savedTargetOrder.includes(id));
    const shouldEnableAddedTargets =
      missingTargetIds.length > 0
      && missingTargetIds.every((id) => AUTO_ENABLE_ADDED_TARGET_IDS.has(id));

    if (shouldEnableAddedTargets) {
      for (const id of missingTargetIds) {
        enabledIds.add(id);
      }
    }
  }

  return targetOrder.filter((id) => enabledIds.has(id));
}

function groupTargetOrderByEnabled(targetOrder, enabledTargetIds) {
  const enabledIds = new Set(enabledTargetIds);

  return [
    ...targetOrder.filter((id) => enabledIds.has(id)),
    ...targetOrder.filter((id) => !enabledIds.has(id)),
  ];
}

function toStoredSearchSettings(settings) {
  return {
    [AUTO_CLOSE_PREVIOUS_KEY]: settings.autoClosePrevious,
    [TARGET_ORDER_KEY]: settings.targetOrder,
    [ENABLED_TARGET_IDS_KEY]: settings.enabledTargetIds,
    [GOOGLE_RECENT_24H_KEY]: settings.googleRecent24Hours,
    [GOOGLE_SEARCH_TYPE_KEY]: settings.googleSearchType,
    [TRANSLATE_CHINESE_TO_ENGLISH_KEY]: settings.translateChineseToEnglish,
  };
}

function isSameStoredValue(currentValue, nextValue) {
  if (Array.isArray(nextValue)) {
    return (
      Array.isArray(currentValue) &&
      currentValue.length === nextValue.length &&
      currentValue.every((item, index) => item === nextValue[index])
    );
  }

  return currentValue === nextValue;
}

function shouldSaveNormalizedSettings(currentValues, nextValues) {
  return Object.entries(nextValues).some(
    ([key, value]) => !isSameStoredValue(currentValues[key], value),
  );
}

export function normalizeSearchSettings(value = {}) {
  const savedTargetOrder = value[TARGET_ORDER_KEY] ?? value.targetOrder;
  let targetOrder = normalizeTargetOrder(savedTargetOrder);
  let enabledTargetIds = normalizeEnabledTargetIds(
    value[ENABLED_TARGET_IDS_KEY] ?? value.enabledTargetIds,
    targetOrder,
    savedTargetOrder,
  );
  targetOrder = groupTargetOrderByEnabled(targetOrder, enabledTargetIds);
  enabledTargetIds = normalizeEnabledTargetIds(enabledTargetIds, targetOrder);
  const savedGoogleSearchType = value[GOOGLE_SEARCH_TYPE_KEY] ?? value.googleSearchType;
  const googleSearchType =
    savedGoogleSearchType === GOOGLE_SEARCH_TYPES.IMAGES ||
    savedGoogleSearchType === GOOGLE_SEARCH_TYPES.WEB
      ? savedGoogleSearchType
      : DEFAULT_GOOGLE_SEARCH_TYPE;
  const savedGoogleRecent24Hours =
    value[GOOGLE_RECENT_24H_KEY]
    ?? value.googleRecent24Hours
    ?? value[LEGACY_GOOGLE_IMAGE_RECENT_24H_KEY]
    ?? value.googleImageRecent24Hours;
  const googleRecent24Hours = typeof savedGoogleRecent24Hours === "boolean"
    ? savedGoogleRecent24Hours
    : DEFAULT_GOOGLE_RECENT_24H;
  const autoClosePrevious = typeof (value[AUTO_CLOSE_PREVIOUS_KEY] ?? value.autoClosePrevious) === "boolean"
    ? (value[AUTO_CLOSE_PREVIOUS_KEY] ?? value.autoClosePrevious)
    : DEFAULT_AUTO_CLOSE_PREVIOUS;
  const translateChineseToEnglish =
    typeof (value[TRANSLATE_CHINESE_TO_ENGLISH_KEY] ?? value.translateChineseToEnglish) === "boolean"
      ? (value[TRANSLATE_CHINESE_TO_ENGLISH_KEY] ?? value.translateChineseToEnglish)
      : DEFAULT_TRANSLATE_CHINESE_TO_ENGLISH;

  return {
    autoClosePrevious,
    enabledTargetIds,
    googleRecent24Hours,
    googleSearchType,
    targetOrder,
    translateChineseToEnglish,
  };
}

export async function getSearchSettings(storageArea) {
  const result = await storageArea.get([
    AUTO_CLOSE_PREVIOUS_KEY,
    TARGET_ORDER_KEY,
    ENABLED_TARGET_IDS_KEY,
    GOOGLE_RECENT_24H_KEY,
    LEGACY_GOOGLE_IMAGE_RECENT_24H_KEY,
    GOOGLE_SEARCH_TYPE_KEY,
    TRANSLATE_CHINESE_TO_ENGLISH_KEY,
  ]);

  const normalized = normalizeSearchSettings(result);
  const storedSettings = toStoredSearchSettings(normalized);

  if (shouldSaveNormalizedSettings(result, storedSettings)) {
    await storageArea.set(storedSettings);
  }

  return normalized;
}

export async function saveSearchSettings(storageArea, settings) {
  const normalized = normalizeSearchSettings(settings);

  await storageArea.set(toStoredSearchSettings(normalized));

  return normalized;
}
