import React, { useState } from 'react';
import { useTheme } from 'providers/Theme';
import get from 'lodash/get';
import Tab from 'components/Tab';
import ResponseLayoutToggle from 'components/ResponsePane/ResponseLayoutToggle';
import StatusCode from 'components/ResponsePane/StatusCode';
import ResponseExampleResponseContent from './ResponseExampleResponseContent';
import ResponseExampleResponseHeaders from './ResponseExampleResponseHeaders';
import StyledWrapper from './StyledWrapper';
import HeightBoundContainer from 'ui/HeightBoundContainer';

const ResponseExampleResponsePane = ({ item, collection, editMode, exampleUid, onSave }) => {
  const [activeTab, setActiveTab] = useState('response');

  // Get example data from item draft, similar to how RequestHeaders works
  const exampleData = item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid) || {} : get(item, 'examples', []).find((e) => e.uid === exampleUid) || {};

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
          {exampleData?.response?.status && (
            <StatusCode status={exampleData.response.status} />
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
