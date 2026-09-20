import { useMemo } from 'react';
import { groupItemsBySidebarOrder } from 'utils/collections';

/**
 * One level of the sidebar tree, filtered by the active search and split into the three groups the
 * sidebar renders.
 *
 * Filtering belongs here rather than inside each row: a CollectionItem runs around forty hooks —
 * twenty store subscriptions between its own selectors and its keybindings, plus drag and drop
 * registration — before it could decide it is not a match. Searching a large workspace would pay
 * all of that for every request in it. Rows outside the index are never created.
 *
 * @param {Array} items - the level's items
 * @param {Object} options
 * @param {boolean} options.hasSearchText - whether a search is active
 * @param {Set<string>} options.searchIndex - uids a search leaves visible, from buildSidebarSearchIndex
 */
const NO_ITEMS = [];

const useVisibleSidebarItems = (items, { hasSearchText, searchIndex, skip = false }) => {
  const visibleItems = useMemo(() => {
    // `skip` is the virtualised search list, where every descendant is already a row of its own.
    // Without it a folder row would filter and sort its entire subtree only to render none of it.
    if (skip) return NO_ITEMS;
    return hasSearchText ? (items || []).filter((item) => searchIndex.has(item.uid)) : items;
  }, [items, hasSearchText, searchIndex, skip]);

  return useMemo(() => groupItemsBySidebarOrder(visibleItems), [visibleItems]);
};

export default useVisibleSidebarItems;
