import find from 'lodash/find';
import { updateRequestPaneTabHeight, updateRequestPaneTabWidth } from 'providers/ReduxStore/slices/tabs';
import { useDispatch, useSelector } from 'react-redux';

const MIN_TOP_PANE_HEIGHT = 150;

export function useTabPaneBoundaries(activeTabUid) {
  const DEFAULT_PANE_WIDTH_DIVISOR = 2.2;

  const tabs = useSelector((state) => state.tabs.tabs);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const screenWidth = useSelector((state) => state.app.screenWidth);
  let asideWidth = useSelector((state) => state.app.leftSidebarWidth);
  const left = focusedTab && focusedTab.requestPaneWidth ? focusedTab.requestPaneWidth : (screenWidth - asideWidth) / DEFAULT_PANE_WIDTH_DIVISOR;
  const top = focusedTab?.requestPaneHeight;
  const dispatch = useDispatch();

  return {
    left,
    top,
    setLeft(value) {
      dispatch(updateRequestPaneTabWidth({
        uid: activeTabUid,
        requestPaneWidth: value
      }));
    },
    setTop(value) {
      dispatch(updateRequestPaneTabHeight({
        uid: activeTabUid,
        requestPaneHeight: value
      }));
    },
    reset() {
      dispatch(updateRequestPaneTabHeight({
        uid: activeTabUid,
        requestPaneHeight: MIN_TOP_PANE_HEIGHT
      }));
      dispatch(updateRequestPaneTabWidth({
        uid: activeTabUid,
        requestPaneWidth: (screenWidth - asideWidth) / DEFAULT_PANE_WIDTH_DIVISOR
      }));
    }
  };
}
