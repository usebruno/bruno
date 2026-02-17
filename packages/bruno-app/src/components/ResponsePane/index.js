import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { updateResponsePaneTab, updateResponseFormat, updateResponseViewTab } from 'providers/ReduxStore/slices/tabs';
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

// Width threshold for expanded right-side action buttons
const RIGHT_CONTENT_EXPANDED_WIDTH = 135;

const ResponsePane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);
  const [showScriptErrorCard, setShowScriptErrorCard] = useState(false);
  const rightContentRef = useRef(null);

  const response = item.response || {};

  // Get the focused tab for reading persisted format/view state
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);

  // Initialize format and tab only once when data loads.
  const { initialFormat, initialTab, contentType } = useInitialResponseFormat(response?.dataBuffer, response?.headers);
  const previewFormatOptions = useResponsePreviewFormatOptions(response?.dataBuffer, response?.headers);

  // Track previous response headers to detect when content-type changes
  const previousContentRef = useRef(contentType);

  const persistedFormat = focusedTab?.responseFormat;
  const persistedViewTab = focusedTab?.responseViewTab;

  // Use persisted values from Redux, falling back to initial values or defaults
  const selectedFormat = persistedFormat ?? initialFormat ?? 'raw';
  const selectedViewTab = persistedViewTab ?? initialTab ?? 'editor';

  useEffect(() => {
    if (!focusedTab || initialFormat === null || initialTab === null) {
      return;
    }

    // Check if response headers (content-type) changed using deep comparison
    const contentTypeChanged = contentType !== previousContentRef.current;
    if (contentTypeChanged) {
      previousContentRef.current = contentType;
    }
    if (contentTypeChanged || persistedFormat === null) {
      dispatch(updateResponseFormat({ uid: item.uid, responseFormat: initialFormat }));
    }
    if (contentTypeChanged || persistedViewTab === null) {
      dispatch(updateResponseViewTab({ uid: item.uid, responseViewTab: initialTab }));
    }
  }, [contentType, initialFormat, initialTab, persistedFormat, persistedViewTab, focusedTab, item.uid, dispatch]);

  const handleFormatChange = useCallback((newFormat) => {
    dispatch(updateResponseFormat({ uid: item.uid, responseFormat: newFormat }));
  }, [dispatch, item.uid]);

  const handleViewTabChange = useCallback((newViewTab) => {
    dispatch(updateResponseViewTab({ uid: item.uid, responseViewTab: newViewTab }));
  }, [dispatch, item.uid]);

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
            selectedTab={selectedViewTab}
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
      {focusedTab?.responsePaneTab === 'response' && item?.response && !(item.response?.stream ?? false) ? (
        <>
          {/* Result View Tabs (Visualizations + Response Format) */}
          <div className="result-view-tabs">

            {/* Response Format */}
            <QueryResultTypeSelector
              formatOptions={previewFormatOptions}
              formatValue={selectedFormat}
              onFormatChange={handleFormatChange}
              onPreviewTabSelect={handleViewTabChange}
              selectedTab={selectedViewTab}
              isActiveTab={selectedViewTab === 'editor' || selectedViewTab === 'preview'}
              onTabSelect={() => {
                handleViewTabChange('editor');
              }}
            />
          </div>
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
        ) : item?.response && !item?.response?.error ? (
          <ResponsePaneActions
            item={item}
            collection={collection}
            responseSize={responseSize}
            selectedFormat={selectedFormat}
            selectedTab={selectedViewTab}
            data={response.data}
            dataBuffer={response.dataBuffer}
          />
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
          rightContentExpandedWidth={RIGHT_CONTENT_EXPANDED_WIDTH}
        />
      </div>
      <section
        className="flex flex-col min-h-0 relative px-4 auto overflow-auto mt-4"
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
