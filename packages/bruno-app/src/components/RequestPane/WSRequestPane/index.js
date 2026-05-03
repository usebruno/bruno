import React, { useMemo, useCallback, useRef } from 'react';
import Documentation from 'components/Documentation/index';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import StatusDot from 'components/StatusDot/index';
import ActionIcon from 'ui/ActionIcon';
import ToolHint from 'components/ToolHint/index';
import { IconPlus, IconWand } from '@tabler/icons';
import { find, get } from 'lodash';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { useDispatch, useSelector } from 'react-redux';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import { getPropertyFromDraftOrRequest } from 'utils/collections/index';
import { prettifyJsonString, uuid } from 'utils/common/index';
import xmlFormat from 'xml-formatter';
import toast from 'react-hot-toast';
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

  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');

  const selectTab = useCallback(
    (tab) => {
      dispatch(updateRequestPaneTab({
        uid: item.uid,
        requestPaneTab: tab
      }));
    },
    [dispatch, item.uid]
  );

  const addNewMessage = useCallback(() => {
    const currentMessages = Array.isArray(body?.ws)
      ? body.ws.map((msg) => ({ ...msg, selected: false }))
      : [];
    currentMessages.push({
      uid: uuid(),
      name: `message ${currentMessages.length + 1}`,
      content: '{}',
      type: 'json',
      selected: true
    });
    dispatch(updateRequestBody({
      content: currentMessages,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  }, [body, dispatch, item.uid, collection.uid]);

  const onPrettifyAll = useCallback(() => {
    const currentMessages = [...(body?.ws || [])];
    let changed = false;

    currentMessages.forEach((msg, i) => {
      if (msg.type === 'json') {
        try {
          const pretty = prettifyJsonString(msg.content);
          if (pretty !== msg.content) {
            currentMessages[i] = { ...msg, content: pretty };
            changed = true;
          }
        } catch (e) {
          // skip invalid json
        }
      } else if (msg.type === 'xml') {
        try {
          const pretty = xmlFormat(msg.content, { collapseContent: true });
          if (pretty !== msg.content) {
            currentMessages[i] = { ...msg, content: pretty };
            changed = true;
          }
        } catch (e) {
          // skip invalid xml
        }
      }
    });

    if (changed) {
      dispatch(updateRequestBody({
        content: currentMessages,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    } else {
      toast.error('Nothing to prettify');
    }
  }, [body, dispatch, item.uid, collection.uid]);

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
            handleRun={handleRun}
            onAddMessage={addNewMessage}
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
  }, [requestPaneTab, item, collection, handleRun, addNewMessage]);

  if (!activeTabUid || !focusedTab?.uid || !requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  let rightContent = null;
  if (requestPaneTab === 'auth') {
    rightContent = (
      <div ref={rightContentRef} className="flex flex-grow justify-start items-center">
        <WSAuthMode item={item} collection={collection} />
      </div>
    );
  } else if (requestPaneTab === 'body') {
    rightContent = (
      <div ref={rightContentRef} className="flex items-center gap-2">
        <ToolHint text="Prettify All" toolhintId="prettify-all-ws">
          <ActionIcon
            data-testid="ws-prettify-all"
            onClick={onPrettifyAll}
          >
            <IconWand size={14} strokeWidth={1.5} />
          </ActionIcon>
        </ToolHint>
        <ToolHint text="Add Message" toolhintId="add-msg-ws">
          <ActionIcon
            data-testid="ws-add-message"
            onClick={addNewMessage}
          >
            <IconPlus size={15} strokeWidth={1.5} />
          </ActionIcon>
        </ToolHint>
      </div>
    );
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

      <section className="flex w-full flex-1 h-full mt-4">
        <HeightBoundContainer>{tabPanel}</HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default WSRequestPane;
