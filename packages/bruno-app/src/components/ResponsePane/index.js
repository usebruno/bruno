import React, { useState, useEffect } from 'react';
import find from 'lodash/find';
import classnames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { updateResponsePaneTab } from 'providers/ReduxStore/slices/tabs';
import QueryResult from './QueryResult';
import Overlay from './Overlay';
import Placeholder from './Placeholder';
import ResponseHeaders from './ResponseHeaders';
import StatusCode from './StatusCode';
import ResponseTime from './ResponseTime';
import ResponseSize from './ResponseSize';
import Timeline from './Timeline';
import TestResults from './TestResults';
import TestResultsLabel from './TestResultsLabel';
import StyledWrapper from './StyledWrapper';
import ResponseSave from 'src/components/ResponsePane/ResponseSave';
import ResponseClear from 'src/components/ResponsePane/ResponseClear';
import { IconAlertCircle, IconX } from '@tabler/icons';
import ToolHint from 'components/ToolHint';

const ResponsePane = ({ rightPaneWidth, item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);
  const [showErrorCard, setShowErrorCard] = useState(true);

  // Reset showErrorCard when a new error occurs
  useEffect(() => {
    if (item?.hasPostResponseError) {
      setShowErrorCard(true);
    }
  }, [item?.postResponseErrorMessage]);

  const selectTab = (tab) => {
    dispatch(
      updateResponsePaneTab({
        uid: item.uid,
        responsePaneTab: tab
      })
    );
  };

  const response = item.response || {};

  const renderScriptError = () => {
    if (!item?.hasPostResponseError) return null;
    
    if (showErrorCard) {
      return (
        <div className="script-error mt-4 mb-2">
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="error-icon-container flex-shrink-0">
              <IconAlertCircle size={14} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="error-title">
                Script Execution Error
              </div>
              <div className="error-message">
                {item.postResponseErrorMessage}
              </div>
            </div>
            <div 
              className="close-button flex-shrink-0 cursor-pointer"
              onClick={() => setShowErrorCard(false)}
            >
              <IconX size={16} strokeWidth={1.5} />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderErrorIcon = () => {
    if (!item?.hasPostResponseError || showErrorCard) return null;
    
    const toolhintId = `script-error-icon-${item.uid}`;
    
    return (
      <>
        <div 
          id={toolhintId}
          className="cursor-pointer ml-2"
          onClick={() => setShowErrorCard(true)}
        >
          <div className="flex items-center text-red-400">
            <IconAlertCircle size={16} strokeWidth={1.5} className="stroke-current" />
          </div>
        </div>
        <ToolHint
          toolhintId={toolhintId}
          text="Script execution error occurred"
          place="bottom"
        />
      </>
    );
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        return (
          <QueryResult
            item={item}
            collection={collection}
            width={rightPaneWidth}
            data={response.data}
            dataBuffer={response.dataBuffer}
            headers={response.headers}
            error={response.error}
            key={item.filename}
          />
        );
      }
      case 'headers': {
        return <ResponseHeaders headers={response.headers} />;
      }
      case 'timeline': {
        return <Timeline request={item.requestSent} response={item.response} />;
      }
      case 'tests': {
        return <TestResults results={item.testResults} assertionResults={item.assertionResults} />;
      }

      default: {
        return <div>404 | Not found</div>;
      }
    }
  };

  if (isLoading && !item.response) {
    return (
      <StyledWrapper className="flex flex-col h-full relative">
        <Overlay item={item} collection={collection} />
      </StyledWrapper>
    );
  }

  if (!item.response) {
    return (
      <StyledWrapper className="flex h-full relative">
        <Placeholder />
      </StyledWrapper>
    );
  }

  if (!activeTabUid) {
    return <div>Something went wrong</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.responsePaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === focusedTab.responsePaneTab
    });
  };

  const responseHeadersCount = typeof response.headers === 'object' ? Object.entries(response.headers).length : 0;

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center pl-3 pr-4 tabs" role="tablist">
        <div className={getTabClassname('response')} role="tab" onClick={() => selectTab('response')}>
          Response
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Headers
          {responseHeadersCount > 0 && <sup className="ml-1 font-medium">{responseHeadersCount}</sup>}
        </div>
        <div className={getTabClassname('timeline')} role="tab" onClick={() => selectTab('timeline')}>
          Timeline
        </div>
        <div className={getTabClassname('tests')} role="tab" onClick={() => selectTab('tests')}>
          <TestResultsLabel results={item.testResults} assertionResults={item.assertionResults} />
        </div>
        {!isLoading ? (
          <div className="flex flex-grow justify-end items-center">
            {renderErrorIcon()}
            <ResponseClear item={item} collection={collection} />
            <ResponseSave item={item} />
            <StatusCode status={response.status} />
            <ResponseTime duration={response.duration} />
            <ResponseSize size={response.size} />
          </div>
        ) : null}
      </div>
      <section
        className={`flex flex-col flex-grow relative pl-3 pr-4 ${focusedTab.responsePaneTab === 'response' ? '' : 'mt-4'}`}
      >
        {isLoading ? <Overlay item={item} collection={collection} /> : null}
        {item?.hasPostResponseError && renderScriptError()}
        {getTabPanel(focusedTab.responsePaneTab)}
      </section>
    </StyledWrapper>
  );
};

export default ResponsePane;
