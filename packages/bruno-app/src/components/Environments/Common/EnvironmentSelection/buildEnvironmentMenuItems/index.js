import React from 'react';
import { IconUpload, IconEdit, IconCopy, IconTrash, IconChecks } from '@tabler/icons';
import { SelectAllShortcutHint, DeleteShortcutHint } from '../ShortcutHints';

/**
 * Menu items shared by the environment row menu and the selection context menu, so ids, icons and
 * shortcut hints can't drift apart. Rename and Duplicate only make sense for a single environment,
 * and Delete shows how many environments it will remove.
 *
 * @param {Object} params
 * @param {number} [params.selectedCount=1] - Number of environments the action applies to
 * @param {boolean} params.isAllSelected - Whether every environment is selected (toggles the Select all label)
 */
const buildEnvironmentMenuItems = ({
  selectedCount = 1,
  isAllSelected,
  onExport,
  onRename,
  onDuplicate,
  onSelectAll,
  onDelete
}) => {
  const items = [
    {
      id: 'export',
      label: 'Export',
      leftSection: IconUpload,
      onClick: onExport
    },
    { id: 'divider-1', type: 'divider' }
  ];

  if (selectedCount === 1) {
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
      shortcut: <SelectAllShortcutHint />,
      onClick: onSelectAll
    },
    { id: 'divider-3', type: 'divider' },
    {
      id: 'delete',
      label: selectedCount > 1 ? `Delete (${selectedCount})` : 'Delete',
      leftSection: IconTrash,
      shortcut: <DeleteShortcutHint />,
      className: 'delete-item',
      onClick: onDelete
    }
  );

  return items;
};

export default buildEnvironmentMenuItems;
