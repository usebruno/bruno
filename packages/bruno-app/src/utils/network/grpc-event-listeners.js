import { useEffect } from 'react';
import { grpcResponseReceived, grpcScriptError, grpcTestResults, runGrpcRequestEvent } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import { updateActiveConnectionsInStore } from 'providers/ReduxStore/slices/collections/actions';

const useGrpcEventListeners = () => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    // Handle gRPC requestSent event
    const removeGrpcRequestSentListener = ipcRenderer.on('grpc:request', (requestId, collectionUid, eventData) => {
      dispatch(runGrpcRequestEvent({
        eventType: 'request',
        itemUid: requestId,
        collectionUid: collectionUid,
        requestUid: requestId,
        eventData
      }));
    });

    const removeGrpcMessageSentListener = ipcRenderer.on('grpc:message', (requestId, collectionUid, eventData) => {
      dispatch(runGrpcRequestEvent({
        eventType: 'message',
        itemUid: requestId,
        collectionUid: collectionUid,
        requestUid: requestId,
        eventData
      }));
    });

    // Handle gRPC response event (for unary calls and streaming)
    const removeGrpcResponseListener = ipcRenderer.on(`grpc:response`, (requestId, collectionUid, data) => {
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'response',
        eventData: data
      }));
    });

    // Handle gRPC metadata
    const removeGrpcMetadataListener = ipcRenderer.on(`grpc:metadata`, (requestId, collectionUid, data) => {
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'metadata',
        eventData: data
      }));
    });

    // Handle gRPC status updates
    const removeGrpcStatusListener = ipcRenderer.on(`grpc:status`, (requestId, collectionUid, data) => {
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'status',
        eventData: data
      }));
    });

    // Handle gRPC errors
    const removeGrpcErrorListener = ipcRenderer.on(`grpc:error`, (requestId, collectionUid, data) => {
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'error',
        eventData: data
      }));
    });

    // Handle gRPC end event
    const removeGrpcEndListener = ipcRenderer.on(`grpc:server-end-stream`, (requestId, collectionUid, data) => {
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'end',
        eventData: data
      }));
    });

    // Handle gRPC cancel event
    const removeGrpcCancelListener = ipcRenderer.on(`grpc:server-cancel-stream`, (requestId, collectionUid, data) => {
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'cancel',
        eventData: data
      }));
    });

    const removeGrpcConnectionsChangedListener = ipcRenderer.on(`grpc:connections-changed`, (data) => {
      dispatch(updateActiveConnectionsInStore(data));
    });

    // Lifecycle hook failures — a beforeCallStart failure produces no response and no timeline
    // entry, so this event is the only trace of it.
    const removeGrpcScriptErrorListener = ipcRenderer.on(`grpc:script-error`, (requestId, collectionUid, data) => {
      dispatch(grpcScriptError({
        itemUid: requestId,
        collectionUid: collectionUid,
        ...data
      }));
    });

    const removeGrpcTestResultsListener = ipcRenderer.on(`grpc:test-results`, (requestId, collectionUid, data) => {
      dispatch(grpcTestResults({
        itemUid: requestId,
        collectionUid: collectionUid,
        ...data
      }));
    });

    return () => {
      removeGrpcRequestSentListener();
      removeGrpcMessageSentListener();
      removeGrpcResponseListener();
      removeGrpcMetadataListener();
      removeGrpcStatusListener();
      removeGrpcErrorListener();
      removeGrpcEndListener();
      removeGrpcCancelListener();
      removeGrpcConnectionsChangedListener();
      removeGrpcScriptErrorListener();
      removeGrpcTestResultsListener();
    };
  }, [isElectron]);
};

export default useGrpcEventListeners;
