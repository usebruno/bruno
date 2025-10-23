import React, { useState, useMemo } from 'react';
import get from 'lodash/get';
import Tab from 'components/Tab';
import ResponseLayoutToggle from 'components/ResponsePane/ResponseLayoutToggle';
import StatusCode from 'components/ResponsePane/StatusCode';
import ResponseExampleResponseContent from './ResponseExampleResponseContent';
import ResponseExampleResponseHeaders from './ResponseExampleResponseHeaders';
import ResponseExampleStatusInput from './ResponseExampleStatusInput';
import StyledWrapper from './StyledWrapper';
import HeightBoundContainer from 'ui/HeightBoundContainer';

const ResponseExampleResponsePane = ({ item, collection, editMode, exampleUid, onSave }) => {
  const [activeTab, setActiveTab] = useState('response');

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
            onClick={setActiveTab}
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
              <StatusCode status={exampleData.response.status} />
            )
          )}
        </div>
      </div>

      <section className="flex w-full mt-3 flex-1 relative">
        <HeightBoundContainer>
          {getTabPanel(activeTab)}
        </HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default ResponseExampleResponsePane;
