import React, { useEffect, useRef, useState } from 'react';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { updateResponsePaneTab } from 'providers/ReduxStore/slices/tabs';
import Overlay from '../Overlay';
import Placeholder from '../Placeholder';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import GrpcResponseHeaders from './GrpcResponseHeaders';
import GrpcStatusCode from './GrpcStatusCode';
import ResponseTime from '../ResponseTime/index';
import Timeline from '../Timeline';
import ClearTimeline from '../ClearTimeline';
import ResponseClear from '../ResponseClear';
import StyledWrapper from './StyledWrapper';
import ResponseTrailers from './ResponseTrailers';
import GrpcQueryResult from './GrpcQueryResult';
import ResponseLayoutToggle from '../ResponseLayoutToggle';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import ScriptError from '../ScriptError';
import ScriptErrorIcon from '../ScriptErrorIcon';
import TestResults from '../TestResults';
import TestResultsLabel from '../TestResultsLabel';

const GrpcResponsePane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);
  const rightContentRef = useRef(null);
  const [showScriptErrorCard, setShowScriptErrorCard] = useState(false);

  const hasScriptError
    = item?.preRequestScriptErrorMessage || item?.onMessageScriptErrorMessage || item?.postResponseScriptErrorMessage || item?.testScriptErrorMessage;

  useEffect(() => {
    if (hasScriptError) {
      setShowScriptErrorCard(true);
    }
  }, [hasScriptError]);

  const requestTimeline = [...(collection?.timeline || [])].filter((obj) => {
    if (obj.itemUid === item.uid) return true;
  });

  const selectTab = (tab) => {
    dispatch(
      updateResponsePaneTab({
        uid: item.uid,
        responsePaneTab: tab
      })
    );
  };

  const response = item.response || {};

  const metadataCount = Array.isArray(response.metadata) ? response.metadata.length : 0;
  const trailersCount = Array.isArray(response.trailers) ? response.trailers.length : 0;
  const responsesCount = Array.isArray(response.responses) ? response.responses.length : 0;

  const allTabs = [
    {
      key: 'response',
      label: 'Response',
      indicator:
        responsesCount > 0 ? (
          <sup data-testid="grpc-tab-response-count" className="ml-1 font-medium">
            {responsesCount}
          </sup>
        ) : null
    },
    {
      key: 'headers',
      label: 'Metadata',
      indicator: metadataCount > 0 ? <sup className="ml-1 font-medium">{metadataCount}</sup> : null
    },
    {
      key: 'trailers',
      label: 'Trailers',
      indicator: trailersCount > 0 ? <sup className="ml-1 font-medium">{trailersCount}</sup> : null
    },
    {
      key: 'timeline',
      label: 'Timeline',
      indicator: null
    },
    {
      key: 'tests',
      label: (
        <TestResultsLabel
          results={item.testResults}
          assertionResults={item.assertionResults}
          preRequestTestResults={item.preRequestTestResults}
          postResponseTestResults={item.postResponseTestResults}
        />
      ),
      indicator: null
    }
  ];

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        return <GrpcQueryResult item={item} collection={collection} />;
      }
      case 'headers': {
        return <GrpcResponseHeaders metadata={response.metadata} />;
      }
      case 'trailers': {
        return <ResponseTrailers trailers={response.trailers} />;
      }
      case 'timeline': {
        return <Timeline collection={collection} item={item} activeTabUid={activeTabUid} />;
      }
      case 'tests': {
        return (
          <TestResults
            item={item}
            results={item.testResults}
            assertionResults={item.assertionResults}
            preRequestTestResults={item.preRequestTestResults}
            postResponseTestResults={item.postResponseTestResults}
          />
        );
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

  if (!item.response && !requestTimeline?.length && !hasScriptError) {
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

  const rightContent = !isLoading ? (
    <div ref={rightContentRef} className="flex items-center">
      {hasScriptError && !showScriptErrorCard && (
        <ScriptErrorIcon item={item} onClick={() => setShowScriptErrorCard(true)} />
      )}
      {focusedTab?.responsePaneTab === 'timeline' ? (
        <>
          <ResponseLayoutToggle />
          <ClearTimeline item={item} collection={collection} />
        </>
      ) : item?.response ? (
        <>
          <ResponseLayoutToggle />
          <ResponseClear item={item} collection={collection} />
          <GrpcStatusCode
            status={response.statusCode}
            text={response.statusText}
            details={response.statusDescription}
          />
          <ResponseTime duration={response.duration} />
        </>
      ) : null}
    </div>
  ) : null;

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="px-4">
        <ResponsiveTabs
          tabs={allTabs}
          activeTab={focusedTab.responsePaneTab}
          onTabSelect={selectTab}
          rightContent={rightContent}
          rightContentRef={rightContentRef}
        />
      </div>
      <section className={`response-pane-content ${hasScriptError && showScriptErrorCard ? 'has-script-error' : ''}`}>
        {isLoading ? <Overlay item={item} collection={collection} /> : null}
        {hasScriptError && showScriptErrorCard && (
          <ScriptError
            item={item}
            onClose={() => setShowScriptErrorCard(false)}
            collection={collection}
          />
        )}
        <div className="response-tab-content">
          {!item?.response ? (
            focusedTab?.responsePaneTab === 'timeline' && requestTimeline?.length ? (
              <Timeline collection={collection} item={item} activeTabUid={activeTabUid} />
            ) : null
          ) : (
            <>{getTabPanel(focusedTab.responsePaneTab)}</>
          )}
        </div>
      </section>
    </StyledWrapper>
  );
};

export default GrpcResponsePane;
