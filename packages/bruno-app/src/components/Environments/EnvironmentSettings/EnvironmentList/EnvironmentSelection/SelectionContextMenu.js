import React, { useMemo } from 'react';
import MenuDropdown from 'ui/MenuDropdown';
import { IconUpload, IconEdit, IconCopy, IconTrash } from '@tabler/icons';

const SelectionContextMenu = ({ visible, position, selectedCount, onExport, onRename, onDuplicate, onDelete, onClose }) => {
  const anchorStyle = {
    position: 'fixed',
    left: `${position?.x || 0}px`,
    top: `${position?.y || 0}px`,
    width: '1px',
    height: '1px',
    pointerEvents: 'none'
  };

  const isSingleSelection = selectedCount === 1;

  const menuItems = useMemo(() => {
    const items = [
      {
        id: 'export',
        label: 'Export',
        leftSection: IconUpload,
        onClick: onExport
      },
      { id: 'divider-1', type: 'divider' }
    ];

    if (isSingleSelection) {
      items.push(
        {
          id: 'rename',
          label: 'Rename',
          leftSection: IconEdit,
          onClick: onRename
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          leftSection: IconCopy,
          onClick: onDuplicate
        },
        { id: 'divider-2', type: 'divider' }
      );
    }

    items.push({
      id: 'delete',
      label: selectedCount > 1 ? `Delete (${selectedCount})` : 'Delete',
      leftSection: IconTrash,
      className: 'delete-item',
      onClick: onDelete
    });

    return items;
  }, [isSingleSelection, selectedCount, onExport, onRename, onDuplicate, onDelete]);

  return (
    <MenuDropdown
      items={menuItems}
      placement="right-start"
      opened={visible}
      onChange={(isOpen) => !isOpen && onClose()}
      appendTo={document.body}
    >
      <div style={anchorStyle} />
    </MenuDropdown>
  );
};

export default SelectionContextMenu;
