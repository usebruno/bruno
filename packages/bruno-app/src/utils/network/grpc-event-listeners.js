import { useEffect } from 'react';
import { grpcResponseReceived, runRequestEvent } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';

const useGrpcEventListeners = () => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    console.log('Setting up gRPC event listeners');

    ipcRenderer.invoke('renderer:ready');

    // Handle gRPC requestSent event
    const removeGrpcRequestSentListener = ipcRenderer.on('main:grpc-request-sent', (requestId, collectionUid, requestSent) => {
      console.log('Received gRPC requestSent:', requestSent);
      
      // Use the runRequestEvent action to update the item with the requestSent data
      dispatch(runRequestEvent({
        type: 'request-sent',
        itemUid: requestId,
        collectionUid: collectionUid,
        requestUid: requestId,
        requestSent: requestSent
      }));
    });

    // Handle gRPC response event (for unary calls and streaming)
    const removeGrpcResponseListener = ipcRenderer.on(`grpc:response`, (requestId, collectionUid, data) => {
      console.log('Received gRPC response:', data);
      
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'response',
        eventData: data
      }));
    });

    // Handle gRPC metadata
    const removeGrpcMetadataListener = ipcRenderer.on(`grpc:metadata`, (requestId, collectionUid, data) => {
      console.log('Received gRPC metadata:', data);
      
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'metadata',
        eventData: data
      }));
    });
    
    // Handle gRPC status updates
    const removeGrpcStatusListener = ipcRenderer.on(`grpc:status`, (requestId, collectionUid, data) => {   
      console.log('Received gRPC status:', data);
      
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'status',
        eventData: data
      }));
    });
    
    // Handle gRPC errors
    const removeGrpcErrorListener = ipcRenderer.on(`grpc:error`, (requestId, collectionUid, data) => {
      console.log('Received gRPC error:', data);
      
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'error',
        eventData: data
      }));
    });
    
    // Handle gRPC end event
    const removeGrpcEndListener = ipcRenderer.on(`grpc:server-end-stream`, (requestId, collectionUid, data) => {
      console.log('gRPC request ended:', data);
      
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'end',
        eventData: data
      }));
    });
    
    // Handle gRPC cancel event
    const removeGrpcCancelListener = ipcRenderer.on(`grpc:server-cancel-stream`, (requestId, collectionUid, data) => {
      console.log('gRPC request cancelled:', data);
      
      dispatch(grpcResponseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        eventType: 'cancel',
        eventData: data
      }));
    });

    return () => {
      removeGrpcRequestSentListener();
      removeGrpcResponseListener();
      removeGrpcMetadataListener();
      removeGrpcStatusListener();
      removeGrpcErrorListener();
      removeGrpcEndListener();
      removeGrpcCancelListener();
    };
      
  }, [isElectron]);
};

export default useGrpcEventListeners;