import React from 'react';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import GrpcBody from 'components/RequestPane/GrpcBody';
import GrpcAuth from './GrpcAuth/index';
import StatusDot from 'components/StatusDot/index';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import StyledWrapper from './StyledWrapper';
import { find, get } from 'lodash';
import Documentation from 'components/Documentation/index';
import { useEffect } from 'react';
import { getPropertyFromDraftOrRequest } from 'utils/collections/index';

const GrpcRequestPane = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const selectTab = (tab) => {
    dispatch(
      updateRequestPaneTab({
        uid: item.uid,
        requestPaneTab: tab
      })
    );
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'body': {
        return <GrpcBody item={item} collection={collection} hideModeSelector={true} hidePrettifyButton={true} handleRun={handleRun}/>;
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
  };

  if (!activeTabUid) {
    return <div>Something went wrong</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === focusedTab.requestPaneTab
    });
  };

  const isMultipleContentTab = ['script', 'vars', 'auth', 'docs'].includes(focusedTab.requestPaneTab);
  const body = getPropertyFromDraftOrRequest(item, 'request.body');
  const headers = getPropertyFromDraftOrRequest(item, 'request.headers');
  const docs = getPropertyFromDraftOrRequest(item, 'request.docs');
  const auth = getPropertyFromDraftOrRequest(item, 'request.auth');

  const activeHeadersLength = headers.filter((header) => header.enabled).length;
  const grpcMessagesCount = body?.grpc?.length || 0;

  // Determine if this is a client streaming request
  const request = item.draft ? item.draft.request : item.request;
  const isClientStreaming = request.methodType === 'client-streaming' || request.methodType === 'bidi-streaming';

  useEffect(() => {
    // Only set the tab to 'body' if no tab is currently set
    if (!focusedTab?.requestPaneTab) {
      selectTab('body');
    }
  }, []);

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('body')} role="tab" onClick={() => selectTab('body')}>
          Message
          {grpcMessagesCount > 0 && (
            isClientStreaming ? (
              <sup className="ml-[.125rem] font-medium">{grpcMessagesCount}</sup>
            ) : (
              <StatusDot />
            )
          )}
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Metadata
          {activeHeadersLength > 0 && <sup className="ml-[.125rem] font-medium">{activeHeadersLength}</sup>}
        </div>
        <div className={getTabClassname('auth')} role="tab" onClick={() => selectTab('auth')}>
          Auth
          {auth.mode !== 'none' && <StatusDot type="default" />}
        </div>
        <div className={getTabClassname('docs')} role="tab" onClick={() => selectTab('docs')}>
          Docs
          {docs && docs.length > 0 && <StatusDot type="default" />}
        </div>
      </div>
      <section
        className={classnames('flex w-full flex-1 h-full', {
          'mt-2': !isMultipleContentTab
        })}
      >
        <HeightBoundContainer>
          {getTabPanel(focusedTab.requestPaneTab)}
        </HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default GrpcRequestPane;
