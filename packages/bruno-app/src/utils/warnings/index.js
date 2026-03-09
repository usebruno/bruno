export { validateItem, validateCollection } from './validate';
export { allRules } from './rules';

/**
 * Check whether a warning is dismissed, supporting both composite keys
 * (ruleId:location) and plain ruleId (blanket dismissal).
 */
const isWarningDismissed = (warning, dismissedSet) => {
  if (warning.location && dismissedSet.has(`${warning.ruleId}:${warning.location}`)) return true;
  return dismissedSet.has(warning.ruleId);
};

/**
 * Check whether any item in a subtree has active (non-dismissed) warnings.
 * Uses early return for efficiency.
 */
export const doesSubtreeHaveWarnings = (item) => {
  const dismissed = new Set(item.dismissedWarningRules || []);
  if (item.warnings?.some((w) => !isWarningDismissed(w, dismissed))) return true;
  return item.items?.some((child) => doesSubtreeHaveWarnings(child)) ?? false;
};

/**
 * Get active (non-dismissed) warnings for an item.
 */
export const getActiveWarnings = (item) => {
  if (!item?.warnings?.length) return [];
  const dismissed = new Set(item.dismissedWarningRules || []);
  return item.warnings.filter((w) => !isWarningDismissed(w, dismissed));
};

/**
 * Get active (non-dismissed) warnings for an item filtered to a specific location.
 */
export const getActiveWarningsForLocation = (item, location) => {
  return getActiveWarnings(item).filter((w) => w.location === location);
};

/**
 * Check whether an item has active warnings in any of the given locations.
 */
export const hasActiveWarningsForLocations = (item, locations) => {
  return getActiveWarnings(item).some((w) => locations.includes(w.location));
};
