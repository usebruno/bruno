import React, { useMemo } from 'react';
import get from 'lodash/get';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { updateResponsePaneTab } from 'providers/ReduxStore/slices/tabs';
import Tab from 'components/Tab';
import ResponseLayoutToggle from 'components/ResponsePane/ResponseLayoutToggle';
import StatusCode from 'components/ResponsePane/StatusCode';
import ResponseExampleResponseContent from './ResponseExampleResponseContent';
import ResponseExampleResponseHeaders from './ResponseExampleResponseHeaders';
import ResponseExampleStatusInput from './ResponseExampleStatusInput';
import StyledWrapper from './StyledWrapper';
import HeightBoundContainer from 'ui/HeightBoundContainer';

const ResponseExampleResponsePane = ({ item, collection, editMode, exampleUid, onSave }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  // Get the focused tab for reading persisted tab state
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const activeTab = focusedTab?.responsePaneTab || 'response';

  const selectTab = (tab) => {
    dispatch(updateResponsePaneTab({
      uid: exampleUid,
      responsePaneTab: tab
    }));
  };

  const exampleData = useMemo(() => {
    return item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid) || {} : get(item, 'examples', []).find((e) => e.uid === exampleUid) || {};
  }, [item, exampleUid]);

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        return (
          <ResponseExampleResponseContent
            editMode={editMode}
            item={item}
            collection={collection}
            exampleUid={exampleUid}
            onSave={onSave}
          />
        );
      }
      case 'headers': {
        return (
          <ResponseExampleResponseHeaders
            editMode={editMode}
            item={item}
            collection={collection}
            exampleUid={exampleUid}
            onSave={onSave}
          />
        );
      }
      default: {
        return <div>404 | Not found</div>;
      }
    }
  };

  const tabConfig = [
    {
      name: 'response',
      label: 'Response'
    },
    {
      name: 'headers',
      label: 'Headers',
      count: (exampleData?.response?.headers || []).length
    }
  ];

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center tabs mb-4 px-4" role="tablist">
        {tabConfig.map((tab) => (
          <Tab
            key={tab.name}
            name={tab.name}
            label={tab.label}
            isActive={activeTab === tab.name}
            onClick={selectTab}
            count={tab.count}
          />
        ))}

        <div className="flex flex-grow justify-end items-center">
          <ResponseLayoutToggle />
          {editMode ? (
            <ResponseExampleStatusInput
              item={item}
              collection={collection}
              exampleUid={exampleUid}
              status={exampleData?.response?.status}
              statusText={exampleData?.response?.statusText}
            />
          ) : (
            exampleData?.response?.status && (
              <StatusCode status={exampleData.response.status} statusText={exampleData.response.statusText} />
            )
          )}
        </div>
      </div>

      <section className="flex w-full flex-1 relative">
        <HeightBoundContainer>
          {getTabPanel(activeTab)}
        </HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default ResponseExampleResponsePane;
