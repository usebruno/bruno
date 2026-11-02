import { renderHook } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  revealTabInSidebar: jest.fn((tabUid) => ({ type: 'MOCK/revealTabInSidebar', tabUid }))
}));

const { revealTabInSidebar } = require('providers/ReduxStore/slices/collections/actions');
const useSidebarAutoReveal = require('./index').default;

const COLLECTION_UID = 'collection-uid';

const buildIndexMaps = (itemUids = ['req-1', 'req-2']) => ({
  rowIndexByCollectionUid: new Map([[COLLECTION_UID, 0]]),
  rowIndexByItemUid: new Map(itemUids.map((uid, position) => [uid, position + 1]))
});

const buildState = ({ activeTabUid = 'req-2', sidebarRevealRequest = null } = {}) => ({
  collections: {
    collections: [{ uid: COLLECTION_UID, mountStatus: 'mounted', isLoading: false }]
  },
  tabs: {
    activeTabUid,
    tabs: [{ uid: 'req-1', collectionUid: COLLECTION_UID }, { uid: 'req-2', collectionUid: COLLECTION_UID }],
    sidebarRevealRequest
  }
});

const offscreenScrollerRef = { current: null };

const visibleScrollerRef = (rowUid) => ({
  current: {
    scrollTop: 0,
    clientHeight: 100,
    querySelector: (selector) => (selector.includes(rowUid) ? { offsetTop: 10, offsetHeight: 20 } : null)
  }
});

const renderAutoReveal = ({ state, indexMaps, virtuosoRef, scrollerRef = offscreenScrollerRef }) => {
  useSelector.mockImplementation((selector) => selector(state));
  const sidebarEntries = [{ kind: 'loaded', collection: { uid: COLLECTION_UID } }];
  return renderHook(
    ({ maps }) => useSidebarAutoReveal({ ...maps, sidebarEntries, virtuosoRef, scrollerRef }),
    { initialProps: { maps: indexMaps } }
  );
};

describe('useSidebarAutoReveal', () => {
  let dispatch;
  let virtuosoRef;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch = jest.fn(() => true);
    useDispatch.mockReturnValue(dispatch);
    virtuosoRef = { current: { scrollToIndex: jest.fn() } };
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('scrolls to the active row on mount', () => {
    renderAutoReveal({ state: buildState(), indexMaps: buildIndexMaps(), virtuosoRef });

    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledWith({ index: 2, align: 'center', behavior: 'smooth' });
  });

  it('scrolls again when the same tab is requested again with a newer token', () => {
    const { rerender } = renderAutoReveal({
      state: buildState({ sidebarRevealRequest: { uid: 'req-2', requestedAt: 100 } }),
      indexMaps: buildIndexMaps(),
      virtuosoRef
    });
    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledTimes(1);

    useSelector.mockImplementation((selector) =>
      selector(buildState({ sidebarRevealRequest: { uid: 'req-2', requestedAt: 200 } })));
    rerender({ maps: buildIndexMaps() });

    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledTimes(2);
  });

  it('does not scroll again when rows shift but the token is unchanged', () => {
    const request = { uid: 'req-2', requestedAt: 100 };
    const { rerender } = renderAutoReveal({
      state: buildState({ sidebarRevealRequest: request }),
      indexMaps: buildIndexMaps(),
      virtuosoRef
    });
    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledTimes(1);

    rerender({ maps: buildIndexMaps(['inserted', 'req-1', 'req-2']) });

    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('ignores a token stamped for a different tab', () => {
    const { rerender } = renderAutoReveal({
      state: buildState({ sidebarRevealRequest: { uid: 'req-1', requestedAt: 100 } }),
      indexMaps: buildIndexMaps(),
      virtuosoRef
    });
    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledTimes(1);

    useSelector.mockImplementation((selector) =>
      selector(buildState({ sidebarRevealRequest: { uid: 'req-1', requestedAt: 999 } })));
    rerender({ maps: buildIndexMaps() });

    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('does not scroll when the active row is already visible in the scroller', () => {
    renderAutoReveal({
      state: buildState(),
      indexMaps: buildIndexMaps(),
      virtuosoRef,
      scrollerRef: visibleScrollerRef('req-2')
    });

    expect(virtuosoRef.current.scrollToIndex).not.toHaveBeenCalled();
  });

  it('still scrolls when a scheduled frame is cancelled before it runs', () => {
    window.requestAnimationFrame.mockImplementation(() => 1);

    const { rerender } = renderAutoReveal({ state: buildState(), indexMaps: buildIndexMaps(), virtuosoRef });
    expect(virtuosoRef.current.scrollToIndex).not.toHaveBeenCalled();

    window.requestAnimationFrame.mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    rerender({ maps: buildIndexMaps(['inserted', 'req-1', 'req-2']) });

    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledWith({ index: 3, align: 'center', behavior: 'smooth' });
  });

  it('re-scrolls after the active row disappears and comes back', () => {
    const request = { uid: 'req-2', requestedAt: 100 };
    const { rerender } = renderAutoReveal({
      state: buildState({ sidebarRevealRequest: request }),
      indexMaps: buildIndexMaps(),
      virtuosoRef
    });
    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledTimes(1);

    rerender({ maps: { rowIndexByCollectionUid: new Map(), rowIndexByItemUid: new Map() } });
    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledTimes(1);

    rerender({ maps: buildIndexMaps() });
    expect(virtuosoRef.current.scrollToIndex).toHaveBeenCalledTimes(2);
  });

  it('requests a reveal once per active tab', () => {
    const { rerender } = renderAutoReveal({ state: buildState(), indexMaps: buildIndexMaps(), virtuosoRef });
    expect(revealTabInSidebar).toHaveBeenCalledTimes(1);

    rerender({ maps: buildIndexMaps() });

    expect(revealTabInSidebar).toHaveBeenCalledTimes(1);
  });
});
