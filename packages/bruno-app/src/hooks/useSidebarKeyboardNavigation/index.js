import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  toggleCollection,
  toggleCollectionItem,
  expandItem,
  collapseItem
} from 'providers/ReduxStore/slices/collections';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import { clearSidebarFocusRequest } from 'providers/ReduxStore/slices/app';
import {
  findRowIndexByFocusKey,
  getFirstChildRowIndex,
  getNextRowIndex,
  getParentRowIndex,
  isElementVisibleInScroller,
  isRowExpandable,
  isRowExpanded
} from 'utils/collections/sidebarNavigation';
import { isOverlayOpen } from 'utils/common/overlay';

const FOCUS_RETRY_FRAMES = 10;

const isTextInput = (element) =>
  ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName) || element?.isContentEditable;

/**
 * Adds tree-style keyboard navigation to the virtualized sidebar.
 *
 * Arrow keys are contextual: they only act while a sidebar row has focus, so
 * they never conflict with text editing or OS-level shortcuts. Use
 * `useFocusActiveSidebarItem` to move focus into the tree.
 */
const useSidebarKeyboardNavigation = ({
  rows,
  rowIndexByItemUid,
  rowIndexByCollectionUid,
  itemsByUid,
  collectionsByUid,
  virtuosoRef,
  scrollerRef,
  searchText
}) => {
  const dispatch = useDispatch();
  const sidebarFocusRequest = useSelector((state) => state.app.sidebarFocusRequest);

  const hasSearch = Boolean(searchText?.trim());
  const focusRetryRef = useRef({ frame: null, token: 0 });

  const cancelPendingFocus = useCallback(() => {
    const retry = focusRetryRef.current;
    retry.token += 1;
    if (retry.frame !== null) {
      cancelAnimationFrame(retry.frame);
      retry.frame = null;
    }
  }, []);

  // A pending retry must never move focus after the list unmounts.
  useEffect(() => cancelPendingFocus, [cancelPendingFocus]);

  const getRowElement = useCallback((rowId) => {
    const scroller = scrollerRef.current;
    if (!scroller) return null;

    const rowElements = scroller.querySelectorAll('[data-sidebar-row]');
    for (const rowElement of rowElements) {
      if (rowElement.getAttribute('data-row-id') === rowId) return rowElement;
    }

    return null;
  }, [scrollerRef]);

  const focusRowElement = useCallback((rowId) => {
    const rowElement = getRowElement(rowId);
    const focusTarget = rowElement?.querySelector('[data-sidebar-row-focus-target]') || rowElement;
    if (!focusTarget) return false;

    focusTarget.focus({ preventScroll: true });
    return true;
  }, [getRowElement]);

  const isRowVisible = useCallback((rowElement) => {
    return isElementVisibleInScroller(scrollerRef.current, rowElement);
  }, [scrollerRef]);

  const focusRowByIndex = useCallback((index) => {
    const row = rows[index];
    if (!row) return false;

    cancelPendingFocus();
    const token = focusRetryRef.current.token;

    const tryFocus = () => {
      const rowElement = getRowElement(row.id);
      if (!rowElement) return false;

      if (!isRowVisible(rowElement)) {
        virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'auto' });
      }

      return focusRowElement(row.id);
    };

    if (tryFocus()) return true;

    // Virtualized rows mount asynchronously, so scroll first and retry on the
    // next frames until the row is rendered and can receive focus.
    virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'auto' });
    let attempts = 0;
    const retry = () => {
      if (token !== focusRetryRef.current.token) return;
      if (tryFocus() || attempts >= FOCUS_RETRY_FRAMES) {
        focusRetryRef.current.frame = null;
        return;
      }
      attempts += 1;
      focusRetryRef.current.frame = requestAnimationFrame(retry);
    };
    focusRetryRef.current.frame = requestAnimationFrame(retry);

    return true;
  }, [rows, virtuosoRef, cancelPendingFocus, getRowElement, focusRowElement, isRowVisible]);

  const getRowObjects = useCallback((row) => ({
    item: row.itemUid ? itemsByUid.get(row.itemUid) : undefined,
    collection: row.collectionUid ? collectionsByUid.get(row.collectionUid) : undefined
  }), [itemsByUid, collectionsByUid]);

  const expandRow = useCallback((row) => {
    if (row.kind === 'collection') {
      const collection = collectionsByUid.get(row.collectionUid);
      if (collection && collection.mountStatus !== 'mounted' && collection.mountStatus !== 'mounting') {
        dispatch(mountCollection({
          collectionUid: collection.uid,
          collectionPathname: collection.pathname,
          brunoConfig: collection.brunoConfig
        }));
      }
      dispatch(toggleCollection(row.collectionUid));
      return;
    }

    if (row.kind === 'folder') {
      dispatch(toggleCollectionItem({ itemUid: row.itemUid, collectionUid: row.collectionUid }));
      return;
    }

    if (row.kind === 'request') {
      dispatch(expandItem({ itemUid: row.itemUid, collectionUid: row.collectionUid }));
    }
  }, [collectionsByUid, dispatch]);

  const collapseRow = useCallback((row) => {
    if (row.kind === 'collection') {
      dispatch(toggleCollection(row.collectionUid));
      return;
    }

    if (row.kind === 'folder') {
      dispatch(toggleCollectionItem({ itemUid: row.itemUid, collectionUid: row.collectionUid }));
      return;
    }

    if (row.kind === 'request') {
      dispatch(collapseItem({ itemUid: row.itemUid, collectionUid: row.collectionUid }));
    }
  }, [dispatch]);

  const activateRow = useCallback((row) => {
    const rowElement = getRowElement(row.id);
    const activateTarget = rowElement?.querySelector('[data-sidebar-row-activate]');
    if (!activateTarget) return;

    if (activateTarget.tagName === 'BUTTON') {
      activateTarget.click();
      return;
    }

    activateTarget.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 1
    }));
  }, [getRowElement]);

  const handleKeyDown = useCallback((event) => {
    if (event.defaultPrevented) return;

    const activeRowElement = event.target.closest?.('[data-sidebar-row]');
    if (!activeRowElement || isTextInput(event.target)) return;

    // Modified arrows belong to the OS or to text editing, not to tree navigation.
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const rowId = activeRowElement.getAttribute('data-row-id');
    const currentIndex = rows.findIndex((row) => row.id === rowId);
    if (currentIndex < 0) return;

    if (event.key === 'Enter') {
      // Let buttons inside a row (menus, empty-state actions) handle Enter natively.
      if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A') return;
      event.preventDefault();
      activateRow(rows[currentIndex]);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      focusRowByIndex(getNextRowIndex(rows, currentIndex, direction));
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusRowByIndex(event.key === 'Home' ? 0 : rows.length - 1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const row = rows[currentIndex];
      const { item, collection } = getRowObjects(row);
      const expandable = isRowExpandable({ row, item, collection });
      const expanded = isRowExpanded({ row, item, collection });

      if (!hasSearch && expandable && expanded) {
        collapseRow(row);
        return;
      }

      const parentIndex = getParentRowIndex(rows, currentIndex);
      if (parentIndex >= 0) focusRowByIndex(parentIndex);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const row = rows[currentIndex];
      const { item, collection } = getRowObjects(row);
      const expandable = isRowExpandable({ row, item, collection });
      const expanded = isRowExpanded({ row, item, collection });

      if (!hasSearch && expandable && !expanded) {
        expandRow(row);
        return;
      }

      const childIndex = getFirstChildRowIndex(rows, currentIndex);
      if (childIndex >= 0) {
        focusRowByIndex(childIndex);
        return;
      }

      // If it's a leaf node or cannot be expanded further, advance to the next visible row
      if (currentIndex + 1 < rows.length) {
        focusRowByIndex(currentIndex + 1);
      }
    }
  }, [
    rows,
    hasSearch,
    getRowObjects,
    collapseRow,
    expandRow,
    focusRowByIndex,
    activateRow
  ]);

  const resolveFocusRequestIndex = useCallback((request) => {
    if (request.focusFirst) return rows.length ? 0 : -1;
    if (!request.uid) return -1;

    const uidIndex = rowIndexByItemUid.get(request.uid) ?? rowIndexByCollectionUid.get(request.uid);
    if (uidIndex !== undefined) return uidIndex;

    return findRowIndexByFocusKey(rows, request.uid);
  }, [rows, rowIndexByItemUid, rowIndexByCollectionUid]);

  // Re-runs when the rows change so a request survives a collection mounting or
  // the search filter being cleared.
  useEffect(() => {
    if (!sidebarFocusRequest) return;

    // The shortcut clears the filter in the same tick it dispatches the request,
    // so resolving against the still-filtered rows would focus a row about to be
    // reflowed away. Wait for the unfiltered list instead.
    if (hasSearch) return;

    // A dialog opened while the row was mounting wins over the pending request.
    if (isOverlayOpen()) {
      dispatch(clearSidebarFocusRequest());
      return;
    }

    const index = resolveFocusRequestIndex(sidebarFocusRequest);
    if (index < 0) return;

    focusRowByIndex(index);
    dispatch(clearSidebarFocusRequest());
  }, [sidebarFocusRequest, rows, hasSearch, resolveFocusRequestIndex, focusRowByIndex, dispatch]);

  return { handleKeyDown };
};

export default useSidebarKeyboardNavigation;
