import React, { useState } from 'react';
import get from 'lodash/get';
import classnames from 'classnames';
import { safeStringifyJSON } from 'utils/common';
import QueryResult from 'components/ResponsePane/QueryResult';
import ResponseHeaders from 'components/ResponsePane/ResponseHeaders';
import StatusCode from 'components/ResponsePane/StatusCode';
import ResponseTime from 'components/ResponsePane/ResponseTime';
import ResponseSize from 'components/ResponsePane/ResponseSize';
import Timeline from 'components/ResponsePane/Timeline';
import TestResults from 'components/ResponsePane/TestResults';
import TestResultsLabel from 'components/ResponsePane/TestResultsLabel';
import StyledWrapper from './StyledWrapper';

const ResponsePane = ({ rightPaneWidth, item, collection }) => {
  const [selectedTab, setSelectedTab] = useState('response');

  const { requestSent, responseReceived, testResults, assertionResults, error } = item;

  const headers = get(item, 'responseReceived.headers', []);
  const status = get(item, 'responseReceived.status', 0);
  const size = get(item, 'responseReceived.size', 0);
  const duration = get(item, 'responseReceived.duration', 0);

  const selectTab = (tab) => setSelectedTab(tab);

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        return (
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
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === selectedTab
    });
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex items-center px-3 tabs" role="tablist">
        <div className={getTabClassname('response')} role="tab" onClick={() => selectTab('response')}>
          Response
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Headers
          {headers?.length > 0 && <sup className="ml-1 font-medium">{headers.length}</sup>}
        </div>
        <div className={getTabClassname('timeline')} role="tab" onClick={() => selectTab('timeline')}>
          Timeline
        </div>
        <div className={getTabClassname('tests')} role="tab" onClick={() => selectTab('tests')}>
          <TestResultsLabel results={testResults} assertionResults={assertionResults} />
        </div>
        <div className="flex flex-grow justify-end items-center">
          <StatusCode status={status} />
          <ResponseTime duration={duration} />
          <ResponseSize size={size} />
        </div>
      </div>
      <section className="flex flex-grow mt-5">{getTabPanel(selectedTab)}</section>
    </StyledWrapper>
  );
};

export default ResponsePane;
