import React, { useState } from 'react';
import Tab from 'components/Tab';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import Button from 'ui/Button';
import ResponseExampleUrlBar from 'components/ResponseExample/ResponseExampleRequestPane/ResponseExampleUrlBar';
import ResponseExampleParams from 'components/ResponseExample/ResponseExampleRequestPane/ResponseExampleParams';
import ResponseExampleHeaders from 'components/ResponseExample/ResponseExampleRequestPane/ResponseExampleHeaders';
import ResponseExampleBody from 'components/ResponseExample/ResponseExampleRequestPane/ResponseExampleBody';
import RequestPaneStyledWrapper from 'components/ResponseExample/ResponseExampleRequestPane/StyledWrapper';
import MockResponseRules from '../MockResponseRules';
import StyledWrapper from './StyledWrapper';

const MockResponseRequestPane = ({
  item,
  collection,
  exampleUid,
  editMode,
  onSave,
  rules,
  onRulesChange,
  onTry,
  isTrying,
  isServerRunning
}) => {
  const [activeTab, setActiveTab] = useState('request');
  const ruleCount = rules?.conditions?.length || 0;

  const tabConfig = [
    { name: 'request', label: 'Request' },
    { name: 'rules', label: 'Rules', count: ruleCount }
  ];

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'request':
        return (
          <RequestPaneStyledWrapper className="flex flex-col h-full w-full">
            <ResponseExampleParams
              editMode={editMode}
              item={item}
              collection={collection}
              exampleUid={exampleUid}
            />
            <ResponseExampleHeaders
              editMode={editMode}
              item={item}
              collection={collection}
              exampleUid={exampleUid}
            />
            <ResponseExampleBody
              editMode={editMode}
              item={item}
              collection={collection}
              exampleUid={exampleUid}
              onSave={onSave}
            />
          </RequestPaneStyledWrapper>
        );
      case 'rules':
        return (
          <MockResponseRules
            rules={rules}
            editMode={editMode}
            embedded
            onChange={onRulesChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="px-4 try-row">
        <div className="try-url-bar">
          <ResponseExampleUrlBar
            item={item}
            collection={collection}
            exampleUid={exampleUid}
            editMode={editMode}
            onSave={onSave}
          />
        </div>
        <span
          title={!isServerRunning && !isTrying ? 'Start the mock server before trying this response' : undefined}
        >
          <Button
            color="secondary"
            size="sm"
            onClick={onTry}
            disabled={isTrying || !isServerRunning}
            data-testid="mock-response-try-btn"
          >
            {isTrying ? 'Trying...' : 'Try'}
          </Button>
        </span>
      </div>

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
      </div>

      <section className="flex w-full flex-1 relative px-4">
        <HeightBoundContainer>
          {getTabPanel(activeTab)}
        </HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default MockResponseRequestPane;
