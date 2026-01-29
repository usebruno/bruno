import { IconLayoutBottombar, IconLayoutSidebar } from '@tabler/icons';
import { toggleRequestPane, toggleResponsePane } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

const PaneToggles = ({ item }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = tabs.find((t) => t.uid === activeTabUid);

  const handleToggleRequestPane = (e) => {
    e.stopPropagation();
    dispatch(toggleRequestPane({ uid: focusedTab?.uid || item.uid }));
  };

  const handleToggleResponsePane = (e) => {
    e.stopPropagation();
    dispatch(toggleResponsePane({ uid: focusedTab?.uid || item.uid }));
  };

  return (
    <div className="flex items-center h-full ml-1 mr-2 gap-2 cursor-pointer">
      <div
        title="Toggle Request Pane"
        className="infotip"
        onClick={handleToggleRequestPane}
      >
        <IconLayoutSidebar
          color={focusedTab?.requestPaneVisible === false ? theme.draftColor : theme.requestTabs.icon.color}
          strokeWidth={1.5}
          size={18}
        />
        <span className="infotiptext text-xs">Toggle Request Pane</span>
      </div>
      <div
        title="Toggle Response Pane"
        className="infotip"
        onClick={handleToggleResponsePane}
      >
        <IconLayoutBottombar
          color={focusedTab?.responsePaneVisible === false ? theme.draftColor : theme.requestTabs.icon.color}
          strokeWidth={1.5}
          size={18}
        />
        <span className="infotiptext text-xs">Toggle Response Pane</span>
      </div>
    </div>
  );
};

export default PaneToggles;
