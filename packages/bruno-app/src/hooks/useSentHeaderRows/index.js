import { buildHeaderRows } from '@usebruno/common/utils';
import { useMemo } from 'react';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';

/**
 * The headers a request actually sent, as display rows grouped by source
 * (default -> collection -> folder -> request -> script).
 *
 * buildHeaderRows lives in @usebruno/common and takes the collection-root-to-item path as a
 * parameter so that package stays free of app collection helpers; this hook supplies it, so the
 * surfaces that render sent headers share one wiring instead of repeating it.
 */
const useSentHeaderRows = ({ collection, item, request, timeline }) =>
  useMemo(
    () => buildHeaderRows({ collection, item, treePath: getTreePathFromCollectionToItem(collection, item), request, timeline }),
    [collection, item, request, timeline]
  );

export default useSentHeaderRows;
