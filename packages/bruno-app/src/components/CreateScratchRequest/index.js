import React, { useState, useRef, useCallback } from 'react';
import { IconPlus, IconApi, IconBrandGraphql, IconPlugConnected, IconCode } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon/index';
import Dropdown from 'components/Dropdown';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { formatIpcError } from 'utils/common/error';
import { newScratchRequest } from 'providers/ReduxStore/slices/workspaces/actions';

const REQUEST_TYPE = {
  HTTP: 'http',
  GRAPHQL: 'graphql',
  GRPC: 'grpc',
  WEBSOCKET: 'websocket'
};

const CreateScratchRequest = ({ workspaceUid }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownTippyRef = useRef();
  const dispatch = useDispatch();

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

  const handleLeftClick = () => {
    // Default to HTTP request
    handleItemClick(REQUEST_TYPE.HTTP);
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    setDropdownVisible(true);
  };

  const handleCreateHttpRequest = useCallback(() => {
    dispatch(
      newScratchRequest({
        workspaceUid,
        requestType: 'http-request',
        requestMethod: 'GET',
        requestUrl: ''
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while creating the scratch request'));
  }, [dispatch, workspaceUid]);

  const handleCreateGraphQLRequest = useCallback(() => {
    dispatch(
      newScratchRequest({
        workspaceUid,
        requestType: 'graphql-request',
        requestMethod: 'POST',
        requestUrl: '',
        body: {
          mode: 'graphql',
          graphql: {
            query: '',
            variables: ''
          }
        }
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while creating the scratch request'));
  }, [dispatch, workspaceUid]);

  const handleCreateWebSocketRequest = useCallback(() => {
    dispatch(
      newScratchRequest({
        workspaceUid,
        requestType: 'ws-request',
        requestMethod: 'ws',
        requestUrl: ''
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while creating the scratch request'));
  }, [dispatch, workspaceUid]);

  const handleCreateGrpcRequest = useCallback(() => {
    dispatch(
      newScratchRequest({
        workspaceUid,
        requestType: 'grpc-request',
        requestUrl: ''
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while creating the scratch request'));
  }, [dispatch, workspaceUid]);

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
      case REQUEST_TYPE.WEBSOCKET:
        handleCreateWebSocketRequest();
        break;
    }
  };

  const IconButton = (
    <ActionIcon
      onClick={handleLeftClick}
      onContextMenu={handleRightClick}
      aria-label="New Scratch Request"
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
      <div className="dropdown-item" onClick={() => handleItemClick(REQUEST_TYPE.WEBSOCKET)}>
        <div className="dropdown-icon">
          <IconPlugConnected size={16} strokeWidth={2} />
        </div>
        <div className="dropdown-label">WebSocket</div>
      </div>
    </Dropdown>
  );
};

export default CreateScratchRequest;
