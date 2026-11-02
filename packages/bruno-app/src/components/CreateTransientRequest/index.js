import React, { useState, useRef, useCallback, useMemo } from 'react';
import { IconPlus, IconApi, IconBrandGraphql, IconPlugConnected, IconCode } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon/index';
import Dropdown from 'components/Dropdown';
import { newHttpRequest, newGrpcRequest, newWsRequest } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { generateTransientRequestName } from 'utils/collections';
import { get } from 'lodash';
import { formatIpcError } from 'utils/common/error';
import { PRESET_REQUEST_TYPES as REQUEST_TYPE } from 'utils/common/constants';

const CreateTransientRequest = ({ collectionUid }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownTippyRef = useRef();
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

  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
    if (ref) {
      ref.setProps({
        onHide: () => {
          setDropdownVisible(false);
        }
      });
    }
  };

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

  const handleItemClick = (type) => {
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
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
  };

  const handleLeftClick = () => {
    handleItemClick(collectionPresets.requestType);
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    setDropdownVisible(true);
  };

  if (!collection) {
    return null;
  }

  const IconButton = (
    <ActionIcon
      onClick={handleLeftClick}
      onContextMenu={handleRightClick}
      aria-label="New Transient Request"
      size="lg"
      style={{ marginBottom: '3px' }}
    >
      <IconPlus size={18} strokeWidth={1.5} />
    </ActionIcon>
  );

  return (
    <Dropdown
      icon={IconButton}
      visible={dropdownVisible}
      onCreate={onDropdownCreate}
      onClickOutside={() => setDropdownVisible(false)}
      placement="bottom-end"
    >
      <div className="dropdown-item" onClick={() => handleItemClick(REQUEST_TYPE.HTTP)}>
        <div className="dropdown-icon">
          <IconApi size={16} strokeWidth={2} />
        </div>
        <div className="dropdown-label">HTTP</div>
      </div>
      <div className="dropdown-item" onClick={() => handleItemClick(REQUEST_TYPE.GRAPHQL)}>
        <div className="dropdown-icon">
          <IconBrandGraphql size={16} strokeWidth={2} />
        </div>
        <div className="dropdown-label">GraphQL</div>
      </div>
      <div className="dropdown-item" onClick={() => handleItemClick(REQUEST_TYPE.GRPC)}>
        <div className="dropdown-icon">
          <IconCode size={16} strokeWidth={2} />
        </div>
        <div className="dropdown-label">gRPC</div>
      </div>
      <div className="dropdown-item" onClick={() => handleItemClick(REQUEST_TYPE.WS)}>
        <div className="dropdown-icon">
          <IconPlugConnected size={16} strokeWidth={2} />
        </div>
        <div className="dropdown-label">WebSocket</div>
      </div>
    </Dropdown>
  );
};

export default CreateTransientRequest;
