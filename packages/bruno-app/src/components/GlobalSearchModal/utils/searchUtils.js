import React from 'react';
import { SEARCH_TYPES, MATCH_TYPES } from '../constants';

export const normalizeQuery = (searchQuery) => {
  return searchQuery.trim().replace(/\/+/g, '/');
};

export const isValidQuery = (normalizedQuery) => {
  return normalizedQuery
    && normalizedQuery !== '/'
    && !(normalizedQuery.length === 1 && !normalizedQuery.match(/[a-zA-Z0-9]/));
};

export const highlightText = (text, searchQuery) => {
  if (!searchQuery) return text;

  try {
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="highlight">{part}</span>
      ) : part
    );
  } catch {
    return text;
  }
};

export const sortResults = (results) => {
  return results.sort((a, b) => {
    // Documentation always first
    if (a.type === SEARCH_TYPES.DOCUMENTATION) return -1;
    if (b.type === SEARCH_TYPES.DOCUMENTATION) return 1;

    // Sort by match type priority
    const matchTypeOrder = {
      [MATCH_TYPES.COLLECTION]: 0,
      [MATCH_TYPES.FOLDER]: 1,
      [MATCH_TYPES.REQUEST]: 2,
      [MATCH_TYPES.URL]: 3,
      [MATCH_TYPES.PATH]: 4
    };
    const aMatchType = matchTypeOrder[a.matchType] ?? 5;
    const bMatchType = matchTypeOrder[b.matchType] ?? 5;

    if (aMatchType !== bMatchType) return aMatchType - bMatchType;

    // Sort by type priority
    const typeOrder = {
      [SEARCH_TYPES.COLLECTION]: 0,
      [SEARCH_TYPES.FOLDER]: 1,
      [SEARCH_TYPES.REQUEST]: 2
    };
    const aType = typeOrder[a.type] ?? 3;
    const bType = typeOrder[b.type] ?? 3;

    if (aType !== bType) return aType - bType;

    // Finally sort alphabetically
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
};

export const getTypeLabel = (type) => {
  const baseLabels = {
    [SEARCH_TYPES.DOCUMENTATION]: 'Documentation',
    [SEARCH_TYPES.COLLECTION]: 'Collection',
    [SEARCH_TYPES.FOLDER]: 'Folder'
  };

  return baseLabels[type] || '';
};

/**
 * Every item in a collection paired with its display path, built in one walk.
 *
 * Replaces a per-item `getItemPath` that climbed to the root calling
 * `findParentItemInCollection` at each level — and that helper flattens the whole collection on
 * every call. Computing it for each item made searching a collection quadratic in its size
 * (items x depth x items), which a workspace-wide search multiplied by the number of collections.
 * Here each item is visited once and its path is its parent's path plus its own name.
 *
 * @returns {Array<{ item: Object, path: string }>} in the tree's own order
 */
export const flattenItemsWithPaths = (collection) => {
  const entries = [];

  const visit = (items = [], parentPath) => {
    for (const item of items) {
      const path = `${parentPath}/${item.name}`;
      entries.push({ item, path });
      if (item.items?.length) visit(item.items, path);
    }
  };

  visit(collection.items, collection.name);
  return entries;
};
