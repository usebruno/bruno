import { IconDeviceFloppy, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons';
import classnames from 'classnames';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { requestUrlChanged } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { isMacOS } from 'utils/common/platform';
import { hasRequestChanges } from 'utils/collections';
import { unsubscribeGraphqlSubscription } from 'utils/network/index';
import StyledWrapper from './StyledWrapper';
import ToolHint from 'components/ToolHint';
import get from 'lodash/get';

const GraphQLSubscriptionQueryUrl = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const { theme, displayedTheme } = useTheme();
  const saveShortcut = isMacOS() ? '⌘S' : 'Ctrl+S';
  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  const isConnected = useSelector((state) => (state.collections.activeConnections || []).includes(item.uid));
  const statusText = item.response?.statusText;
  const isSubscribed = isConnected && statusText === 'CONNECTED';
  const isConnecting = !isConnected && statusText === 'CONNECTING';

  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');

  const handleSubscribeClick = async (e) => {
    e.stopPropagation();
    if (!url || !(url.startsWith('ws://') || url.startsWith('wss://'))) {
      toast.error('Please enter a valid ws:// or wss:// URL');
      return;
    }
    handleRun(e);
  };

  const handleUnsubscribeClick = async (e) => {
    e && e.stopPropagation();
    unsubscribeGraphqlSubscription(item.uid).catch((err) => {
      console.error('Failed to unsubscribe from GraphQL subscription:', err);
      toast.error('Failed to unsubscribe');
    });
  };

  const onSave = () => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  const handleUrlChange = (value) => {
    const finalUrl = value?.trim() ?? value;
    dispatch(requestUrlChanged({
      itemUid: item.uid,
      collectionUid: collection.uid,
      url: finalUrl
    }));
  };

  return (
    <StyledWrapper>
      <div className="flex items-center h-full">
        <div className="flex items-center input-container flex-1 min-w-0 h-full relative">
          <div className="flex items-center justify-center px-[10px]">
            <span className="text-xs font-medium method-graphql-subscription">SUB</span>
          </div>
          <SingleLineEditor
            value={url}
            onSave={onSave}
            onChange={handleUrlChange}
            placeholder="wss://example.com/graphql"
            className="w-full"
            theme={displayedTheme}
            onRun={handleRun}
            collection={collection}
            item={item}
          />
          <div className="flex items-center h-full gap-3 mx-3">
            <ToolHint text={`Save (${saveShortcut})`} toolhintId="gql-sub-save-request" place="top" positionStrategy="fixed">
              <button
                type="button"
                className="flex items-center action-button"
                data-testid="save-request-button"
                aria-label={`Save (${saveShortcut})`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasChanges) return;
                  onSave();
                }}
              >
                <IconDeviceFloppy
                  color={hasChanges ? theme.draftColor : theme.requestTabs.icon.color}
                  strokeWidth={1.5}
                  size={20}
                  className={classnames('save-icon', { 'has-changes': hasChanges })}
                />
              </button>
            </ToolHint>

            {isSubscribed ? (
              <ToolHint text="Unsubscribe" toolhintId="gql-sub-unsubscribe" place="top" positionStrategy="fixed">
                <button
                  type="button"
                  className="flex items-center action-button"
                  onClick={handleUnsubscribeClick}
                  data-testid="gql-sub-unsubscribe-button"
                  aria-label="Unsubscribe"
                >
                  <IconPlugConnectedX
                    color={theme.colors.text.danger}
                    strokeWidth={1.5}
                    size={20}
                    className="unsubscribe-icon"
                  />
                </button>
              </ToolHint>
            ) : (
              <ToolHint text="Subscribe" toolhintId="gql-sub-subscribe" place="top" positionStrategy="fixed">
                <button
                  type="button"
                  className="flex items-center action-button"
                  onClick={handleSubscribeClick}
                  data-testid="gql-sub-subscribe-button"
                  aria-label="Subscribe"
                >
                  <IconPlugConnected
                    className={classnames('subscribe-icon', { connecting: isConnecting })}
                    color={theme.colors.text.green}
                    strokeWidth={1.5}
                    size={20}
                  />
                </button>
              </ToolHint>
            )}
          </div>
          {isSubscribed && <div className="connection-status-strip"></div>}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default GraphQLSubscriptionQueryUrl;
