import { isItemAFolder, isItemARequest } from './index';

/**
 * Whitespace-separated terms, all of which must match. Same rule the global search modal applies,
 * so typing the same thing in either place selects the same requests.
 */
const toSearchTerms = (searchText = '') => searchText.toLowerCase().split(/\s+/).filter(Boolean);

const includesAllTerms = (value, terms) => {
  const haystack = (value || '').toLowerCase();
  return terms.every((term) => haystack.includes(term));
};

/**
 * Matches a request on its name or its url. Url matters because the endpoint is often the only part
 * a user remembers, and it is on the tree node even for a request that has never been opened.
 */
const matchesTerms = (request, terms) =>
  includesAllTerms(request?.name, terms) || includesAllTerms(request?.request?.url, terms);

/**
 * The uids the sidebar shows for a search term: every request that matches, plus the folders and
 * the collection above it.
 *
 * Built once per search term rather than per row. Visibility used to be decided during render —
 * each folder called `flattenItems` over its own subtree on every render, so a nested tree walked
 * the same nodes once per level of depth, on every keystroke. Here one pass marks everything and a
 * row's visibility becomes a Set lookup.
 *
 * An empty set means "no search is active"; callers check `searchText` before consulting it.
 */
export const buildSidebarSearchIndex = (collections = [], searchText = '') => {
  const visibleUids = new Set();
  const terms = toSearchTerms(searchText);
  if (!terms.length) return visibleUids;

  // Ancestors of the node being visited. Kept as one array pushed and popped through the walk so a
  // match can mark its whole path without rebuilding it.
  const ancestorUids = [];

  const visit = (items = []) => {
    for (const item of items) {
      if (item.isTransient) continue;

      if (isItemAFolder(item)) {
        ancestorUids.push(item.uid);
        visit(item.items);
        ancestorUids.pop();
      } else if (isItemARequest(item) && matchesTerms(item, terms)) {
        // Marking the whole path is what makes a folder visible: it is in the index exactly when
        // something beneath it matched.
        ancestorUids.forEach((uid) => visibleUids.add(uid));
        visibleUids.add(item.uid);
      }
    }
  };

  for (const collection of collections) {
    ancestorUids.push(collection.uid);
    visit(collection.items);
    ancestorUids.pop();
  }

  return visibleUids;
};
