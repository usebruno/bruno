import React, { useMemo } from 'react';
import MenuDropdown from 'ui/MenuDropdown';
import { IconDots, IconUpload, IconEdit, IconCopy, IconTrash } from '@tabler/icons';

const RowActionsMenu = ({ onExport, onRename, onDuplicate, onDelete }) => {
  const menuItems = useMemo(() => ([
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
      id: 'delete',
      label: 'Delete',
      leftSection: IconTrash,
      className: 'delete-item',
      onClick: onDelete
    }
  ]), [onExport, onRename, onDuplicate, onDelete]);

  return (
    <div
      style={{ display: 'contents' }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <MenuDropdown
        items={menuItems}
        placement="bottom-end"
        appendTo={document.body}
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
