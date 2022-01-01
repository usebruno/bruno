import React, { useState } from 'react';
import classnames from 'classnames';
import QueryResult from './QueryResult';
import ResponseHeaders from './ResponseHeaders';
import StatusCode from './StatusCode';
import ResponseTime from './ResponseTime';
import ResponseSize from './ResponseSize';
import StyledWrapper from './StyledWrapper';

const ResponsePane = ({rightPaneWidth, data, isLoading, headers}) => {
  const [selectedTab, setSelectedTab] = useState('response');

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
            data={data}
            isLoading={isLoading}
          />
        );
      }
      case 'headers': {
        return (
          <ResponseHeaders headers={headers}/>
        );
      }

      default: {
        return <div>404 | Not found</div>;
      }
    }
  }

  return (
    <StyledWrapper className="">
      <div className="flex items-center tabs mt-1" role="tablist">
        <div className={getTabClassname('response')} role="tab" onClick={() => setSelectedTab('response')}>Response</div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => setSelectedTab('headers')}>Headers</div>
        <div className="flex flex-grow justify-end items-center">
          <StatusCode />
          <ResponseTime />
          <ResponseSize />
        </div>
      </div>
      <section>
        {getTabPanel(selectedTab)}
      </section>
    </StyledWrapper>
  )
};

export default ResponsePane;
