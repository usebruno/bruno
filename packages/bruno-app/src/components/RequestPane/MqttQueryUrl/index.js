import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { IconPlugConnected, IconPlugConnectedX, IconDeviceFloppy, IconArrowRight } from '@tabler/icons';
import classnames from 'classnames';
import { requestUrlChanged } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { connectMqtt, disconnectMqtt, getMqttConnectionStatus, publishMqtt } from 'utils/network/index';
import { useTheme } from 'providers/Theme';
import { isMacOS } from 'utils/common/platform';
import { hasRequestChanges } from 'utils/collections';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
};

const useMqttConnectionStatus = (requestId) => {
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const result = await getMqttConnectionStatus(requestId);
        setConnectionStatus(result?.status ?? CONNECTION_STATUS.DISCONNECTED);
      } catch (e) {
        // ignore
      }
    };
    checkConnectionStatus();
    const interval = setInterval(checkConnectionStatus, 2000);
    return () => clearInterval(interval);
  }, [requestId]);
  return connectionStatus;
};

const MqttQueryUrl = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const connectionStatus = useMqttConnectionStatus(item.uid);
  const saveShortcut = isMacOS() ? '⌘S' : 'Ctrl+S';
  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  const itemUid = item.uid;
  const collectionUid = collection.uid;
  const url = item.draft ? item.draft.request?.url : item.request?.url;

  const handleUrlChange = useCallback((e) => {
    dispatch(requestUrlChanged({ itemUid, collectionUid, url: e.target.value }));
  }, [dispatch, itemUid, collectionUid]);

  const handleConnect = useCallback(async () => {
    try {
      const environment = collection.environments?.find((e) => e.uid === collection.activeEnvironmentUid);
      const runtimeVariables = collection.runtimeVariables || {};
      await connectMqtt(item, collection, environment, runtimeVariables);
    } catch (err) {
      toast.error(err.message || 'Failed to connect');
    }
  }, [item, collection]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectMqtt(itemUid);
    } catch (err) {
      toast.error(err.message || 'Failed to disconnect');
    }
  }, [itemUid]);

  const handleSave = useCallback(() => {
    dispatch(saveRequest(itemUid, collectionUid));
  }, [dispatch, itemUid, collectionUid]);

  const handlePublish = useCallback(async () => {
    try {
      const environment = collection.environments?.find((e) => e.uid === collection.activeEnvironmentUid);
      const runtimeVariables = collection.runtimeVariables || {};
      await publishMqtt(item, collection, environment, runtimeVariables);
    } catch (err) {
      toast.error(err.message || 'Failed to publish');
    }
  }, [item, collection]);

  const isConnected = connectionStatus === CONNECTION_STATUS.CONNECTED;
  const isConnecting = connectionStatus === CONNECTION_STATUS.CONNECTING;

  return (
    <StyledWrapper>
      <div className="flex items-center h-full">
        <div className="flex items-center input-container flex-1 w-full h-full relative">
          <div className="flex items-center justify-center px-[10px]">
            <span className="text-xs font-medium method-mqtt">MQTT</span>
          </div>
          <input
            className="url-input flex-1 h-full outline-none text-sm"
            type="text"
            value={url || ''}
            onChange={handleUrlChange}
            placeholder="mqtt://broker.hivemq.com:1883"
          />
          <div className="flex items-center h-full cursor-pointer gap-3 mx-3">
            <div
              className="infotip"
              data-testid="mqtt-save-button"
              onClick={(e) => {
                e.stopPropagation();
                if (!hasChanges) return;
                handleSave();
              }}
            >
              <IconDeviceFloppy
                color={hasChanges ? theme.draftColor : theme.requestTabs.icon.color}
                strokeWidth={1.5}
                size={20}
                className={`${hasChanges ? 'cursor-pointer' : 'cursor-default'}`}
              />
              <span className="infotip-text text-xs">
                Save <span className="shortcut">({saveShortcut})</span>
              </span>
            </div>

            {isConnected ? (
              <div className="connection-controls relative flex items-center h-full">
                <div className="infotip" onClick={handleDisconnect} data-testid="mqtt-disconnect-button">
                  <IconPlugConnectedX
                    color={theme.colors.text.danger}
                    strokeWidth={1.5}
                    size={20}
                    className="cursor-pointer"
                  />
                  <span className="infotip-text text-xs">Disconnect</span>
                </div>
              </div>
            ) : (
              <div className="connection-controls relative flex items-center h-full">
                <div className="infotip" onClick={handleConnect} data-testid="mqtt-connect-button">
                  <IconPlugConnected
                    className={classnames('cursor-pointer', {
                      'animate-pulse': isConnecting
                    })}
                    color={theme.colors.text.green}
                    strokeWidth={1.5}
                    size={20}
                  />
                  <span className="infotip-text text-xs">{isConnecting ? 'Connecting...' : 'Connect'}</span>
                </div>
              </div>
            )}

            <div className="cursor-pointer" onClick={handlePublish} data-testid="mqtt-publish-button">
              <IconArrowRight color={theme.requestTabPanel.url.icon} strokeWidth={1.5} size={20} />
            </div>
          </div>
        </div>
      </div>

      {isConnected && <div className="connection-status-strip"></div>}
    </StyledWrapper>
  );
};

export default MqttQueryUrl;
