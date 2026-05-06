import React, { useMemo, useCallback, useRef } from 'react';
import Documentation from 'components/Documentation/index';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import StatusDot from 'components/StatusDot/index';
import { find } from 'lodash';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch, useSelector } from 'react-redux';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import { getPropertyFromDraftOrRequest } from 'utils/collections/index';
import WsBody from '../WsBody/index';
import StyledWrapper from './StyledWrapper';
import WSAuth from './WSAuth';
import WSAuthMode from './WSAuth/WSAuthMode';
import WSSettingsPane from '../WSSettingsPane/index';

const WSRequestPane = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const rightContentRef = useRef(null);

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const requestPaneTab = focusedTab?.requestPaneTab;

  const selectTab = useCallback(
    (tab) => {
      dispatch(updateRequestPaneTab({
        uid: item.uid,
        requestPaneTab: tab
      }));
    },
    [dispatch, item.uid]
  );

  const headers = getPropertyFromDraftOrRequest(item, 'request.headers');
  const docs = getPropertyFromDraftOrRequest(item, 'request.docs');
  const auth = getPropertyFromDraftOrRequest(item, 'request.auth');

  const activeHeadersLength = headers.filter((header) => header.enabled).length;

  const allTabs = useMemo(() => {
    return [
      {
        key: 'body',
        label: 'Message',
        indicator: null
      },
      {
        key: 'headers',
        label: 'Headers',
        indicator: activeHeadersLength > 0 ? <sup className="ml-[.125rem] font-medium">{activeHeadersLength}</sup> : null
      },
      {
        key: 'auth',
        label: 'Auth',
        indicator: auth.mode !== 'none' ? <StatusDot type="default" /> : null
      },
      {
        key: 'settings',
        label: 'Settings',
        indicator: null
      },
      {
        key: 'docs',
        label: 'Docs',
        indicator: docs && docs.length > 0 ? <StatusDot type="default" /> : null
      }
    ];
  }, [activeHeadersLength, auth.mode, docs]);

  const tabPanel = useMemo(() => {
    switch (requestPaneTab) {
      case 'body': {
        return (
          <WsBody
            item={item}
            collection={collection}
            hideModeSelector={true}
            hidePrettifyButton={true}
            handleRun={handleRun}
          />
        );
      }
      case 'headers': {
        return <RequestHeaders item={item} collection={collection} addHeaderText="Add Headers" />;
      }
      case 'settings': {
        return <WSSettingsPane item={item} collection={collection} />;
      }
      case 'auth': {
        return <WSAuth item={item} collection={collection} />;
      }
      case 'docs': {
        return <Documentation item={item} collection={collection} />;
      }
      default: {
        return <div className="mt-4">404 | Not found</div>;
      }
    }
  }, [requestPaneTab, item, collection, handleRun]);

  if (!activeTabUid || !focusedTab?.uid || !requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const rightContent = requestPaneTab === 'auth' ? (
    <div ref={rightContentRef} className="flex flex-grow justify-start items-center">
      <WSAuthMode item={item} collection={collection} />
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

      <section className="flex w-full flex-1 h-full mt-4">
        <HeightBoundContainer>{tabPanel}</HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default WSRequestPane;
