import React, { useState } from 'react';
import classnames from 'classnames';
import QueryResult from './QueryResult';
import Overlay from './Overlay';
import ResponseHeaders from './ResponseHeaders';
import StatusCode from './StatusCode';
import ResponseTime from './ResponseTime';
import ResponseSize from './ResponseSize';
import StyledWrapper from './StyledWrapper';

const ResponsePane = ({rightPaneWidth, response, isLoading}) => {
  const [selectedTab, setSelectedTab] = useState('response');

  response = response || {};

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      'active': tabName === selectedTab
    });
  };

  const getTabPanel = (tab) => {
    switch(tab) {
      case 'response': {
        return (
          <QueryResult
            width={rightPaneWidth}
            data={response.data}
            isLoading={isLoading}
          />
        );
      }
      case 'headers': {
        return (
          <ResponseHeaders headers={response.headers}/>
        );
      }

      default: {
        return <div>404 | Not found</div>;
      }
    }
  }

  if(isLoading) {
    return (
      <StyledWrapper className="flex h-full relative">
        <Overlay />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex items-center px-3 tabs mt-1" role="tablist">
        <div className={getTabClassname('response')} role="tab" onClick={() => setSelectedTab('response')}>Response</div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => setSelectedTab('headers')}>Headers</div>
        {!isLoading ? (
          <div className="flex flex-grow justify-end items-center">
            <StatusCode status={response.status}/>
            <ResponseTime duration={response.duration}/>
            <ResponseSize size={response.size}/>
          </div>
        ) : null }
      </div>
      <section className="flex flex-grow">
        {getTabPanel(selectedTab)}
      </section>
    </StyledWrapper>
  )
};

export default ResponsePane;
