import React from 'react';
import { IconApi, IconBrandGraphql, IconPlugConnected, IconCode } from '@tabler/icons';
import { newHttpRequest, newWsRequest, newGrpcRequest } from 'providers/ReduxStore/slices/collections/actions';
import { setItemBeingRenamed } from 'providers/ReduxStore/slices/app';
import { generateUniqueRequestName } from 'utils/collections';
import { sanitizeName } from 'utils/common/regex';
import { formatIpcError } from 'utils/common/error';
import toast from 'react-hot-toast';

const dispatchByType = (dispatch, requestType, baseParams) => {
  switch (requestType) {
    case 'http':
      return dispatch(newHttpRequest({ ...baseParams, requestType: 'http-request', requestMethod: 'GET' }));
    case 'graphql':
      return dispatch(
        newHttpRequest({
          ...baseParams,
          requestType: 'graphql-request',
          requestMethod: 'POST',
          body: { mode: 'graphql', graphql: { query: '', variables: '' } }
        })
      );
    case 'websocket':
      return dispatch(newWsRequest({ ...baseParams, requestMethod: 'ws' }));
    case 'grpc':
      return dispatch(newGrpcRequest(baseParams));
    default:
      return Promise.resolve();
  }
};

export const createRequest = async ({ dispatch, collection, itemUid, requestType, requestName, enterRenameMode = false }) => {
  try {
    const name = requestName?.trim() || (await generateUniqueRequestName(collection, 'Untitled', itemUid));
    const filename = sanitizeName(name);

    const baseParams = {
      requestName: name,
      filename,
      requestUrl: '',
      collectionUid: collection.uid,
      itemUid
    };

    const newItemPathname = await dispatchByType(dispatch, requestType, baseParams);

    if (enterRenameMode && newItemPathname) {
      dispatch(setItemBeingRenamed(newItemPathname));
    }
    return newItemPathname;
  } catch (err) {
    toast.error(formatIpcError(err) || 'An error occurred while adding the request');
    throw err;
  }
};

/**
 * Returns menu items for the empty state "Add request" dropdown.
 * Used by both Collection (empty collection) and CollectionItem (empty folder).
 */
export const createEmptyStateMenuItems = ({ dispatch, collection, itemUid, enterRenameMode = false }) => {
  const handleCreate = (requestType) => () => {
    createRequest({ dispatch, collection, itemUid, requestType, enterRenameMode });
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
