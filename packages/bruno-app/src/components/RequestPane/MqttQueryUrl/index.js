import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { IconPlugConnected, IconPlugConnectedX } from '@tabler/icons';
import { requestUrlChanged } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { connectMqtt, disconnectMqtt, getMqttConnectionStatus } from 'utils/network/index';
import { useTheme } from 'providers/Theme';
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

  const isConnected = connectionStatus === CONNECTION_STATUS.CONNECTED;
  const isConnecting = connectionStatus === CONNECTION_STATUS.CONNECTING;

  const statusColor = isConnected
    ? theme.colors.text.green
    : isConnecting
      ? theme.colors.text.yellow
      : theme.colors.text.subtext0;

  return (
    <StyledWrapper className="flex items-center w-full gap-2">
      <div className="flex items-center gap-1.5">
        <div
          className="rounded-full"
          style={{ width: 8, height: 8, backgroundColor: statusColor }}
          title={connectionStatus}
        />
        <span className="text-xs uppercase font-medium" style={{ color: statusColor, minWidth: 80 }}>
          {connectionStatus}
        </span>
      </div>

      <input
        className="url-input flex-1 px-3 py-1.5 text-sm border rounded outline-none"
        type="text"
        value={url || ''}
        onChange={handleUrlChange}
        placeholder="mqtt://broker.hivemq.com:1883"
      />

      {isConnected ? (
        <button
          className="disconnect-btn flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded"
          onClick={handleDisconnect}
          data-testid="mqtt-disconnect-button"
        >
          <IconPlugConnectedX size={16} />
          Disconnect
        </button>
      ) : (
        <button
          className="connect-btn flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded"
          onClick={handleConnect}
          disabled={isConnecting}
          data-testid="mqtt-connect-button"
        >
          <IconPlugConnected size={16} />
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      )}

      <button
        className="save-btn px-3 py-1.5 text-sm border rounded"
        onClick={handleSave}
        title="Save"
        data-testid="mqtt-save-button"
      >
        Save
      </button>
    </StyledWrapper>
  );
};

export default MqttQueryUrl;
