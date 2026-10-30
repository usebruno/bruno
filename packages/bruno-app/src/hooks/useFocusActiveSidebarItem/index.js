import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { revealTabInSidebar } from 'providers/ReduxStore/slices/collections/actions';
import {
  clearSidebarFocusRequest,
  resetSidebarSearch,
  setSidebarFocusRequest,
  toggleSidebarCollapse
} from 'providers/ReduxStore/slices/app';
import { setLocalStorageValue, SIDEBAR_COLLAPSED_KEY } from 'utils/common/localStorage';
import { isOverlayOpen } from 'utils/common/overlay';
import { doesTabHaveSidebarRow } from 'utils/collections/sidebarNavigation';
import useKeybinding from 'hooks/useKeybinding';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';

const FOCUS_REQUEST_TIMEOUT_MS = 5000;

/**
 * Registers the shortcut that moves focus into the collections tree.
 *
 * This lives outside the collections list so the shortcut keeps working while
 * the Collections section is collapsed, and it opens the sidebar/section and
 * clears the search filter before revealing the active tab.
 */
const useFocusActiveSidebarItem = () => {
  const dispatch = useDispatch();
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const activeTab = useSelector(
    (state) => state.tabs.tabs.find((tab) => tab.uid === state.tabs.activeTabUid) ?? null
  );
  const sidebarFocusRequest = useSelector((state) => state.app.sidebarFocusRequest);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const selectedSidebarUids = useSelector((state) => state.collections.selectedSidebarUids);
  const { isExpanded, setSectionExpanded } = useSidebarAccordion();
  const previousFocusRef = useRef(null);

  const handleFocusActiveSidebarItem = useCallback(() => {
    if (isOverlayOpen()) return false;

    if (sidebarCollapsed) {
      dispatch(toggleSidebarCollapse());
      setLocalStorageValue(SIDEBAR_COLLAPSED_KEY, false);
    }

    if (!isExpanded('collections')) {
      setSectionExpanded('collections', true);
    }

    dispatch(resetSidebarSearch());

    // Tabs such as the workspace overview or environments have no sidebar row;
    // focus the tree from the top instead of waiting for a row that never mounts.
    if (!doesTabHaveSidebarRow(activeTab)) {
      dispatch(setSidebarFocusRequest({ focusFirst: true }));
      return false;
    }

    dispatch(revealTabInSidebar(activeTabUid));
    dispatch(setSidebarFocusRequest({ uid: activeTabUid }));

    return false;
  }, [
    activeTab,
    activeTabUid,
    sidebarCollapsed,
    isExpanded,
    setSectionExpanded,
    dispatch
  ]);

  useKeybinding('focusActiveSidebarItem', handleFocusActiveSidebarItem, {
    allowInInputs: true,
    deps: [handleFocusActiveSidebarItem]
  });

  // Unresolved requests expire here rather than in the virtualized list, which
  // unmounts with the section and would leave the request pending. Clearing on
  // unmount keeps a later remount from stealing focus.
  useEffect(() => {
    if (!sidebarFocusRequest) return;

    const timeout = setTimeout(() => {
      dispatch(clearSidebarFocusRequest());
    }, FOCUS_REQUEST_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [sidebarFocusRequest, dispatch]);

  useEffect(() => () => {
    dispatch(clearSidebarFocusRequest());
  }, [dispatch]);

  // Escape leaves the tree and returns focus to where the user came from.
  // The listener only exists while a row has focus, and with a multi-selection
  // the existing selection-clear handler takes precedence.
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (selectedSidebarUids.length > 0) return;
      if (!document.activeElement?.closest?.('[data-sidebar-row]')) return;
      if (isOverlayOpen()) return;

      const previousFocus = previousFocusRef.current;
      if (!previousFocus?.isConnected) return;

      event.preventDefault();
      previousFocus.focus();
    };

    const handleFocusIn = (event) => {
      if (event.target?.closest?.('[data-sidebar-row]')) {
        document.addEventListener('keydown', handleEscape);
        return;
      }

      previousFocusRef.current = event.target;
      document.removeEventListener('keydown', handleEscape);
    };

    document.addEventListener('focusin', handleFocusIn);
    if (document.activeElement?.closest?.('[data-sidebar-row]')) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedSidebarUids]);
};

export default useFocusActiveSidebarItem;
