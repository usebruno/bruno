import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import GrpcBody from 'components/RequestPane/GrpcBody';
import GrpcAuth from './GrpcAuth/index';
import GrpcAuthMode from './GrpcAuth/GrpcAuthMode/index';
import StatusDot from 'components/StatusDot/index';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import find from 'lodash/find';
import Documentation from 'components/Documentation/index';
import { getPropertyFromDraftOrRequest } from 'utils/collections/index';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import StyledWrapper from './StyledWrapper';

const GrpcRequestPane = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const rightContentRef = useRef(null);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const requestPaneTab = focusedTab?.requestPaneTab;

  const selectTab = useCallback((tab) => {
    dispatch(
      updateRequestPaneTab({
        uid: item.uid,
        requestPaneTab: tab
      })
    );
  }, [dispatch, item.uid]);

  const tabPanel = useMemo(() => {
    switch (requestPaneTab) {
      case 'body': {
        return <GrpcBody item={item} collection={collection} hideModeSelector={true} hidePrettifyButton={true} handleRun={handleRun} />;
      }
      case 'headers': {
        return <RequestHeaders item={item} collection={collection} addHeaderText="Add Metadata" />;
      }
      case 'auth': {
        return <GrpcAuth item={item} collection={collection} />;
      }
      case 'docs': {
        return <Documentation item={item} collection={collection} />;
      }
      default: {
        return <div className="mt-4">404 | Not found</div>;
      }
    }
  }, [requestPaneTab, item, collection, handleRun]);

  const body = getPropertyFromDraftOrRequest(item, 'request.body');
  const headers = getPropertyFromDraftOrRequest(item, 'request.headers');
  const docs = getPropertyFromDraftOrRequest(item, 'request.docs');
  const auth = getPropertyFromDraftOrRequest(item, 'request.auth');

  const activeHeadersLength = headers.filter((header) => header.enabled).length;
  const grpcMessagesCount = body?.grpc?.length || 0;

  // Determine if this is a client streaming request
  const request = item.draft ? item.draft.request : item.request;
  const isClientStreaming = request.methodType === 'client-streaming' || request.methodType === 'bidi-streaming';

  const allTabs = useMemo(() => {
    const getMessageIndicator = () => {
      if (grpcMessagesCount > 0) {
        return isClientStreaming ? (
          <sup className="ml-[.125rem] font-medium">{grpcMessagesCount}</sup>
        ) : (
          <StatusDot />
        );
      }
      return null;
    };

    return [
      {
        key: 'body',
        label: 'Message',
        indicator: getMessageIndicator()
      },
      {
        key: 'headers',
        label: 'Metadata',
        indicator: activeHeadersLength > 0 ? <sup className="ml-[.125rem] font-medium">{activeHeadersLength}</sup> : null
      },
      {
        key: 'auth',
        label: 'Auth',
        indicator: auth?.mode && auth.mode !== 'none' ? <StatusDot type="default" /> : null
      },
      {
        key: 'docs',
        label: 'Docs',
        indicator: docs && docs.length > 0 ? <StatusDot type="default" /> : null
      }
    ];
  }, [grpcMessagesCount, isClientStreaming, activeHeadersLength, auth?.mode, docs]);

  // Initialize tab to 'body' if no tab is currently set
  useEffect(() => {
    if (activeTabUid && focusedTab?.uid && !requestPaneTab) {
      selectTab('body');
    }
  }, [activeTabUid, focusedTab?.uid, requestPaneTab, selectTab]);

  // Return error for truly missing active/focused tabs
  if (!activeTabUid || !focusedTab?.uid) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  // Return null during initialization while requestPaneTab is being set by useEffect
  if (!requestPaneTab) {
    return null;
  }

  const rightContent = requestPaneTab === 'auth' ? (
    <div ref={rightContentRef} className="flex flex-grow justify-start items-center">
      <GrpcAuthMode item={item} collection={collection} />
    </div>
  ) : null;

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <ResponsiveTabs
        tabs={allTabs}
        activeTab={requestPaneTab}
        onTabSelect={selectTab}
        rightContent={rightContent}
        rightContentRef={rightContent ? rightContentRef : null}
      />

      <section
        className="flex w-full flex-1 h-full mt-4"
      >
        <HeightBoundContainer>
          {tabPanel}
        </HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default GrpcRequestPane;
