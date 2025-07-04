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
import ScriptError from './ScriptError';
import ScriptErrorIcon from './ScriptErrorIcon';
import StyledWrapper from './StyledWrapper';
import ResponseSave from 'src/components/ResponsePane/ResponseSave';
import ResponseClear from 'src/components/ResponsePane/ResponseClear';
import SkippedRequest from './SkippedRequest';
import ClearTimeline from './ClearTimeline/index';
import ResponseLayoutToggle from './ResponseLayoutToggle';
import HeightBoundContainer from 'ui/HeightBoundContainer';

const ResponsePane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);
  const [showScriptErrorCard, setShowScriptErrorCard] = useState(false);

  const requestTimeline = ([...(collection.timeline || [])]).filter(obj => {
    if (obj.itemUid === item.uid) return true;
  });

  useEffect(() => {
    if (item?.preRequestScriptErrorMessage || item?.postResponseScriptErrorMessage || item?.testScriptErrorMessage) {
      setShowScriptErrorCard(true);
    }
  }, [item?.preRequestScriptErrorMessage, item?.postResponseScriptErrorMessage, item?.testScriptErrorMessage]);

  const selectTab = (tab) => {
    dispatch(
      updateResponsePaneTab({
        uid: item.uid,
        responsePaneTab: tab
      })
    );
  };

  const response = item.response || {};
  const responseSize = response.size || 0;

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        return (
          <QueryResult
            item={item}
            collection={collection}
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
        return <Timeline collection={collection} item={item}  />;
      }
      case 'tests': {
        return <TestResults
          results={item.testResults}
          assertionResults={item.assertionResults}
          preRequestTestResults={item.preRequestTestResults}
          postResponseTestResults={item.postResponseTestResults}
        />;
      }

      default: {
        return <div>404 | Not found</div>;
      }
    }
  };

  if (item.response && item.status === 'skipped') {
    return (
      <StyledWrapper className="flex h-full relative">
        <SkippedRequest />
      </StyledWrapper>
    );
  }

  if (isLoading && !item.response) {
    return (
      <StyledWrapper className="flex flex-col h-full relative">
        <Overlay item={item} collection={collection} />
      </StyledWrapper>
    );
  }

  if (!item.response && !requestTimeline?.length) {
    return (
      <HeightBoundContainer>
        <Placeholder />
      </HeightBoundContainer>
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

  const hasScriptError = item?.preRequestScriptErrorMessage || item?.postResponseScriptErrorMessage || item?.testScriptErrorMessage;

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center px-4 tabs" role="tablist">
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
          <TestResultsLabel
            results={item.testResults}
            assertionResults={item.assertionResults}
            preRequestTestResults={item.preRequestTestResults}
            postResponseTestResults={item.postResponseTestResults}
          />
        </div>
        {!isLoading ? (
          <div className="flex flex-grow justify-end items-center">
            {hasScriptError && !showScriptErrorCard && (
              <ScriptErrorIcon
                itemUid={item.uid}
                onClick={() => setShowScriptErrorCard(true)}
              />
            )}
            <ResponseLayoutToggle />
            {focusedTab?.responsePaneTab === "timeline" ? (
              <ClearTimeline item={item} collection={collection} />
            ) : (item?.response && !item?.response?.error) ? (
              <>
                <ResponseClear item={item} collection={collection} />
                <ResponseSave item={item} />
                <StatusCode status={response.status} />
                <ResponseTime duration={response.duration} />
                <ResponseSize size={responseSize} />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <section
        className={`flex flex-col min-h-0 relative px-4 auto`}
        style={{
          flex: '1 1 0',
          height: hasScriptError && showScriptErrorCard ? 'auto' : '100%'
        }}
      >
        {isLoading ? <Overlay item={item} collection={collection} /> : null}
        {hasScriptError && showScriptErrorCard && (
          <ScriptError
            item={item}
            onClose={() => setShowScriptErrorCard(false)}
          />
        )}
        <div className='flex-1 min-h-[200px] overflow-y-auto'>
          {!item?.response ? (
            focusedTab?.responsePaneTab === "timeline" && requestTimeline?.length ? (
              <Timeline
                collection={collection}
                item={item}
              />
            ) : null
          ) : (
            <>{getTabPanel(focusedTab.responsePaneTab)}</>
          )}
        </div>
      </section>
    </StyledWrapper>
  );
};

export default ResponsePane;
