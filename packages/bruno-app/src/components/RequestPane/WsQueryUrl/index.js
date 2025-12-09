import { IconArrowRight, IconDeviceFloppy, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons';
import classnames from 'classnames';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { requestUrlChanged } from 'providers/ReduxStore/slices/collections';
import { wsConnectOnly, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { isMacOS } from 'utils/common/platform';
import { hasRequestChanges } from 'utils/collections';
import { closeWsConnection, getWsConnectionStatus } from 'utils/network/index';
import StyledWrapper from './StyledWrapper';
import { interpolateUrl } from 'utils/url';
import { getAllVariables } from 'utils/collections';
import useDebounce from 'hooks/useDebounce';
import get from 'lodash/get';

const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
};

const useWsConnectionStatus = (requestId) => {
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  useEffect(() => {
    const checkConnectionStatus = async () => {
      const result = await getWsConnectionStatus(requestId);
      setConnectionStatus(result?.status ?? CONNECTION_STATUS.DISCONNECTED);
    };
    checkConnectionStatus();
    const interval = setInterval(checkConnectionStatus, 2000);
    return () => clearInterval(interval);
  }, [requestId]);
  return [connectionStatus, setConnectionStatus];
};

const WsQueryUrl = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const { theme, displayedTheme } = useTheme();
  // TODO: reaper, better state for connecting
  const saveShortcut = isMacOS() ? '⌘S' : 'Ctrl+S';
  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  const [connectionStatus, setConnectionStatus] = useWsConnectionStatus(item.uid);
  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');

  const allVariables = useMemo(() => {
    return getAllVariables(collection, item);
  }, [collection, item]);

  const interpolatedURL = useMemo(() => {
    if (!url) return '';
    return interpolateUrl({ url, variables: allVariables }) || '';
  }, [url, allVariables]);

  // Debounce interpolated URL to avoid excessive reconnections
  const debouncedInterpolatedURL = useDebounce(interpolatedURL, 400);
  const previousDeboundedInterpolatedURL = useRef(debouncedInterpolatedURL);

  const handleConnect = async () => {
    dispatch(wsConnectOnly(item, collection.uid));
    previousDeboundedInterpolatedURL.current = debouncedInterpolatedURL;
  };

  const handleDisconnect = async (e, notify) => {
    e && e.stopPropagation();
    closeWsConnection(item.uid)
      .then(() => {
        notify && toast.success('WebSocket connection closed');
        setConnectionStatus('disconnected');
      })
      .catch((err) => {
        console.error('Failed to close WebSocket connection:', err);
        notify && toast.error('Failed to close WebSocket connection');
      });
  };

  const handleReconnect = async (e) => {
    e && e.stopPropagation();
    try {
      handleDisconnect(e, false);
      setTimeout(() => {
        handleConnect(e, false);
      }, 2000);
    } catch (err) {
      console.error('Failed to re-connect WebSocket connection', err);
    }
  };

  const handleRunClick = async (e) => {
    e.stopPropagation();
    if (!url) {
      toast.error('Please enter a valid WebSocket URL');
      return;
    }
    handleRun(e);
  };

  const onSave = (finalValue) => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  const handleUrlChange = (value) => {
    const finalUrl = value?.trim() ?? value;
    console.log('finalUrl: ', finalUrl);
    dispatch(requestUrlChanged({
      itemUid: item.uid,
      collectionUid: collection.uid,
      url: finalUrl
    }));
  };

  // Detect interpolated URL changes and reconnect if connection is active
  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    if (previousDeboundedInterpolatedURL.current === debouncedInterpolatedURL) return;
    if (debouncedInterpolatedURL === '') return;
    handleReconnect();
  }, [debouncedInterpolatedURL, connectionStatus]);

  return (
    <StyledWrapper>

      <div className="flex items-center input-container flex-1 unified-input-container h-full relative">
        <div className="flex items-center justify-center w-16">
          <span className="text-xs font-bold method-ws">WS</span>
        </div>
        <SingleLineEditor
          value={url}
          onSave={(finalValue) => onSave(finalValue)}
          onChange={handleUrlChange}
          placeholder="ws://localhost:8080 or wss://example.com"
          className="flex-1 min-w-0"
          theme={displayedTheme}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
        <div className="flex items-center h-full mx-2">
          <div
            className="infotip"
            onClick={(e) => {
              e.stopPropagation();
              if (!hasChanges) return;
              onSave();
            }}
          >
            <IconDeviceFloppy
              color={hasChanges ? theme.colors.text.yellow : theme.requestTabs.icon.color}
              strokeWidth={1.5}
              size={22}
              className={`${hasChanges ? 'cursor-pointer' : 'cursor-default'}`}
            />
            <span className="infotip-text text-xs">
              Save <span className="shortcut">({saveShortcut})</span>
            </span>
          </div>

          {connectionStatus === 'connected' && (
            <div className="connection-controls relative flex items-center h-full gap-3 mr-3">
              <div className="infotip" onClick={(e) => handleDisconnect(e, true)}>
                <IconPlugConnectedX
                  color={theme.colors.text.danger}
                  strokeWidth={1.5}
                  size={22}
                  className="cursor-pointer"
                />
                <span className="infotip-text text-xs">Close Connection</span>
              </div>
            </div>
          )}

          {connectionStatus !== 'connected' && (
            <div className="connection-controls relative flex items-center h-full gap-3">
              <div className="infotip" onClick={handleConnect}>
                <IconPlugConnected
                  className={classnames('cursor-pointer', {
                    'animate-pulse': connectionStatus === CONNECTION_STATUS.CONNECTING
                  })}
                  color={theme.colors.text.green}
                  strokeWidth={1.5}
                  size={22}
                />
                <span className="infotip-text text-xs">Connect</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        className="send-button"
        onClick={handleRunClick}
        data-testid="run-button"
      >
        Send
      </button>

      {connectionStatus === CONNECTION_STATUS.CONNECTED && <div className="connection-status-strip"></div>}
    </StyledWrapper>
  );
};

export default WsQueryUrl;
