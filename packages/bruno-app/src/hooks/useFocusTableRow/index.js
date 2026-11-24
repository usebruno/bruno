import { useCallback } from 'react';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { clearFocusTableRow } from 'providers/ReduxStore/slices/tabs';

/** Read and clear a tab's focus-row signal for this table. */
export const useFocusTableRow = ({ uid, tableId }) => {
  const dispatch = useDispatch();
  const focusTableRow = useSelector((state) => {
    const tab = find(state.tabs.tabs, (t) => t.uid === uid);
    return tab?.focusTableRow || null;
  });

  const onFocusRowHandled = useCallback(() => {
    dispatch(clearFocusTableRow({ uid }));
  }, [dispatch, uid]);

  const isForThisTable = focusTableRow?.tableId === tableId
    && !!(focusTableRow?.rowUid || focusTableRow?.rowName);

  return {
    focusRow: isForThisTable
      ? {
          uid: focusTableRow.rowUid,
          name: focusTableRow.rowName,
          requestedAt: focusTableRow.requestedAt
        }
      : null,
    onFocusRowHandled
  };
};
