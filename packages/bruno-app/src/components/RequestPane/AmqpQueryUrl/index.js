import { IconDeviceFloppy } from '@tabler/icons';
import SendButton from 'components/RequestPane/SendButton';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { requestUrlChanged } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { isMacOS } from 'utils/common/platform';
import { hasRequestChanges, findEnvironmentInCollection } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import get from 'lodash/get';

const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
};

const AmqpQueryUrl = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const { theme, displayedTheme } = useTheme();
  const saveShortcut = isMacOS() ? '⌘S' : 'Ctrl+S';
  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');

  const handleConnect = async () => {
    try {
      setConnectionStatus(CONNECTION_STATUS.CONNECTING);
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:amqp:connect', {
        itemUid: item.uid,
        request: item.draft ? item.draft.request : item.request,
        collection,
        environment: findEnvironmentInCollection(collection, collection.activeEnvironmentUid),
        runtimeVariables: collection.runtimeVariables || {},
        settings: item.settings?.settings || {}
      });
      if (result.success) {
        setConnectionStatus(CONNECTION_STATUS.CONNECTED);
        toast.success('AMQP connected');
        return true;
      }
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      toast.error(`AMQP connection failed: ${result.error}`);
      return false;
    } catch (err) {
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      toast.error(`AMQP connection error: ${err.message}`);
      return false;
    }
  };

  const handleRunClick = async (e) => {
    e?.stopPropagation?.();
    if (!url) {
      toast.error('Please enter a valid AMQP URL');
      return;
    }

    const { ipcRenderer } = window;

    try {
      // Auto-connect if not already connected
      if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
        const connected = await handleConnect();
        if (!connected) return;
      }

      // Send the full request context so the main process can interpolate variables
      // (env, runtime, dynamic) in the body, headers, exchange and routing key.
      const result = await ipcRenderer.invoke('renderer:amqp:publish', {
        itemUid: item.uid,
        request: item.draft ? item.draft.request : item.request,
        collection,
        environment: findEnvironmentInCollection(collection, collection.activeEnvironmentUid),
        runtimeVariables: collection.runtimeVariables || {},
        settings: item.settings?.settings || {},
        options: {}
      });

      if (result.success) {
        toast.success('Message published (confirmed by broker)');
      } else {
        toast.error(`Publish failed: ${result.error}`);
      }
    } catch (err) {
      toast.error(`Publish error: ${err.message}`);
    }
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

  // Listen for AMQP events from main process
  useEffect(() => {
    const { ipcRenderer } = window;
    const handleConnected = (requestUid, collectionUid) => {
      if (requestUid === item.uid && collectionUid === collection.uid) {
        setConnectionStatus(CONNECTION_STATUS.CONNECTED);
      }
    };
    const handleDisconnected = (requestUid, collectionUid) => {
      if (requestUid === item.uid && collectionUid === collection.uid) {
        setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      }
    };
    const handleError = (requestUid, collectionUid, data) => {
      if (requestUid === item.uid && collectionUid === collection.uid) {
        toast.error(`AMQP error: ${data?.message || 'Unknown error'}`);
      }
    };

    const removeConnected = ipcRenderer.on('main:amqp:connected', handleConnected);
    const removeDisconnected = ipcRenderer.on('main:amqp:disconnected', handleDisconnected);
    const removeError = ipcRenderer.on('main:amqp:error', handleError);

    return () => {
      removeConnected();
      removeDisconnected();
      removeError();
    };
  }, [item.uid, collection.uid]);

  return (
    <StyledWrapper>
      <div className="flex items-center h-full">
        <div className="flex items-center input-container flex-1 min-w-0 h-full relative">
          <div className="flex items-center justify-center px-[10px]">
            <span className="text-xs font-medium method-amqp">AMQP</span>
          </div>
          <SingleLineEditor
            value={url}
            onSave={onSave}
            onChange={handleUrlChange}
            placeholder="amqp://localhost:5672"
            className="w-full"
            theme={displayedTheme}
            onRun={handleRunClick}
            collection={collection}
            item={item}
          />
          <div className="flex items-center h-full cursor-pointer gap-3 mx-3">
            <div
              className="infotip"
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
                className={`${hasChanges ? 'cursor-pointer' : 'cursor-default'}`}
              />
              <span className="infotip-text text-xs">
                Save <span className="shortcut">({saveShortcut})</span>
              </span>
            </div>
          </div>
        </div>
        <SendButton
          onSend={handleRunClick}
          testId="run-button"
        />
      </div>
    </StyledWrapper>
  );
};

export default AmqpQueryUrl;
