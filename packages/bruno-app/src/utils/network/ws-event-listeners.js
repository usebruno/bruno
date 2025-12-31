import { useEffect, useRef } from 'react';
import { wsResponseReceived, runWsRequestEvent } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import { updateActiveConnectionsInStore } from 'providers/ReduxStore/slices/collections/actions';

const useWsEventListeners = () => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();

  const seqRef = useRef(0);
  const nextSeq = () => (++seqRef.current);
  const resetSeq = () => { seqRef.current = 0; };

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    // Handle WebSocket requestSent event
    const removeWsRequestSentListener = ipcRenderer.on('main:ws:request', (requestId, collectionUid, eventData) => {
      dispatch(runWsRequestEvent({
        eventType: 'request',
        itemUid: requestId,
        collectionUid: collectionUid,
        requestUid: requestId,
        eventData: { ...eventData, seq: nextSeq() }
      }));
    });

    const removeWsUpgradeListener = ipcRenderer.on('main:ws:upgrade', (requestId, collectionUid, eventData) => {
      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'upgrade',
        eventData: { ...eventData, seq: nextSeq() }
      }));
    });

    const removeWsRedirectListener = ipcRenderer.on('main:ws:redirect', (requestId, collectionUid, eventData) => {
      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'redirect',
        eventData: { ...eventData, seq: nextSeq() }
      }));
    });

    // Handle WebSocket message event
    const removeWsMessageListener = ipcRenderer.on('main:ws:message', (requestId, collectionUid, eventData) => {
      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'message',
        eventData: { ...eventData, seq: nextSeq() }
      }));
    });

    // Handle WebSocket open event
    const removeWsOpenListener = ipcRenderer.on('main:ws:open', (requestId, collectionUid, eventData) => {
      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'open',
        eventData: { ...eventData, seq: nextSeq() }
      }));
    });

    // Handle WebSocket close event
    const removeWsCloseListener = ipcRenderer.on('main:ws:close', (requestId, collectionUid, eventData) => {
      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'close',
        eventData: { ...eventData, seq: nextSeq() }
      }));
      resetSeq();
    });

    // Handle WebSocket error event
    const removeWsErrorListener = ipcRenderer.on('main:ws:error', (requestId, collectionUid, eventData) => {
      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'error',
        eventData: { ...eventData, seq: nextSeq() }
      }));
    });

    // Handle WebSocket connecting event
    const removeWsConnectingListener = ipcRenderer.on('main:ws:connecting', (requestId, collectionUid, eventData) => {
      dispatch(wsResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'connecting',
        eventData: { ...eventData, seq: nextSeq() }
      }));
    });

    const removeWsConnectionsChangedListener = ipcRenderer.on('main:ws:connections-changed', (data) => {
      dispatch(updateActiveConnectionsInStore(data));
    });

    return () => {
      removeWsRequestSentListener();
      removeWsUpgradeListener();
      removeWsRedirectListener();
      removeWsMessageListener();
      removeWsOpenListener();
      removeWsCloseListener();
      removeWsErrorListener();
      removeWsConnectingListener();
      removeWsConnectionsChangedListener();
    };
  }, [isElectron]);
};

export default useWsEventListeners;
