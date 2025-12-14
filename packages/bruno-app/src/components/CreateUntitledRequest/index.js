import React, { useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MenuDropdown from 'ui/MenuDropdown';
import { newHttpRequest, newGrpcRequest, newWsRequest } from 'providers/ReduxStore/slices/collections/actions';
import { generateUniqueRequestName } from 'utils/collections';
import { sanitizeName } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { IconApi, IconBrandGraphql, IconPlugConnected, IconCode, IconPlus } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';

const CreateUntitledRequest = ({ collectionUid, itemUid = null, onRequestCreated, placement = 'bottom' }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const collection = collections?.find((c) => c.uid === collectionUid);

  if (!collection) {
    return null;
  }

  const handleCreateHttpRequest = useCallback(async () => {
    const uniqueName = await generateUniqueRequestName(collection, 'Untitled', itemUid);
    const filename = sanitizeName(uniqueName);

    dispatch(
      newHttpRequest({
        requestName: uniqueName,
        filename: filename,
        requestType: 'http-request',
        requestUrl: '',
        requestMethod: 'GET',
        collectionUid: collection.uid,
        itemUid: itemUid
      })
    )
      .then(() => {
        toast.success('New request created!');
        onRequestCreated?.();
      })
      .catch((err) => toast.error(err ? err.message : 'An error occurred while adding the request'));
  }, [dispatch, collection, itemUid, onRequestCreated]);

  const handleCreateGraphQLRequest = useCallback(async () => {
    const uniqueName = await generateUniqueRequestName(collection, 'Untitled', itemUid);
    const filename = sanitizeName(uniqueName);

    dispatch(
      newHttpRequest({
        requestName: uniqueName,
        filename: filename,
        requestType: 'graphql-request',
        requestUrl: '',
        requestMethod: 'POST',
        collectionUid: collection.uid,
        itemUid: itemUid,
        body: {
          mode: 'graphql',
          graphql: {
            query: '',
            variables: ''
          }
        }
      })
    )
      .then(() => {
        toast.success('New request created!');
        onRequestCreated?.();
      })
      .catch((err) => toast.error(err ? err.message : 'An error occurred while adding the request'));
  }, [dispatch, collection, itemUid, onRequestCreated]);

  const handleCreateWebSocketRequest = useCallback(async () => {
    const uniqueName = await generateUniqueRequestName(collection, 'Untitled', itemUid);
    const filename = sanitizeName(uniqueName);

    dispatch(
      newWsRequest({
        requestName: uniqueName,
        filename: filename,
        requestUrl: '',
        requestMethod: 'ws',
        collectionUid: collection.uid,
        itemUid: itemUid
      })
    )
      .then(() => {
        toast.success('New request created!');
        onRequestCreated?.();
      })
      .catch((err) => toast.error(err ? err.message : 'An error occurred while adding the request'));
  }, [dispatch, collection, itemUid, onRequestCreated]);

  const handleCreateGrpcRequest = useCallback(async () => {
    const uniqueName = await generateUniqueRequestName(collection, 'Untitled', itemUid);
    const filename = sanitizeName(uniqueName);

    dispatch(
      newGrpcRequest({
        requestName: uniqueName,
        filename: filename,
        requestUrl: '',
        collectionUid: collection.uid,
        itemUid: itemUid
      })
    )
      .then(() => {
        toast.success('New request created!');
        onRequestCreated?.();
      })
      .catch((err) => toast.error(err ? err.message : 'An error occurred while adding the request'));
  }, [dispatch, collection, itemUid, onRequestCreated]);

  const menuItems = useMemo(() => [
    {
      id: 'http',
      label: 'HTTP',
      leftSection: <IconApi size={16} strokeWidth={2} />,
      onClick: handleCreateHttpRequest
    },
    {
      id: 'graphql',
      label: 'GraphQL',
      leftSection: <IconBrandGraphql size={16} strokeWidth={2} />,
      onClick: handleCreateGraphQLRequest
    },
    {
      id: 'websocket',
      label: 'WebSocket',
      leftSection: <IconPlugConnected size={16} strokeWidth={2} />,
      onClick: handleCreateWebSocketRequest
    },
    {
      id: 'grpc',
      label: 'gRPC',
      leftSection: <IconCode size={16} strokeWidth={2} />,
      onClick: handleCreateGrpcRequest
    }
  ], [handleCreateHttpRequest, handleCreateGraphQLRequest, handleCreateWebSocketRequest, handleCreateGrpcRequest]);

  return (
    <MenuDropdown
      items={menuItems}
      placement={placement}
      autoFocusFirstOption={true}
    >
      <ActionIcon size="sm">
        <IconPlus size={16} strokeWidth={2} />
      </ActionIcon>
    </MenuDropdown>
  );
};

export default CreateUntitledRequest;
