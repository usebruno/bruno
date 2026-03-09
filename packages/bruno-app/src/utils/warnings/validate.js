import { allRules } from './rules';

/**
 * Run all rules against a single item (request or folder).
 * Returns Warning[].
 */
export const validateItem = (item, rules = allRules) => {
  if (!item) return [];
  const warnings = [];
  for (const rule of rules) {
    const ruleWarnings = rule.validate(item);
    if (ruleWarnings?.length) {
      warnings.push(...ruleWarnings);
    }
  }
  return warnings;
};

/**
 * Validate a "collection root" by creating a synthetic folder-like object
 * so rules can check collection.root.request.script.
 */
const validateCollectionRoot = (collection, rules = allRules) => {
  if (!collection?.root?.request?.script) return [];
  // Wrap as a folder so rules check root.request.script
  const syntheticItem = { type: 'folder', root: collection.root };
  return validateItem(syntheticItem, rules);
};

/**
 * Walk all items in a collection and validate each.
 * Returns a map of { [uid]: Warning[] } for items that have warnings.
 * Collection root warnings are keyed by collection.uid.
 */
export const validateCollection = (collection, rules = allRules) => {
  const warningsMap = {};

  // Check collection-level root scripts
  const rootWarnings = validateCollectionRoot(collection, rules);
  if (rootWarnings.length > 0) {
    warningsMap[collection.uid] = rootWarnings;
  }

  const walkItems = (items) => {
    if (!items || !Array.isArray(items)) return;

    for (const item of items) {
      const itemWarnings = validateItem(item, rules);
      if (itemWarnings.length > 0) {
        warningsMap[item.uid] = itemWarnings;
      }
      if (item.type === 'folder' && item.items) {
        walkItems(item.items);
      }
    }
  };

  walkItems(collection.items);
  return warningsMap;
};
