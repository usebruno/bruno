import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { buildIndexes } from 'utils/collections/flattenSidebarTree';
import { revealTabInSidebar } from 'providers/ReduxStore/slices/collections/actions';

const useSidebarAutoReveal = ({ rows, collectionsByUid, virtuosoRef }) => {
  const dispatch = useDispatch();
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const activeTab = useSelector((state) => state.tabs.tabs.find((tab) => tab.uid === state.tabs.activeTabUid) || null);
  const revealedTabUidRef = useRef(null);
  const lastScrolledTabUidRef = useRef(null);

  const { rowIndexByItemUid, rowIndexByCollectionUid } = useMemo(() => buildIndexes(rows), [rows]);

  const activeRowIndex = activeTabUid !== null
    ? (rowIndexByItemUid.get(activeTabUid) ?? rowIndexByCollectionUid.get(activeTabUid) ?? null)
    : null;

  useEffect(() => {
    if (!activeTab?.collectionUid) return;
    if (revealedTabUidRef.current === activeTabUid) return;

    if (!collectionsByUid.has(activeTab.collectionUid)) {
      revealedTabUidRef.current = activeTabUid;
      return;
    }

    if (dispatch(revealTabInSidebar(activeTabUid)) !== 'pending') {
      revealedTabUidRef.current = activeTabUid;
    }
  }, [dispatch, activeTabUid, activeTab, collectionsByUid, rows]);

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
