import React, { useMemo } from 'react';
import MenuDropdown from 'ui/MenuDropdown';
import { IconDots, IconUpload, IconEdit, IconCopy, IconTrash, IconChecks } from '@tabler/icons';
import { SelectAllShortcutHint, DeleteShortcutHint } from '../ShortcutHints';

const RowActionsMenu = ({ onExport, onRename, onDuplicate, onDelete, onSelectAll, isAllSelected }) => {
  const menuItems = useMemo(() => {
    const items = [
      {
        id: 'export',
        label: 'Export',
        leftSection: IconUpload,
        onClick: onExport
      },
      { id: 'divider-1', type: 'divider' },
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
      { id: 'divider-2', type: 'divider' },
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
        label: 'Delete',
        leftSection: IconTrash,
        rightSection: <DeleteShortcutHint />,
        className: 'delete-item',
        onClick: onDelete
      }
    ];

    return items;
  }, [onExport, onRename, onDuplicate, onDelete, onSelectAll, isAllSelected]);

  return (
    <div
      style={{ display: 'contents' }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <MenuDropdown
        items={menuItems}
        placement="bottom-start"
        appendTo={document.body}
        menuClassName="env-action-menu"
        data-testid="env-row-menu"
      >
        <button
          type="button"
          className="env-more-btn"
          onClick={(e) => e.stopPropagation()}
          aria-label="More actions"
          data-testid="env-row-menu-btn"
        >
          <IconDots size={16} strokeWidth={1.5} />
        </button>
      </MenuDropdown>
    </div>
  );
};

export default RowActionsMenu;
