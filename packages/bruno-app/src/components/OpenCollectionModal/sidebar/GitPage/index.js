import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Tab from 'components/Tab';
import { closeOpenCollectionModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import { GIT_PAGE_TABS } from './tabs';
import StyledWrapper from './StyledWrapper';

const GitPage = () => {
  const dispatch = useDispatch();
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
      {GIT_PAGE_TABS.length > 1 ? (
        <div className="git-tabs flex" role="tablist" data-testid="open-collection-git-tabs">
          {GIT_PAGE_TABS.map((tab) => (
            <Tab
              key={tab.id}
              name={tab.id}
              label={tab.label}
              isActive={tab.id === activeTab.id}
              onClick={(tabId) => tabId !== activeTab.id && openTab(tabId)}
              data-testid={`open-collection-git-tab-${tab.id}`}
            />
          ))}
        </div>
      ) : null}
      <div
        key={`${activeTab.id}-${active.openCount}`}
        className="flex flex-col flex-1 min-h-0 overflow-y-auto"
        role={GIT_PAGE_TABS.length > 1 ? 'tabpanel' : undefined}
        data-testid={`open-collection-git-panel-${activeTab.id}`}
      >
        <TabComponent params={active.params} openTab={openTab} closeModal={closeModal} />
      </div>
    </StyledWrapper>
  );
};

export default GitPage;
