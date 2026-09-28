import React, { useMemo } from 'react';
import ContextMenu from 'ui/ContextMenu';
import { IconUpload, IconEdit, IconCopy, IconTrash, IconChecks } from '@tabler/icons';
import { SelectAllShortcutHint, DeleteShortcutHint } from '../ShortcutHints';

const SelectionContextMenu = ({
  visible,
  position,
  selectedCount,
  onExport,
  onRename,
  onDuplicate,
  onDelete,
  onSelectAll,
  isAllSelected,
  onClose
}) => {
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

    items.push(
      {
        id: 'select-all',
        label: isAllSelected ? 'Unselect all' : 'Select all',
        leftSection: IconChecks,
        rightSection: <SelectAllShortcutHint />,
        onClick: onSelectAll
      },
      { id: 'divider-3', type: 'divider' },
      {
        id: 'delete',
        label: selectedCount > 1 ? `Delete (${selectedCount})` : 'Delete',
        leftSection: IconTrash,
        rightSection: <DeleteShortcutHint />,
        className: 'delete-item',
        onClick: onDelete
      }
    );

    return items;
  }, [isSingleSelection, selectedCount, onExport, onRename, onDuplicate, onDelete, onSelectAll, isAllSelected]);

  return (
    <ContextMenu
      visible={visible}
      position={position}
      items={menuItems}
      onClose={onClose}
      menuClassName="env-action-menu"
    />
  );
};

export default SelectionContextMenu;
