import React, { useState, useRef, useCallback, useMemo } from 'react';
import { IconPlus, IconApi, IconBrandGraphql, IconPlugConnected, IconCode } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon/index';
import Dropdown from 'components/Dropdown';
import { newTransientRequest } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { flattenItems, isItemTransientRequest } from 'utils/collections';
import filter from 'lodash/filter';
import { formatIpcError } from 'utils/common/error';

const REQUEST_TYPES = {
  HTTP: 'http-request',
  GRAPHQL: 'graphql-request',
  GRPC: 'grpc-request',
  WEBSOCKET: 'ws-request'
};

/**
 * Generate a request name for transient requests in the pattern "Untitled {Count}"
 */
const generateTransientRequestName = (collection) => {
  if (!collection?.items) {
    return 'Untitled 1';
  }

  const allItems = flattenItems(collection.items);
  const transientRequests = filter(allItems, isItemTransientRequest);

  // Find the highest "Untitled X" number among transient requests
  let maxNumber = 0;
  transientRequests.forEach((item) => {
    const match = item.name?.match(/^Untitled (\d+)$/);
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });

  return `Untitled ${maxNumber + 1}`;
};

const CreateTransientRequest = ({ collectionUid }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownTippyRef = useRef();
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);

  const collection = useMemo(() => {
    return collections?.find((c) => c.uid === collectionUid);
  }, [collections, collectionUid]);

  const collectionPresets = useMemo(() => {
    const presets = collection?.draft?.brunoConfig
      ? collection.draft.brunoConfig.presets
      : collection?.brunoConfig?.presets;
    return presets || { requestType: 'http', requestUrl: '' };
  }, [collection]);

  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
    if (ref) {
      ref.setProps({
        onHide: () => setDropdownVisible(false)
      });
    }
  };

  const handleCreateRequest = useCallback((type) => {
    if (!collection) return;

    const requestName = generateTransientRequestName(collection);
    const filename = sanitizeName(requestName);

    dispatch(
      newTransientRequest({
        type,
        requestName,
        filename,
        requestUrl: collectionPresets.requestUrl || '',
        collectionUid: collection.uid
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while adding the request'));
  }, [dispatch, collection, collectionPresets.requestUrl]);

  const handleLeftClick = () => {
    // Map preset type to internal request type
    const presetType = collectionPresets.requestType || 'http';
    const typeMap = {
      http: REQUEST_TYPES.HTTP,
      graphql: REQUEST_TYPES.GRAPHQL,
      grpc: REQUEST_TYPES.GRPC,
      ws: REQUEST_TYPES.WEBSOCKET
    };
    handleCreateRequest(typeMap[presetType] || REQUEST_TYPES.HTTP);
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    setDropdownVisible(true);
  };

  const handleItemClick = (type) => {
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
    handleCreateRequest(type);
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
      <div className="dropdown-item" onClick={() => handleItemClick(REQUEST_TYPES.HTTP)}>
        <div className="dropdown-icon">
          <IconApi size={16} strokeWidth={2} />
        </div>
        <div className="dropdown-label">HTTP</div>
      </div>
      <div className="dropdown-item" onClick={() => handleItemClick(REQUEST_TYPES.GRAPHQL)}>
        <div className="dropdown-icon">
          <IconBrandGraphql size={16} strokeWidth={2} />
        </div>
        <div className="dropdown-label">GraphQL</div>
      </div>
      <div className="dropdown-item" onClick={() => handleItemClick(REQUEST_TYPES.GRPC)}>
        <div className="dropdown-icon">
          <IconCode size={16} strokeWidth={2} />
        </div>
        <div className="dropdown-label">gRPC</div>
      </div>
      <div className="dropdown-item" onClick={() => handleItemClick(REQUEST_TYPES.WEBSOCKET)}>
        <div className="dropdown-icon">
          <IconPlugConnected size={16} strokeWidth={2} />
        </div>
        <div className="dropdown-label">WebSocket</div>
      </div>
    </Dropdown>
  );
};

export default CreateTransientRequest;
