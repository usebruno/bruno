import find from 'lodash/find';
import { updateRequestPaneTabHeight, updateRequestPaneTabWidth, selectTabsForLocation } from 'providers/ReduxStore/slices/tabs';
import { useDispatch, useSelector } from 'react-redux';

const MIN_TOP_PANE_HEIGHT = 380;
const LOCATION = 'request-pane';

export function useTabPaneBoundaries(activeTabUid) {
  const DEFAULT_PANE_WIDTH_DIVISOR = 2.2;

  const tabs = useSelector(selectTabsForLocation(LOCATION));
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const screenWidth = useSelector((state) => state.app.screenWidth);
  let asideWidth = useSelector((state) => state.app.leftSidebarWidth);
  const left = focusedTab && focusedTab.properties?.requestPaneWidth ? focusedTab.properties.requestPaneWidth : (screenWidth - asideWidth) / DEFAULT_PANE_WIDTH_DIVISOR;
  const top = focusedTab?.properties?.requestPaneHeight || MIN_TOP_PANE_HEIGHT;
  const dispatch = useDispatch();

  return {
    left,
    top,
    setLeft(value) {
      dispatch(updateRequestPaneTabWidth({
        uid: activeTabUid,
        requestPaneWidth: value,
        location: LOCATION
      }));
    },
    setTop(value) {
      dispatch(updateRequestPaneTabHeight({
        uid: activeTabUid,
        requestPaneHeight: value,
        location: LOCATION
      }));
    },
    reset() {
      dispatch(updateRequestPaneTabHeight({
        uid: activeTabUid,
        requestPaneHeight: MIN_TOP_PANE_HEIGHT,
        location: LOCATION
      }));
      dispatch(updateRequestPaneTabWidth({
        uid: activeTabUid,
        requestPaneWidth: (screenWidth - asideWidth) / DEFAULT_PANE_WIDTH_DIVISOR,
        location: LOCATION
      }));
    }
  };
}
