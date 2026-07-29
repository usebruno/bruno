import { useEffect } from 'react';
import { graphqlSubscriptionResponseReceived, runGraphqlSubscriptionRequestEvent } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import { updateActiveConnectionsInStore } from 'providers/ReduxStore/slices/collections/actions';

const useGraphqlSubscriptionEventListeners = () => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    const removeRequestListener = ipcRenderer.on('main:gql-sub:request', (requestId, collectionUid, eventData) => {
      dispatch(runGraphqlSubscriptionRequestEvent({
        eventType: 'request',
        itemUid: requestId,
        collectionUid: collectionUid,
        eventData
      }));
    });

    const removeConnectingListener = ipcRenderer.on('main:gql-sub:connecting', (requestId, collectionUid, eventData) => {
      dispatch(graphqlSubscriptionResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'connecting',
        eventData
      }));
    });

    const removeUpgradeListener = ipcRenderer.on('main:gql-sub:upgrade', (requestId, collectionUid, eventData) => {
      dispatch(graphqlSubscriptionResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'upgrade',
        eventData
      }));
    });

    const removeRedirectListener = ipcRenderer.on('main:gql-sub:redirect', (requestId, collectionUid, eventData) => {
      dispatch(graphqlSubscriptionResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'redirect',
        eventData
      }));
    });

    const removeOpenListener = ipcRenderer.on('main:gql-sub:open', (requestId, collectionUid, eventData) => {
      dispatch(graphqlSubscriptionResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'open',
        eventData
      }));
    });

    const removeFramesListener = ipcRenderer.on('main:gql-sub:frames', (requestId, collectionUid, eventData) => {
      dispatch(graphqlSubscriptionResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'frames',
        eventData
      }));
    });

    const removeOperationStateListener = ipcRenderer.on('main:gql-sub:operation-state', (requestId, collectionUid, eventData) => {
      dispatch(graphqlSubscriptionResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'operation-state',
        eventData
      }));
    });

    const removeCloseListener = ipcRenderer.on('main:gql-sub:close', (requestId, collectionUid, eventData) => {
      dispatch(graphqlSubscriptionResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'close',
        eventData
      }));
    });

    const removeErrorListener = ipcRenderer.on('main:gql-sub:error', (requestId, collectionUid, eventData) => {
      dispatch(graphqlSubscriptionResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'error',
        eventData
      }));
    });

    const removeConnectionsChangedListener = ipcRenderer.on('main:gql-sub:connections-changed', (data) => {
      dispatch(updateActiveConnectionsInStore(data));
    });

    return () => {
      removeRequestListener();
      removeConnectingListener();
      removeUpgradeListener();
      removeRedirectListener();
      removeOpenListener();
      removeFramesListener();
      removeOperationStateListener();
      removeCloseListener();
      removeErrorListener();
      removeConnectionsChangedListener();
    };
  }, [isElectron]);
};

export default useGraphqlSubscriptionEventListeners;
