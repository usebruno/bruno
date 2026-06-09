import { useEffect } from 'react';
import { amqpResponseEvent } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import { updateActiveConnectionsInStore } from 'providers/ReduxStore/slices/collections/actions';

// Mirrors useGrpcEventListeners / useWsEventListeners: a single place that turns
// `main:amqp:*` IPC events into Redux dispatches, so AMQP response state (message
// log, activity timeline, connection flags) lives in the store and survives tab
// switches and component remounts.
const useAmqpEventListeners = () => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    const forward = (eventType) => (requestUid, collectionUid, eventData) => {
      dispatch(
        amqpResponseEvent({
          itemUid: requestUid,
          collectionUid,
          eventType,
          eventData: eventData || {}
        })
      );
    };

    const removeMessageReceived = ipcRenderer.on('main:amqp:message-received', forward('message-received'));
    const removeMessagePublished = ipcRenderer.on('main:amqp:message-published', forward('message-published'));
    const removeConsuming = ipcRenderer.on('main:amqp:consuming', forward('consuming'));
    const removeConsumerStopped = ipcRenderer.on('main:amqp:consumer-stopped', forward('consumer-stopped'));
    const removeConnected = ipcRenderer.on('main:amqp:connected', forward('connected'));
    const removeDisconnected = ipcRenderer.on('main:amqp:disconnected', forward('disconnected'));
    const removeError = ipcRenderer.on('main:amqp:error', forward('error'));
    const removeDebug = ipcRenderer.on('main:amqp:debug', forward('debug'));

    const removeConnectionsChanged = ipcRenderer.on('main:amqp:connections-changed', (data) => {
      dispatch(updateActiveConnectionsInStore(data));
    });

    return () => {
      removeMessageReceived();
      removeMessagePublished();
      removeConsuming();
      removeConsumerStopped();
      removeConnected();
      removeDisconnected();
      removeError();
      removeDebug();
      removeConnectionsChanged();
    };
  }, [isElectron]);
};

export default useAmqpEventListeners;
