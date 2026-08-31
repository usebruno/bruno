import { useCallback } from 'react';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { clearFocusTableRow } from 'providers/ReduxStore/slices/tabs';

/**
 * Subscribes a table to its tab's `focusTableRow` signal, so a row requested
 * from another pane — e.g. the source of an inherited header — can be scrolled
 * into view and highlighted once the tab opens.
 *
 * @param {object} params
 * @param {string} params.uid      Tab uid hosting the table
 * @param {string} params.tableId  Table the signal must target to be consumed
 * @returns {{ focusRow: { uid?: string, name?: string, requestedAt: number } | null, onFocusRowHandled: () => void }}
 */
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
