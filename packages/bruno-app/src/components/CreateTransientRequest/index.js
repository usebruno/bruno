import React, { useState, useRef } from 'react';
import { IconPlus, IconApi, IconBrandGraphql, IconPlugConnected, IconCode } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon/index';
import Dropdown from 'components/Dropdown';
import useCreateTransientRequest from 'hooks/useCreateTransientRequest';
import { PRESET_REQUEST_TYPES as REQUEST_TYPE } from 'utils/common/constants';

const CreateTransientRequest = ({ collectionUid }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownTippyRef = useRef();
  const { collection, collectionPresets, createRequest } = useCreateTransientRequest(collectionUid);

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

  const handleItemClick = (type) => {
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
    createRequest(type);
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
