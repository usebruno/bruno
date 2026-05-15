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
import { useTranslation } from 'react-i18next';

const ResponseExampleResponsePane = ({ item, collection, editMode, exampleUid, onSave }) => {
  const { t } = useTranslation();
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
        return <div>{t('RESPONSE_EXAMPLE.NOT_FOUND')}</div>;
      }
    }
  };

  const tabConfig = [
    {
      name: 'response',
      label: t('RESPONSE_EXAMPLE.RESPONSE')
    },
    {
      name: 'headers',
      label: t('RESPONSE_EXAMPLE.HEADERS'),
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
