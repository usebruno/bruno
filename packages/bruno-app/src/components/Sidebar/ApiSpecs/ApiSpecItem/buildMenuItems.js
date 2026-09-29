import { IconBox, IconServer, IconCopy, IconEdit, IconFolder, IconX, IconTrash } from '@tabler/icons';
import StatusBadge from 'ui/StatusBadge';
import { getRevealInFolderLabel } from 'utils/common/platform';

export const buildMenuItems = ({
  isMockServerEnabled,
  onGenerateCollection,
  onGenerateMockServer,
  onClone,
  onRename,
  onReveal,
  onRemove,
  onDelete
}) => [
  {
    id: 'generate-collection',
    leftSection: IconBox,
    label: 'Generate Collection',
    onClick: onGenerateCollection
  },
  ...(isMockServerEnabled
    ? [{
        id: 'generate-mock-server',
        leftSection: IconServer,
        label: 'Generate Mock Server',
        rightSection: <StatusBadge status="info" size="xs">Beta</StatusBadge>,
        onClick: onGenerateMockServer
      }]
    : []),
  {
    id: 'clone',
    leftSection: IconCopy,
    label: 'Clone',
    onClick: onClone
  },
  {
    id: 'rename',
    leftSection: IconEdit,
    label: 'Rename',
    onClick: onRename
  },
  {
    id: 'reveal',
    leftSection: IconFolder,
    label: getRevealInFolderLabel(),
    onClick: onReveal
  },
  {
    id: 'divider-1',
    type: 'divider'
  },
  {
    id: 'remove',
    leftSection: IconX,
    label: 'Remove from Workspace',
    onClick: onRemove
  },
  {
    id: 'delete',
    leftSection: IconTrash,
    label: 'Delete',
    className: 'delete-item',
    onClick: onDelete
  }
];
