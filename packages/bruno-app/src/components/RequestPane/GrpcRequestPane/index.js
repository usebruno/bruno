import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import GrpcBody from 'components/RequestPane/GrpcBody';
import GrpcAuth from './GrpcAuth/index';
import GrpcAuthMode from './GrpcAuth/GrpcAuthMode/index';
import StatusDot from 'components/StatusDot/index';
import StatusBadge from 'ui/StatusBadge/index';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import find from 'lodash/find';
import Documentation from 'components/Documentation/index';
import DocsAction from 'components/Documentation/DocsAction';
import { getPropertyFromDraftOrRequest } from 'utils/collections/index';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import StyledWrapper from './StyledWrapper';
import TabBarAiAssist from '../TabBarAiAssist';
import { hasEffectiveAuth } from 'utils/auth';
import { AUTH_MODES_GRPC } from 'utils/common/constants';
import Script from 'components/RequestPane/Script';
import { getPhasesByRequestType, REQUEST_TYPES } from '@usebruno/common';

const AI_TABS = ['docs'];

const GrpcRequestPane = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const rightContentRef = useRef(null);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const requestPaneTab = focusedTab?.requestPaneTab;
  const scriptPhases = getPhasesByRequestType(REQUEST_TYPES.GRPC);

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
      case 'script': {
        return <Script item={item} collection={collection} />;
      }
      default: {
        return <div className="mt-4">404 | Not found</div>;
      }
    }
  }, [requestPaneTab, item, collection, handleRun]);

  const body = getPropertyFromDraftOrRequest(item, 'request.body');
  const headers = getPropertyFromDraftOrRequest(item, 'request.headers');
  const docs = getPropertyFromDraftOrRequest(item, 'request.docs');
  const script = getPropertyFromDraftOrRequest(item, 'request.script');

  const itemAuthMode = item.draft?.request?.auth?.mode ?? item.request?.auth?.mode ?? item.root?.request?.auth?.mode;
  const hasAuth = useMemo(
    () => hasEffectiveAuth(collection, item, AUTH_MODES_GRPC),
    [item, itemAuthMode, collection]
  );
  const activeHeadersLength = headers.filter((header) => header.enabled).length;
  const grpcMessagesCount = body?.grpc?.length || 0;

  // Determine if this is a client streaming request
  const request = item.draft ? item.draft.request : item.request;
  const isClientStreaming = request.methodType === 'client-streaming' || request.methodType === 'bidi-streaming';

  const hasScriptError = scriptPhases.some((phase) => item[`${phase.ERROR_STATE_KEY}Message`]);

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
        indicator: hasAuth ? <StatusDot type="default" dataTestId="auth" /> : null
      },
      {
        key: 'docs',
        label: 'Docs',
        indicator: docs && docs.length > 0 ? <StatusDot type="default" /> : null
      },
      {
        key: 'script',
        label: (
          <span className="flex items-center gap-2">
            Script
            <StatusBadge status="info" size="xs">Beta</StatusBadge>
          </span>
        ),
        indicator: scriptPhases.some(({ FIELD }) => script?.[FIELD]) ? (hasScriptError ? <StatusDot type="error" /> : <StatusDot />) : null
      }
    ];
  }, [grpcMessagesCount, isClientStreaming, activeHeadersLength, hasAuth, script, docs, hasScriptError]);

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

  let rightContent = null;
  switch (requestPaneTab) {
    case 'auth':
      rightContent = (
        <div ref={rightContentRef} className="flex flex-grow justify-start items-center">
          <GrpcAuthMode item={item} collection={collection} />
        </div>
      );
      break;
    case 'docs':
      rightContent = (
        <div ref={rightContentRef} className="flex items-center gap-2">
          <DocsAction />
          <TabBarAiAssist item={item} collection={collection} activeTab={requestPaneTab} />
        </div>
      );
      break;
    default:
      rightContent = null;
  }

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
