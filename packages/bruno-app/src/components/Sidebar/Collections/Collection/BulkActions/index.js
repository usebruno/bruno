import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'components/Dropdown';
import { IconX, IconFoldDown } from '@tabler/icons';
import { collapseFullCollection, clearCollectionSelection } from 'providers/ReduxStore/slices/collections';
import { getOtherCollections } from 'utils/collections/index';

const BulkActionsDropdown = ({ visible, onClose, position, closeCollections }) => {
  const dropdownRef = useRef();
  const dispatch = useDispatch();

  const selectedCollections = useSelector((state) => state.collections.selectedCollections);
  const collections = useSelector((state) => state.collections.collections);

  const handleAction = (actionName) => {
    switch (actionName) {
      case 'close': {
        closeCollections(selectedCollections);
        break;
      }

      case 'close-others': {
        const otherCollections = getOtherCollections(collections, selectedCollections).map((c) => c.uid);
        closeCollections(otherCollections);
        break;
      }

      case 'collapse': {
        selectedCollections.forEach((collectionUid) => {
          const collection = collections.find((c) => c.uid === collectionUid);
          if (collection && !collection.collapsed) {
            dispatch(collapseFullCollection({ collectionUid }));
          }
        });
        break;
      }

      case 'collapse-others': {
        collections.forEach((collection) => {
          if (!selectedCollections.includes(collection.uid) && !collection.collapsed) {
            dispatch(collapseFullCollection({ collectionUid: collection.uid }));
          }
        });
        break;
      }
    }

    dispatch(clearCollectionSelection());
    onClose();
  };

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !event.target.closest('.dropdown')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  const anchorStyle = {
    position: 'fixed',
    left: `${position?.x || 0}px`,
    top: `${position?.y || 0}px`,
    width: '1px',
    height: '1px',
    pointerEvents: 'none'
  };

  return (
    <Dropdown
      icon={<div style={anchorStyle} />}
      placement="right-start"
      visible={visible}
      onCreate={(ref) => (dropdownRef.current = ref)}
    >
      <div className="dropdown-item" onClick={() => handleAction('close')}>
        <IconX size={16} strokeWidth={2} className="dropdown-icon" />
        Close
      </div>
      <div className="dropdown-item" onClick={() => handleAction('collapse')}>
        <IconFoldDown size={16} strokeWidth={2} className="dropdown-icon" />
        Collapse
      </div>
      <div className="dropdown-item" onClick={() => handleAction('close-others')}>
        <IconX size={16} strokeWidth={2} className="dropdown-icon" />
        Close Others
      </div>
      <div className="dropdown-item" onClick={() => handleAction('collapse-others')}>
        <IconFoldDown size={16} strokeWidth={2} className="dropdown-icon" />
        Collapse Others
      </div>
    </Dropdown>
  );
};

export default BulkActionsDropdown;
