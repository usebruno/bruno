import React, { useState } from 'react';
import MenuDropdown from 'ui/MenuDropdown';
import { IconDots } from '@tabler/icons';
import buildEnvironmentMenuItems from '../buildEnvironmentMenuItems';

const RowActionsMenu = ({ onExport, onRename, onDuplicate, onDelete, onSelectAll, isAllSelected, onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleOpenChange = (open) => {
    setIsOpen(open);
    onOpenChange(open);
  };

  const menuItems = buildEnvironmentMenuItems({
    isAllSelected,
    onExport,
    onRename,
    onDuplicate,
    onSelectAll,
    onDelete
  });

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
        opened={isOpen}
        onChange={handleOpenChange}
        data-testid="env-row-menu"
      >
        <button
          type="button"
          className="env-row-menu-btn"
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
