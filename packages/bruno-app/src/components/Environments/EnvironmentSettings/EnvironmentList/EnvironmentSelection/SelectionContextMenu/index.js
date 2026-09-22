import React, { useMemo } from 'react';
import MenuDropdown from 'ui/MenuDropdown';
import { IconUpload, IconEdit, IconCopy, IconTrash, IconCheck, IconChecks } from '@tabler/icons';
import { SelectShortcutHint, SelectAllShortcutHint, DeleteShortcutHint } from '../ShortcutHints';

const SelectionContextMenu = ({
  visible,
  position,
  selectedCount,
  onExport,
  onRename,
  onDuplicate,
  onDelete,
  onSelect,
  onSelectAll,
  hasSelection,
  isAllSelected,
  onClose
}) => {
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

    if (!hasSelection) {
      items.push({
        id: 'select',
        label: 'Select',
        leftSection: IconCheck,
        rightSection: <SelectShortcutHint />,
        onClick: onSelect
      });
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
  }, [isSingleSelection, selectedCount, onExport, onRename, onDuplicate, onDelete, onSelect, onSelectAll, hasSelection, isAllSelected]);

  return (
    <MenuDropdown
      items={menuItems}
      placement="right-start"
      opened={visible}
      onChange={(isOpen) => !isOpen && onClose()}
      appendTo={document.body}
      menuClassName="env-action-menu"
    >
      <div style={anchorStyle} />
    </MenuDropdown>
  );
};

export default SelectionContextMenu;
