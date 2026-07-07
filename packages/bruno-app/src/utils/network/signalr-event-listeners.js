import { useEffect } from 'react';
import { wsResponseReceived, runWsRequestEvent } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';

const useSignalrEventListeners = () => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    const removeStateChanged = ipcRenderer.on('main:signalr:state-changed', (requestId, collectionUid, status, eventData) => {
      if (status === 'connected') {
        dispatch(runWsRequestEvent({
          eventType: 'request',
          itemUid: requestId,
          collectionUid,
          requestUid: requestId,
          eventData: {
            url: eventData?.url || '',
            method: 'SIGNALR',
            headers: [
              { name: 'Upgrade', value: 'websocket' },
              { name: 'Connection', value: 'Upgrade' }
            ],
            data: 'SignalR connection established',
            timestamp: Date.now()
          }
        }));
      }

      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid,
        eventType: status === 'connected' ? 'open' : status === 'reconnecting' ? 'connecting' : 'close',
        eventData
      }));
    });

    const removeError = ipcRenderer.on('main:signalr:error', (requestId, collectionUid, errorData) => {
      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid,
        eventType: 'error',
        eventData: errorData
      }));
    });

    const removeHubEvent = ipcRenderer.on('main:signalr:event', (requestId, collectionUid, eventName, args) => {
      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid,
        eventType: 'message',
        eventData: {
          message: typeof args !== 'undefined' && args !== null ? JSON.stringify({ eventName, args }) : eventName,
          type: 'incoming',
          timestamp: Date.now()
        }
      }));
    });

    return () => {
      removeStateChanged();
      removeError();
      removeHubEvent();
    };
  }, [isElectron]);
};

export default useSignalrEventListeners;
