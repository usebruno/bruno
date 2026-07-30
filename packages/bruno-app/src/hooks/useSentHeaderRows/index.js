import { buildHeaderRows, orderTimelineHeadersBySource } from '@usebruno/common/utils';
import { useMemo } from 'react';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';

/**
 * buildHeaderRows and orderTimelineHeadersBySource take the collection-root-to-item path as a
 * parameter so @usebruno/common stays free of app collection helpers. This module is the one place
 * that resolves it, so the surfaces rendering sent headers share the wiring.
 */
const withTreePath = ({ collection, item, request }) => ({
  collection,
  item,
  treePath: getTreePathFromCollectionToItem(collection, item),
  request
});

/**
 * The headers a request actually sent, as display rows grouped by source
 * (default -> collection -> folder -> request -> script).
 */
const useSentHeaderRows = ({ collection, item, request, timeline }) =>
  useMemo(
    () => buildHeaderRows({ ...withTreePath({ collection, item, request }), timeline }),
    [collection, item, request, timeline]
  );

/** The same grouping applied to the network log, so both views order a request's headers alike. */
export const useOrderedTimeline = ({ collection, item, request, timeline }) =>
  useMemo(
    () => orderTimelineHeadersBySource(timeline, withTreePath({ collection, item, request })),
    [collection, item, request, timeline]
  );

export default useSentHeaderRows;
