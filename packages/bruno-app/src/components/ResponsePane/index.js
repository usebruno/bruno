import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import ResponsePaneActions from './ResponsePaneActions';
import QueryResultTypeSelector from './QueryResult/QueryResultTypeSelector/index';
import { useInitialResponseFormat, useResponsePreviewFormatOptions } from './QueryResult/index';
import SkippedRequest from './SkippedRequest';
import ClearTimeline from './ClearTimeline/index';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import ResponseStopWatch from 'components/ResponsePane/ResponseStopWatch';
import WSMessagesList from './WsResponsePane/WSMessagesList';
import ResponsiveTabs from 'ui/ResponsiveTabs';

const ResponsePane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);
  const [showScriptErrorCard, setShowScriptErrorCard] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('raw');
  const [selectedTab, setSelectedTab] = useState('editor');
  const rightContentRef = useRef(null);

  // Initialize format and tab only once when data loads
  const { initialFormat, initialTab } = useInitialResponseFormat(item.response?.dataBuffer, item.response?.headers);
  const previewFormatOptions = useResponsePreviewFormatOptions(item.response?.dataBuffer, item.response?.headers);

  useEffect(() => {
    if (initialFormat !== null && initialTab !== null) {
      setSelectedFormat(initialFormat);
      setSelectedTab(initialTab);
    }
  }, [initialFormat, initialTab]);

  const requestTimeline = ([...(collection.timeline || [])]).filter((obj) => {
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

  const responseSize = useMemo(() => {
    if (typeof response.size === 'number') {
      return response.size;
    }

    if (!response.dataBuffer) return 0;

    try {
      // dataBuffer is base64 encoded, so we need to calculate the actual size
      const buffer = Buffer.from(response.dataBuffer, 'base64');
      return buffer.length;
    } catch (error) {
      return 0;
    }
  }, [response.size, response.dataBuffer]);
  const responseHeadersCount = typeof response.headers === 'object' ? Object.entries(response.headers).length : 0;

  const hasScriptError = item?.preRequestScriptErrorMessage || item?.postResponseScriptErrorMessage || item?.testScriptErrorMessage;

  const allTabs = useMemo(() => {
    return [
      {
        key: 'response',
        label: 'Response',
        indicator: null
      },
      {
        key: 'headers',
        label: 'Headers',
        indicator: responseHeadersCount > 0 ? <sup className="ml-1 font-medium">{responseHeadersCount}</sup> : null
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
  }, [responseHeadersCount, item.testResults, item.assertionResults, item.preRequestTestResults, item.postResponseTestResults]);

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        const isStream = item.response?.stream ?? false;
        if (isStream) {
          return <WSMessagesList order={-1} messages={item.response.data} />;
        }
        return (
          <QueryResult
            item={item}
            collection={collection}
            data={response.data}
            dataBuffer={response.dataBuffer}
            headers={response.headers}
            error={response.error}
            key={item.filename}
            selectedFormat={selectedFormat}
            selectedTab={selectedTab}
          />
        );
      }
      case 'headers': {
        return <ResponseHeaders headers={response.headers} />;
      }
      case 'timeline': {
        return <Timeline collection={collection} item={item} />;
      }
      case 'tests': {
        return (
          <TestResults
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

  const rightContent = !isLoading ? (
    <div ref={rightContentRef} className="flex justify-end items-center right-side-container gap-3">
      {hasScriptError && !showScriptErrorCard && (
        <ScriptErrorIcon
          itemUid={item.uid}
          onClick={() => setShowScriptErrorCard(true)}
        />
      )}
      {focusedTab?.responsePaneTab === 'response' ? (
        <>
          <QueryResultTypeSelector
            formatOptions={previewFormatOptions}
            formatValue={selectedFormat}
            onFormatChange={(newFormat) => {
              setSelectedFormat(newFormat);
            }}
            onPreviewTabSelect={() => {
              setSelectedTab((prev) => prev === 'editor' ? 'preview' : 'editor');
            }}
            selectedTab={selectedTab}
          />
        </>
      ) : null}
      <div className="flex items-center response-pane-status">
        <StatusCode status={response.status} isStreaming={item.response?.stream?.running} />
        {item.response?.stream?.running
          ? <ResponseStopWatch startMillis={response.duration} />
          : <ResponseTime duration={response.duration} />}
        <ResponseSize size={responseSize} />
      </div>

      <div className="flex items-center response-pane-actions">
        {focusedTab?.responsePaneTab === 'timeline' ? (
          <ClearTimeline item={item} collection={collection} />
        ) : (item?.response && !item?.response?.error) ? (
          <ResponsePaneActions item={item} collection={collection} responseSize={responseSize} />
        ) : null}
      </div>
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
      <section
        className="flex flex-col min-h-0 relative px-4 pt-3 auto overflow-auto"
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
        <div className="flex-1 overflow-y-auto">
          {!item?.response ? (
            focusedTab?.responsePaneTab === 'timeline' && requestTimeline?.length ? (
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
