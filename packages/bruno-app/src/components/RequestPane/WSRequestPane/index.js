import Documentation from 'components/Documentation/index';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import StatusDot from 'components/StatusDot/index';
import { find } from 'lodash';
import { updateRequestTabOrder } from 'providers/ReduxStore/slices/collections/actions';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import { findParentItemInCollection, getPropertyFromDraftOrRequest } from 'utils/collections/index';
import { getEffectiveTabOrder, sortTabs } from 'utils/tabs';
import WsBody from '../WsBody/index';
import WSSettingsPane from '../WSSettingsPane/index';
import StyledWrapper from './StyledWrapper';
import WSAuth from './WSAuth';
import WSAuthMode from './WSAuth/WSAuthMode';

const WSRequestPane = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const preferences = useSelector((state) => state.app.preferences);

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
    const tabs = [
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

    const effectiveTabOrder = (() => {
      const scope = preferences.requestTabOrderPersistenceScope || 'global';
      if (scope === 'folder') {
        const parentFolder = findParentItemInCollection(collection, item.uid);
        return parentFolder?.requestTabOrder;
      }
      return getEffectiveTabOrder(item, collection, preferences);
    })();

    return sortTabs(tabs, effectiveTabOrder);
  }, [activeHeadersLength, auth.mode, docs, preferences, collection, item.uid]);

  const handleTabReorder = useCallback(
    (dragIndex, hoverIndex) => {
      const newOrder = allTabs.map((t) => t.key);
      const [moved] = newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, moved);

      dispatch(updateRequestTabOrder(collection.uid, item.uid, newOrder));
    },
    [allTabs, dispatch, collection.uid, item.uid]
  );

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
        onTabReorder={handleTabReorder}
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
