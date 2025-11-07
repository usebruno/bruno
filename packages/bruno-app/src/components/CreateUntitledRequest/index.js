import React, { useRef, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'components/Dropdown';
import { newHttpRequest, newGrpcRequest, newWsRequest } from 'providers/ReduxStore/slices/collections/actions';
import { generateUniqueRequestName } from 'utils/collections';
import { sanitizeName } from 'utils/common/regex';
import toast from 'react-hot-toast';

const CreateUntitledRequest = ({ collectionUid, itemUid = null, TriggerComponent, onRequestCreated }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const collection = collections?.find((c) => c.uid === collectionUid);
  const dropdownTippyRef = useRef();

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  if (!collection) {
    return null;
  }

  const handleCreateHttpRequest = () => {
    dropdownTippyRef.current?.hide();
    const uniqueName = generateUniqueRequestName(collection, 'Untitled');
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

  const handleCreateGraphQLRequest = () => {
    dropdownTippyRef.current?.hide();
    const uniqueName = generateUniqueRequestName(collection, 'Untitled');
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

  const handleCreateWebSocketRequest = () => {
    dropdownTippyRef.current?.hide();
    const uniqueName = generateUniqueRequestName(collection, 'Untitled');
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

  const handleCreateGrpcRequest = () => {
    dropdownTippyRef.current?.hide();
    const uniqueName = generateUniqueRequestName(collection, 'Untitled');
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

  const DefaultTrigger = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center cursor-pointer">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
        </svg>
      </div>
    );
  });

  DefaultTrigger.displayName = 'DefaultTrigger';

  const Trigger = TriggerComponent ? TriggerComponent : DefaultTrigger;

  return (
    <Dropdown onCreate={onDropdownCreate} icon={<Trigger />} placement="bottom">
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

