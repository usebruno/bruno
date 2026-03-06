import { useEffect } from 'react';
import { mqttResponseReceived, runMqttRequestEvent } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';

const useMqttEventListeners = () => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    const removeMqttRequestSentListener = ipcRenderer.on('main:mqtt:request', (requestId, collectionUid, eventData) => {
      dispatch(runMqttRequestEvent({
        eventType: 'request',
        itemUid: requestId,
        collectionUid: collectionUid,
        eventData
      }));
    });

    const removeMqttMessageListener = ipcRenderer.on('main:mqtt:message', (requestId, collectionUid, eventData) => {
      dispatch(mqttResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'message',
        eventData: eventData
      }));
    });

    const removeMqttOpenListener = ipcRenderer.on('main:mqtt:open', (requestId, collectionUid, eventData) => {
      dispatch(mqttResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'open',
        eventData: eventData
      }));
    });

    const removeMqttCloseListener = ipcRenderer.on('main:mqtt:close', (requestId, collectionUid, eventData) => {
      dispatch(mqttResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'close',
        eventData: eventData
      }));
    });

    const removeMqttErrorListener = ipcRenderer.on('main:mqtt:error', (requestId, collectionUid, eventData) => {
      dispatch(mqttResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'error',
        eventData: eventData
      }));
    });

    const removeMqttConnectingListener = ipcRenderer.on('main:mqtt:connecting', (requestId, collectionUid, eventData) => {
      dispatch(mqttResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'connecting',
        eventData: eventData
      }));
    });

    const removeMqttSubscribeAckListener = ipcRenderer.on('main:mqtt:subscribe-ack', (requestId, collectionUid, eventData) => {
      dispatch(mqttResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'subscribe-ack',
        eventData: eventData
      }));
    });

    return () => {
      removeMqttRequestSentListener();
      removeMqttMessageListener();
      removeMqttOpenListener();
      removeMqttCloseListener();
      removeMqttErrorListener();
      removeMqttConnectingListener();
      removeMqttSubscribeAckListener();
    };
  }, [isElectron]);
};

export default useMqttEventListeners;
