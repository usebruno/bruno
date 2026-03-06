import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { IconPlugConnected, IconPlugConnectedX } from '@tabler/icons';
import { requestUrlChanged } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { connectMqtt, disconnectMqtt, getMqttConnectionStatus } from 'utils/network/index';
import { useTheme } from 'providers/Theme';
import toast from 'react-hot-toast';

const MqttQueryUrl = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const itemUid = item.uid;
  const collectionUid = collection.uid;
  const url = item.draft ? item.draft.request?.url : item.request?.url;

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await getMqttConnectionStatus(itemUid);
        if (result?.status) {
          setConnectionStatus(result.status);
        }
      } catch (e) {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [itemUid]);

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

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  const statusColor = isConnected ? '#2ecc71' : isConnecting ? '#f39c12' : '#95a5a6';

  return (
    <div className="flex items-center w-full gap-2">
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
        className="flex-1 px-3 py-1.5 text-sm border rounded outline-none"
        type="text"
        value={url || ''}
        onChange={handleUrlChange}
        placeholder="mqtt://broker.hivemq.com:1883"
      />

      {isConnected ? (
        <button
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded hover:bg-red-600"
          onClick={handleDisconnect}
        >
          <IconPlugConnectedX size={16} />
          Disconnect
        </button>
      ) : (
        <button
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          <IconPlugConnected size={16} />
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      )}

      <button
        className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={handleSave}
        title="Save"
      >
        Save
      </button>
    </div>
  );
};

export default MqttQueryUrl;
