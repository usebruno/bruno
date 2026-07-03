import find from 'lodash/find';
import { useSelector } from 'react-redux';

/**
 * Reads the tab's `focusHeaderRow` signal when it targets this table. Returns
 * `{ tableId, headerUid, requestedAt }` or null. Consumers (EditableTable) use it
 * to scroll to and briefly flash the matching header row.
 *
 * @param {object} params
 * @param {string} [params.uid]      Tab uid (request/folder/collection uid)
 * @param {string} [params.tableId]  Which table this instance is (e.g. 'request-headers')
 */
export const useFocusHeaderRow = ({ uid, tableId }) =>
  useSelector((state) => {
    if (!uid || !tableId) return null;
    const tab = find(state.tabs.tabs, (t) => t.uid === uid);
    const focus = tab?.focusHeaderRow;
    return focus && focus.tableId === tableId ? focus : null;
  });

export default useFocusHeaderRow;
