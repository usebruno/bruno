import { IconArrowRight, IconDeviceFloppy, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons';
import { IconWebSocket } from 'components/Icons/Grpc';
import classnames from 'classnames';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { requestUrlChanged } from 'providers/ReduxStore/slices/collections';
import { wsConnectOnly, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { getPropertyFromDraftOrRequest } from 'utils/collections';
import { isMacOS } from 'utils/common/platform';
import { hasRequestChanges } from 'utils/collections';
import { closeWsConnection, isWsConnectionActive } from 'utils/network/index';
import StyledWrapper from './StyledWrapper';
import get from 'lodash/get';
import { interpolateUrl } from 'utils/url';
import { getAllVariables } from 'utils/collections';
import useDebounce from 'hooks/useDebounce';

const WsQueryUrl = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const { theme, displayedTheme } = useTheme();
  const [isConnectionActive, setIsConnectionActive] = useState(false);
  // TODO: reaper, better state for connecting
  const [isConnecting, setIsConnecting] = useState(false);
  const response = item.draft ? get(item, 'draft.response', {}) : get(item, 'response', {});
  const saveShortcut = isMacOS() ? '⌘S' : 'Ctrl+S';
  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  const showConnectingPulse = isConnecting && response.status !== 'CLOSED';
  const lastInterpolatedUrlRef = useRef(null);
  const previousActiveStateRef = useRef(false);

  const allVariables = useMemo(() => {
    return getAllVariables(collection, item);
  }, [collection, item]);

  const url = getPropertyFromDraftOrRequest(item, 'request.url');

  // Compute interpolated URL directly (no state update in useMemo)
  const interpolatedURL = useMemo(() => {
    if (!url) return '';
    return interpolateUrl({ url, variables: allVariables }) || '';
  }, [url, allVariables]);

  // Debounce interpolated URL to avoid excessive reconnections
  const debouncedInterpolatedURL = useDebounce(interpolatedURL, 400);

  // Check connection status and store interpolated URL when connection becomes active
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const result = await isWsConnectionActive(item.uid);
        const active = Boolean(result.isActive);
        const wasActive = previousActiveStateRef.current;

        setIsConnectionActive(active);
        setIsConnecting(false);

        // Store interpolated URL when connection becomes active
        if (active && !wasActive && debouncedInterpolatedURL) {
          lastInterpolatedUrlRef.current = debouncedInterpolatedURL;
        }

        // Reset stored URL when connection becomes inactive
        if (!active && wasActive) {
          lastInterpolatedUrlRef.current = null;
        }

        previousActiveStateRef.current = active;
      } catch (error) {
        setIsConnectionActive(false);
        setIsConnecting(false);
        previousActiveStateRef.current = false;
      }
    };

    checkConnectionStatus();
    const interval = setInterval(checkConnectionStatus, 2000);
    return () => clearInterval(interval);
  }, [item.uid, debouncedInterpolatedURL]);

  const onUrlChange = (value) => {
    closeWsConnection(item.uid);
    dispatch(requestUrlChanged({
      url: value,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const handleCloseConnection = (e) => {
    e.stopPropagation();

    closeWsConnection(item.uid)
      .then(() => {
        toast.success('WebSocket connection closed');
        setIsConnectionActive(false);
        setIsConnecting(false);
      })
      .catch((err) => {
        console.error('Failed to close WebSocket connection:', err);
        toast.error('Failed to close WebSocket connection');
      });
  };

  const handleRunClick = async (e) => {
    e.stopPropagation();
    if (!url) {
      toast.error('Please enter a valid WebSocket URL');
      return;
    }
    handleRun(e);
  };

  const handleConnect = (e) => {
    setIsConnecting(true);
    dispatch(wsConnectOnly(item, collection.uid));
  };

  const onSave = (finalValue) => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  // Detect interpolated URL changes and reconnect if connection is active
  useEffect(() => {
    // Skip if connection is not active or URL is empty
    if (!isConnectionActive || !debouncedInterpolatedURL) {
      return;
    }

    // Skip if this is the initial URL (stored when connection became active)
    if (lastInterpolatedUrlRef.current === null) {
      lastInterpolatedUrlRef.current = debouncedInterpolatedURL;
      return;
    }

    // If interpolated URL changed, disconnect and reconnect
    if (debouncedInterpolatedURL !== lastInterpolatedUrlRef.current) {
      const handleReconnect = async () => {
        try {
          // Close existing connection
          closeWsConnection(item.uid).then(() => {
            dispatch(wsConnectOnly(item, collection.uid));
          }).finally(() => {
            lastInterpolatedUrlRef.current = debouncedInterpolatedURL;
          });
        } catch (error) {
          console.error('Failed to reconnect WebSocket after URL change:', error);
        }
      };
      handleReconnect();
    }
  }, [debouncedInterpolatedURL, isConnectionActive, item.uid, collection.uid, dispatch]);

  return (
    <StyledWrapper>
      <div className="flex items-center h-full">
        <div className="flex items-center input-container flex-1 w-full input-container pr-2 h-full relative">
          <div className="flex items-center justify-center w-16">
            <span className="text-xs font-bold method-ws">WS</span>
          </div>
          <SingleLineEditor
            value={url}
            onSave={(finalValue) => onSave(finalValue)}
            onChange={onUrlChange}
            placeholder="ws://localhost:8080 or wss://example.com"
            className="w-full"
            theme={displayedTheme}
            onRun={handleRun}
            collection={collection}
            item={item}
          />
          <div className="flex items-center h-full mr-2 cursor-pointer">
            <div
              className="infotip mr-3"
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

            {isConnectionActive && (
              <div className="connection-controls relative flex items-center h-full gap-3 mr-3">
                <div className="infotip" onClick={handleCloseConnection}>
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

            {!isConnectionActive && (
              <div className="connection-controls relative flex items-center h-full gap-3 mr-3">
                <div className="infotip" onClick={handleConnect}>
                  <IconPlugConnected
                    className={
                      classnames('cursor-pointer', {
                        'animate-pulse': showConnectingPulse
                      })
                    }
                    color={theme.colors.text.green}
                    strokeWidth={1.5}
                    size={22}
                  />
                  <span className="infotip-text text-xs">Connect</span>
                </div>
              </div>
            )}

            <div data-testid="run-button" className="cursor-pointer" onClick={handleRunClick}>
              <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={22} />
            </div>
          </div>
        </div>
      </div>

      {isConnectionActive && <div className="connection-status-strip"></div>}
    </StyledWrapper>
  );
};

export default WsQueryUrl;
