import { useId, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Tab from 'components/Tab';
import { closeOpenCollectionModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { GIT_PAGE_TABS } from './tabs';
import StyledWrapper from './StyledWrapper';

const TAB_KEY_STEPS = { ArrowRight: 1, ArrowLeft: -1 };

const focusTabFromKey = (event) => {
  const tabs = Array.from(event.currentTarget.querySelectorAll('[role="tab"]'));
  const currentIndex = tabs.indexOf(document.activeElement);
  if (currentIndex === -1) {
    return;
  }

  let nextIndex;
  if (event.key in TAB_KEY_STEPS) {
    nextIndex = (currentIndex + TAB_KEY_STEPS[event.key] + tabs.length) % tabs.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = tabs.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  tabs[nextIndex].focus();
};

const GitPage = () => {
  const dispatch = useDispatch();
  const idPrefix = useId();
  const panelId = `${idPrefix}-panel`;
  const tabElementId = (tabId) => `${idPrefix}-tab-${tabId}`;
  const hasTabBar = GIT_PAGE_TABS.length > 1;
  const isBusy = useSelector((state) => state.openCollectionModal.pageBusy);
  const [active, setActive] = useState({ tabId: GIT_PAGE_TABS[0].id, params: {}, openCount: 0 });

  const activeTab = GIT_PAGE_TABS.find((tab) => tab.id === active.tabId) || GIT_PAGE_TABS[0];
  const TabComponent = activeTab.component;

  const openTab = (tabId, params = {}) => {
    if (isBusy || !GIT_PAGE_TABS.some((tab) => tab.id === tabId)) {
      return;
    }
    setActive((current) => ({ tabId, params, openCount: current.openCount + 1 }));
  };
  const closeModal = () => dispatch(closeOpenCollectionModal());

  return (
    <StyledWrapper className="flex flex-col flex-1 min-h-0 px-5">
      {hasTabBar ? (
        <div
          className="git-tabs flex"
          role="tablist"
          aria-label="Git source"
          onKeyDown={focusTabFromKey}
          data-testid="open-collection-git-tabs"
        >
          {GIT_PAGE_TABS.map((tab) => (
            <Tab
              key={tab.id}
              id={tabElementId(tab.id)}
              aria-controls={panelId}
              tabIndex={tab.id === activeTab.id ? 0 : -1}
              name={tab.id}
              label={tab.label}
              isActive={tab.id === activeTab.id}
              aria-disabled={isBusy && tab.id !== activeTab.id ? true : undefined}
              onClick={(tabId) => tabId !== activeTab.id && openTab(tabId)}
              data-testid={`open-collection-git-tab-${tab.id}`}
            />
          ))}
        </div>
      ) : null}
      <div
        key={`${activeTab.id}-${active.openCount}`}
        className="flex flex-col flex-1 min-h-0 overflow-y-auto"
        id={hasTabBar ? panelId : undefined}
        role={hasTabBar ? 'tabpanel' : undefined}
        aria-labelledby={hasTabBar ? tabElementId(activeTab.id) : undefined}
        data-testid={`open-collection-git-panel-${activeTab.id}`}
      >
        <TabComponent params={active.params} openTab={openTab} closeModal={closeModal} />
      </div>
    </StyledWrapper>
  );
};

export default GitPage;
