import { useEffect } from 'react';
import { responseReceived } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import { isElectron } from 'utils/common/platform';


const useGrpcEventListeners = () => {
  const { ipcRenderer } = window;
  const dispatch = useDispatch();

  let responseData = {
    status: 'Pending',
    data: null,
    headers: [],
    metadata: null,
    statusDetails: null,
    error: null,
    isError: false,
    duration: 0
  };


  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    console.log('Setting up gRPC event listeners');

    ipcRenderer.invoke('renderer:ready');

    // Handle gRPC response event (for unary calls)
    const removeGrpcResponseListener = ipcRenderer.on(`grpc:response`, (id, collectionUid, data) => {
      console.log('Received gRPC response:', data);
          
      // Handle error from the response if present
      if (data.error) {
        responseData.isError = true;
        responseData.error = data.error.message || 'gRPC error occurred';
        responseData.status = 'Error';
        responseData.statusDetails = data.error;
      } else {
        responseData.data = data.res;
        responseData.status = 'Success';
      }
      
      
      dispatch(responseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        response: { ...responseData }
      }));
    });

    
    
    // Handle gRPC metadata
    const removeGrpcMetadataListener = ipcRenderer.on(`grpc:metadata`, (id, collectionUid, data) => {
      
      console.log('Received gRPC metadata:', data);
      
      // Convert Metadata to array of headers for consistency with HTTP
      const metadataMap = data.metadata.getMap ? data.metadata.getMap() : data.metadata;
      const headers = Object.entries(metadataMap).map(([name, value]) => ({
        name,
        value: Array.isArray(value) ? value.join(', ') : value
      }));
      
      responseData.headers = headers;
      responseData.metadata = data.metadata;
      
      // Update Redux store
      dispatch(responseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        response: { ...responseData }
      }));
    });
    
    // Handle gRPC status updates
    const removeGrpcStatusListener = ipcRenderer.on(`grpc:status`, (id, collectionUid, data) => {   
      console.log('Received gRPC status:', data);
      
      responseData.status = data.status?.code === 0 ? 'Success' : 'Error';
      responseData.statusDetails = data.status;
      
      
      // Update Redux store
      dispatch(responseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        response: { ...responseData }
      }));
    });
    
    // Handle gRPC errors
    const removeGrpcErrorListener = ipcRenderer.on(`grpc:error`, (id, collectionUid, data) => {
      
      console.log('Received gRPC error:', data);
      
      responseData.isError = true;
      responseData.error = data.error?.message || 'Unknown gRPC error';
      responseData.status = 'Error';
      
      
      // Update Redux store
      dispatch(responseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        response: { ...responseData }
      }));
    });
    
    // Handle gRPC end event
    const removeGrpcEndListener = ipcRenderer.on(`grpc:server-end-stream`, (id, collectionUid, data) => {
      
      console.log('gRPC request ended:', data);
      
      // Update Redux store
      dispatch(responseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        response: { ...responseData }
      }));
      
    });
    
    // Handle gRPC cancel event
    const removeGrpcCancelListener = ipcRenderer.on(`grpc:server-cancel-stream`, (id, collectionUid, data) => {

      console.log('gRPC request cancelled:', data);
      
      responseData.status = 'Cancelled';
      
      // Update Redux store
      dispatch(responseReceived({
        itemUid: requestId,
        collectionUid: collectionUid,
        response: { ...responseData }
      }));
    
    });

    return () => {
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