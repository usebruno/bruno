import React from 'react';
import find from 'lodash/find';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { updateResponsePaneTab } from 'providers/ReduxStore/slices/tabs';
import QueryResult from './QueryResult';
import Overlay from './Overlay';
import Placeholder from './Placeholder';
import ResponseHeaders from './ResponseHeaders';
import StatusCode from './StatusCode';
import ResponseTime from './ResponseTime';
import ResponseSize from './ResponseSize';
import StyledWrapper from './StyledWrapper';

const ResponsePane = ({rightPaneWidth, item, isLoading}) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const selectTab = (tab) => {
    dispatch(updateResponsePaneTab({
      uid: item.uid,
      responsePaneTab: tab
    }))
  };

  const response = item.response || {};

  const getTabPanel = (tab) => {
    switch(tab) {
      case 'response': {
        return (
          <QueryResult
            width={rightPaneWidth}
            value={response.data ? JSON.stringify(response.data, null, 2) : ''}
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
  };

  if(isLoading) {
    return (
      <StyledWrapper className="flex h-full relative">
        <Overlay />
      </StyledWrapper>
    );
  }
  if(response.state !== 'success') {
    return (
      <StyledWrapper className="flex h-full relative">
        <Placeholder />
      </StyledWrapper>
    );
  }

  if(!activeTabUid) {
    return (
      <div>Something went wrong</div>
    );
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if(!focusedTab || !focusedTab.uid || !focusedTab.responsePaneTab) {
    return (
      <div className="pb-4 px-4">An error occured!</div>
    );
  }

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      'active': tabName === focusedTab.responsePaneTab
    });
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex items-center px-3 tabs" role="tablist">
        <div className={getTabClassname('response')} role="tab" onClick={() => selectTab('response')}>Response</div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>Headers</div>
        {!isLoading ? (
          <div className="flex flex-grow justify-end items-center">
            <StatusCode status={response.status}/>
            <ResponseTime duration={response.duration}/>
            <ResponseSize size={response.size}/>
          </div>
        ) : null }
      </div>
      <section className="flex flex-grow mt-5">
        {getTabPanel(focusedTab.responsePaneTab)}
      </section>
    </StyledWrapper>
  )
};

export default ResponsePane;
