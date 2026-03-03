import React from 'react';
import { IconApi, IconBrandGraphql, IconPlugConnected, IconCode } from '@tabler/icons';
import { newHttpRequest, newWsRequest, newGrpcRequest } from 'providers/ReduxStore/slices/collections/actions';
import { generateUniqueRequestName } from 'utils/collections';
import { sanitizeName } from 'utils/common/regex';
import { formatIpcError } from 'utils/common/error';
import toast from 'react-hot-toast';

const createRequest = async ({ dispatch, collection, itemUid, requestType }) => {
  try {
    const uniqueName = await generateUniqueRequestName(collection, 'Untitled', itemUid);
    const filename = sanitizeName(uniqueName);

    const baseParams = {
      requestName: uniqueName,
      filename,
      requestUrl: '',
      collectionUid: collection.uid,
      itemUid
    };

    switch (requestType) {
      case 'http':
        await dispatch(newHttpRequest({ ...baseParams, requestType: 'http-request', requestMethod: 'GET' }));
        break;
      case 'graphql':
        await dispatch(
          newHttpRequest({
            ...baseParams,
            requestType: 'graphql-request',
            requestMethod: 'POST',
            body: { mode: 'graphql', graphql: { query: '', variables: '' } }
          })
        );
        break;
      case 'websocket':
        await dispatch(newWsRequest({ ...baseParams, requestMethod: 'ws' }));
        break;
      case 'grpc':
        await dispatch(newGrpcRequest(baseParams));
        break;
    }
  } catch (err) {
    toast.error(formatIpcError(err) || 'An error occurred while adding the request');
  }
};

/**
 * Returns menu items for the empty state "Add request" dropdown.
 * Used by both Collection (empty collection) and CollectionItem (empty folder).
 */
export const createEmptyStateMenuItems = ({ dispatch, collection, itemUid }) => {
  const handleCreate = (requestType) => () => {
    createRequest({ dispatch, collection, itemUid, requestType });
  };

  return [
    {
      id: 'http',
      label: 'HTTP',
      leftSection: <IconApi size={16} strokeWidth={2} />,
      onClick: handleCreate('http')
    },
    {
      id: 'graphql',
      label: 'GraphQL',
      leftSection: <IconBrandGraphql size={16} strokeWidth={2} />,
      onClick: handleCreate('graphql')
    },
    {
      id: 'grpc',
      label: 'gRPC',
      leftSection: <IconCode size={16} strokeWidth={2} />,
      onClick: handleCreate('grpc')
    },
    {
      id: 'websocket',
      label: 'WebSocket',
      leftSection: <IconPlugConnected size={16} strokeWidth={2} />,
      onClick: handleCreate('websocket')
    }
  ];
};
