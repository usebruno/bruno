import React, { useRef, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'components/Dropdown';
import { newHttpRequest, newGrpcRequest, newWsRequest } from 'providers/ReduxStore/slices/collections/actions';
import { generateUniqueRequestName } from 'utils/collections';
import { sanitizeName } from 'utils/common/regex';
import toast from 'react-hot-toast';

const CreateUntitledRequest = ({ collectionUid, itemUid = null, icon = null, onRequestCreated, placement = 'bottom' }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const collection = collections?.find((c) => c.uid === collectionUid);
  const dropdownTippyRef = useRef();

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  if (!collection) {
    return null;
  }

  const handleCreateHttpRequest = async () => {
    dropdownTippyRef.current?.hide();
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
  };

  const handleCreateGraphQLRequest = async () => {
    dropdownTippyRef.current?.hide();
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
  };

  const handleCreateWebSocketRequest = async () => {
    dropdownTippyRef.current?.hide();
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
  };

  const handleCreateGrpcRequest = async () => {
    dropdownTippyRef.current?.hide();
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
  };


  return (
    <Dropdown onCreate={onDropdownCreate} icon={icon} placement={placement}>
      <button className="dropdown-item w-full" onClick={handleCreateHttpRequest}>
        HTTP
      </button>
      <button className="dropdown-item w-full" onClick={handleCreateGraphQLRequest}>
        GraphQL
      </button>
      <button className="dropdown-item w-full" onClick={handleCreateWebSocketRequest}>
        WebSocket
      </button>
      <button className="dropdown-item w-full" onClick={handleCreateGrpcRequest}>
        gRPC
      </button>
    </Dropdown>
  );
};

export default CreateUntitledRequest;

