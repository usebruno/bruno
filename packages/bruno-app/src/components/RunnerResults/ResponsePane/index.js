import React, { useState } from 'react';
import get from 'lodash/get';
import classnames from 'classnames';
import QueryResult from 'components/ResponsePane/QueryResult';
import ResponseHeaders from 'components/ResponsePane/ResponseHeaders';
import Timeline from 'components/ResponsePane/Timeline';
import TestResults from 'components/ResponsePane/TestResults';
import TestResultsLabel from 'components/ResponsePane/TestResultsLabel';
import { IconCode, IconList, IconClockHour4, IconTestPipe, IconClock, IconRuler } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const ResponsePane = ({ rightPaneWidth, item, collection }) => {
  const [selectedTab, setSelectedTab] = useState('response');

  const { requestSent, responseReceived, testResults, assertionResults, error } = item;

  const headers = get(item, 'responseReceived.headers', []);
  const status = get(item, 'responseReceived.status', 0);
  const statusText = get(item, 'responseReceived.statusText', '');
  const size = get(item, 'responseReceived.size', 0);
  const duration = get(item, 'responseReceived.duration', 0);

  const selectTab = (tab) => setSelectedTab(tab);

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        return (
          <>
            <div className="response-meta">
              <div className={`meta-item status ${status >= 200 && status < 300 ? 'success' : 'error'}`}>
                <span className="label">Status:</span>
                <span className="value">{status} {statusText}</span>
              </div>
              <div className="meta-item">
                <IconClock size={14} strokeWidth={1.5} />
                <span className="value">{duration}ms</span>
              </div>
              <div className="meta-item">
                <IconRuler size={14} strokeWidth={1.5} />
                <span className="value">{size} B</span>
              </div>
            </div>
            <div className="response-content">
              <QueryResult
                item={item}
                collection={collection}
                width={rightPaneWidth}
                disableRunEventListener={true}
                data={responseReceived.data}
                dataBuffer={responseReceived.dataBuffer}
                headers={responseReceived.headers}
                error={error}
                key={item.filename}
              />
            </div>
          </>
        );
      }
      case 'headers': {
        return <ResponseHeaders headers={headers} />;
      }
      case 'timeline': {
        return <Timeline request={requestSent} response={responseReceived} />;
      }
      case 'tests': {
        return <TestResults results={testResults} assertionResults={assertionResults} />;
      }

      default: {
        return <div>404 | Not found</div>;
      }
    }
  };

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName} flex items-center gap-1`, {
      active: tabName === selectedTab
    });
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex items-center tabs mt-2" role="tablist">
        <div className={getTabClassname('response')} role="tab" onClick={() => selectTab('response')}>
          <IconCode size={14} strokeWidth={1.5} />
          Response
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          <IconList size={14} strokeWidth={1.5} />
          Headers
          {headers?.length > 0 && <sup className="ml-1 font-medium">{headers.length}</sup>}
        </div>
        <div className={getTabClassname('timeline')} role="tab" onClick={() => selectTab('timeline')}>
          <IconClockHour4 size={14} strokeWidth={1.5} />
          Timeline
        </div>
        <div className={getTabClassname('tests')} role="tab" onClick={() => selectTab('tests')}>
          <IconTestPipe size={14} strokeWidth={1.5} />
          <TestResultsLabel results={testResults} assertionResults={assertionResults} />
        </div>
      </div>
      <section>{getTabPanel(selectedTab)}</section>
    </StyledWrapper>
  );
};

export default ResponsePane;
