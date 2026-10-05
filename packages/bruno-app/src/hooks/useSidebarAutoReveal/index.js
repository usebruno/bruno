import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { buildIndexes } from 'utils/collections/flattenSidebarTree';
import { revealTabInSidebar } from 'providers/ReduxStore/slices/collections/actions';
import { SIDEBAR_REVEAL_STATUS } from 'utils/common/constants';

const useSidebarAutoReveal = ({ rows, sidebarEntries, virtuosoRef }) => {
  const dispatch = useDispatch();
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const activeTabCollectionUid = useSelector(
    (state) => state.tabs.tabs.find((tab) => tab.uid === state.tabs.activeTabUid)?.collectionUid ?? null
  );
  const revealedTabUidRef = useRef(null);
  const lastScrolledTabUidRef = useRef(null);

  const { rowIndexByItemUid, rowIndexByCollectionUid } = useMemo(() => buildIndexes(rows), [rows]);

  const workspaceCollectionUids = useMemo(
    () => new Set(sidebarEntries.filter((entry) => entry.kind === 'loaded').map((entry) => entry.collection.uid)),
    [sidebarEntries]
  );

  const activeRowIndex = activeTabUid !== null
    ? (rowIndexByItemUid.get(activeTabUid) ?? rowIndexByCollectionUid.get(activeTabUid) ?? null)
    : null;

  useEffect(() => {
    if (!workspaceCollectionUids.has(activeTabCollectionUid)) {
      revealedTabUidRef.current = null;
      return;
    }
    if (revealedTabUidRef.current === activeTabUid) return;

    if (dispatch(revealTabInSidebar(activeTabUid)) !== SIDEBAR_REVEAL_STATUS.PENDING) {
      revealedTabUidRef.current = activeTabUid;
    }
  }, [dispatch, activeTabUid, activeTabCollectionUid, workspaceCollectionUids, rows]);

  useEffect(() => {
    if (activeRowIndex === null) {
      lastScrolledTabUidRef.current = null;
      return;
    }
    if (lastScrolledTabUidRef.current === activeTabUid) return;
    virtuosoRef.current?.scrollIntoView({ index: activeRowIndex, behavior: 'smooth' });
    lastScrolledTabUidRef.current = activeTabUid;
  }, [activeTabUid, activeRowIndex]);
};

export default useSidebarAutoReveal;
