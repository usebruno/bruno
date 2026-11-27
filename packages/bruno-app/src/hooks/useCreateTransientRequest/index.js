import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { get } from 'lodash';
import { newHttpRequest, newGrpcRequest, newWsRequest } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName } from 'utils/common/regex';
import { generateTransientRequestName } from 'utils/collections';
import { formatIpcError } from 'utils/common/error';
import { PRESET_REQUEST_TYPES as REQUEST_TYPE } from 'utils/common/constants';

const useCreateTransientRequest = (collectionUid) => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);

  const collection = useMemo(() => {
    return collections?.find((c) => c.uid === collectionUid);
  }, [collections, collectionUid]);

  const collectionPresets = useMemo(() => {
    return get(collection, collection?.draft?.brunoConfig ? 'draft.brunoConfig.presets' : 'brunoConfig.presets', {
      requestType: 'http',
      requestUrl: ''
    });
  }, [collection]);

  const handleCreateHttpRequest = useCallback(() => {
    if (!collection) return;

    const uniqueName = generateTransientRequestName(collection);
    const filename = sanitizeName(uniqueName);

    dispatch(
      newHttpRequest({
        requestName: uniqueName,
        filename: filename,
        requestType: 'http-request',
        requestUrl: collectionPresets.requestUrl,
        requestMethod: 'GET',
        collectionUid: collection.uid,
        itemUid: null,
        isTransient: true
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while adding the request'));
  }, [dispatch, collection, collectionPresets.requestUrl]);

  const handleCreateGraphQLRequest = useCallback(() => {
    if (!collection) return;

    const uniqueName = generateTransientRequestName(collection);
    const filename = sanitizeName(uniqueName);

    dispatch(
      newHttpRequest({
        requestName: uniqueName,
        filename: filename,
        requestType: 'graphql-request',
        requestUrl: collectionPresets.requestUrl,
        requestMethod: 'POST',
        collectionUid: collection.uid,
        itemUid: null,
        isTransient: true,
        body: {
          mode: 'graphql',
          graphql: {
            query: '',
            variables: ''
          }
        }
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while adding the request'));
  }, [dispatch, collection, collectionPresets.requestUrl]);

  const handleCreateWebSocketRequest = useCallback(() => {
    if (!collection) return;

    const uniqueName = generateTransientRequestName(collection);
    const filename = sanitizeName(uniqueName);

    dispatch(
      newWsRequest({
        requestName: uniqueName,
        filename: filename,
        requestUrl: collectionPresets.requestUrl,
        requestMethod: 'ws',
        collectionUid: collection.uid,
        itemUid: null,
        isTransient: true
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while adding the request'));
  }, [dispatch, collection, collectionPresets.requestUrl]);

  const handleCreateGrpcRequest = useCallback(() => {
    if (!collection) return;

    const uniqueName = generateTransientRequestName(collection);
    const filename = sanitizeName(uniqueName);

    dispatch(
      newGrpcRequest({
        requestName: uniqueName,
        filename: filename,
        requestUrl: collectionPresets.requestUrl,
        collectionUid: collection.uid,
        itemUid: null,
        isTransient: true
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while adding the request'));
  }, [dispatch, collection, collectionPresets.requestUrl]);

  const createRequest = useCallback((type) => {
    switch (type) {
      case REQUEST_TYPE.HTTP:
        handleCreateHttpRequest();
        break;
      case REQUEST_TYPE.GRAPHQL:
        handleCreateGraphQLRequest();
        break;
      case REQUEST_TYPE.GRPC:
        handleCreateGrpcRequest();
        break;
      case REQUEST_TYPE.WS:
        handleCreateWebSocketRequest();
        break;
    }
  }, [handleCreateHttpRequest, handleCreateGraphQLRequest, handleCreateGrpcRequest, handleCreateWebSocketRequest]);

  return { collection, collectionPresets, createRequest };
};

export default useCreateTransientRequest;
