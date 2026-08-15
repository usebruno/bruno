import React, { useState } from 'react';
import { IconPlayerPlay } from '@tabler/icons';
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
  isServerRunning,
  onStartServer,
  isStartingServer
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
            allowMethodSelect
          />
        </div>
        <div className="try-action">
          {isServerRunning ? (
            <Button
              color="secondary"
              onClick={onTry}
              disabled={isTrying}
              data-testid="mock-response-try-btn"
            >
              {isTrying ? 'Trying...' : 'Try'}
            </Button>
          ) : (
            <Button
              color="secondary"
              icon={<IconPlayerPlay size={14} stroke={1.5} />}
              onClick={onStartServer}
              disabled={isStartingServer}
              title="Start the mock server to try this response"
              data-testid="mock-response-start-server-btn"
            >
              {isStartingServer ? 'Starting...' : 'Start Server'}
            </Button>
          )}
        </div>
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
