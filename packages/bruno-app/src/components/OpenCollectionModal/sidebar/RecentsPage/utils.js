import { toPathKey } from 'providers/ReduxStore/slices/open-collection-modal/collection-paths';

const byNewestFirst = (a, b) => b.usedAt - a.usedAt;

const getOpenedAt = (recent, importedAt) => (recent?.lastEvent === 'opened' ? Math.max(recent.usedAt, importedAt) : importedAt);

export const isSameOpenCollections = (previous, next) =>
  previous.length === next.length
  && previous.every((collection, index) =>
    collection.pathname === next[index].pathname
    && collection.name === next[index].name
    && collection.importedAt === next[index].importedAt);

export const mergeOpenCollections = (recents, openCollections) => {
  const recentsByKey = new Map(recents.map((recent) => [toPathKey(recent.path), recent]));
  const openKeys = openCollections.map((collection) => toPathKey(collection.pathname));
  const openPathKeys = new Set(openKeys);

  const open = openCollections
    .map((collection, index) => ({
      path: collection.pathname,
      name: collection.name,
      usedAt: getOpenedAt(recentsByKey.get(openKeys[index]), collection.importedAt),
      lastEvent: 'opened'
    }))
    .sort(byNewestFirst);
  const closed = recents.filter((recent) => !openPathKeys.has(toPathKey(recent.path)));

  const collections = [];
  let nextOpen = 0;
  closed.forEach((recent) => {
    while (nextOpen < open.length && open[nextOpen].usedAt >= recent.usedAt) {
      collections.push(open[nextOpen]);
      nextOpen += 1;
    }
    collections.push(recent);
  });
  collections.push(...open.slice(nextOpen));

  return { collections, openPathKeys };
};
