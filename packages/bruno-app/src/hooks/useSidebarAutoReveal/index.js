import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { revealTabInSidebar } from 'providers/ReduxStore/slices/collections/actions';
import { isElementVisibleInScroller } from 'utils/collections/sidebarNavigation';
import { selectActiveTabCollectionUid, selectIsActiveTabCollectionLoaded } from 'src/selectors/tab';

const isRowVisible = (scroller, rowUid) => {
  if (!scroller || !rowUid) return false;

  const rowElement = scroller.querySelector(`[data-row-uid="${rowUid}"]`);
  return isElementVisibleInScroller(scroller, rowElement);
};

const useSidebarAutoReveal = ({
  rowIndexByItemUid,
  rowIndexByCollectionUid,
  sidebarEntries,
  virtuosoRef,
  scrollerRef
}) => {
  const dispatch = useDispatch();
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const activeTabCollectionUid = useSelector(selectActiveTabCollectionUid);
  const isActiveCollectionLoaded = useSelector(selectIsActiveTabCollectionLoaded);
  const sidebarRevealRequest = useSelector((state) => state.tabs.sidebarRevealRequest);
  const revealedTabUidRef = useRef(null);
  const lastScrolledRef = useRef(null);

  const workspaceCollectionUids = useMemo(
    () => new Set(sidebarEntries.filter((entry) => entry.kind === 'loaded').map((entry) => entry.collection.uid)),
    [sidebarEntries]
  );

  const revealRequestedAt = sidebarRevealRequest?.uid === activeTabUid
    ? sidebarRevealRequest.requestedAt
    : null;

  const activeRowIndex = activeTabUid !== null
    ? (rowIndexByItemUid.get(activeTabUid) ?? rowIndexByCollectionUid.get(activeTabUid) ?? null)
    : null;

  useEffect(() => {
    if (!workspaceCollectionUids.has(activeTabCollectionUid)) {
      revealedTabUidRef.current = null;
      return;
    }
    if (revealedTabUidRef.current === activeTabUid) return;

    if (dispatch(revealTabInSidebar(activeTabUid))) {
      revealedTabUidRef.current = activeTabUid;
    }
  }, [dispatch, activeTabUid, activeTabCollectionUid, workspaceCollectionUids, isActiveCollectionLoaded]);

  useEffect(() => {
    if (activeRowIndex === null) {
      lastScrolledRef.current = null;
      return;
    }

    const lastScrolled = lastScrolledRef.current;
    if (lastScrolled?.uid === activeTabUid && lastScrolled.requestedAt === revealRequestedAt) return;

    const frame = requestAnimationFrame(() => {
      if (!isRowVisible(scrollerRef.current, activeTabUid)) {
        virtuosoRef.current?.scrollToIndex({ index: activeRowIndex, align: 'center', behavior: 'smooth' });
      }
      lastScrolledRef.current = { uid: activeTabUid, requestedAt: revealRequestedAt };
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTabUid, activeRowIndex, revealRequestedAt, virtuosoRef, scrollerRef]);
};

export default useSidebarAutoReveal;
