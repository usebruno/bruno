import { IconBox, IconServer, IconCopy, IconEdit, IconFolder, IconX, IconTrash } from '@tabler/icons';
import { getRevealInFolderLabel } from 'utils/common/platform';

const API_SPEC_MENU = [
  { id: 'generate-collection', leftSection: IconBox, label: 'Generate Collection' },
  {
    id: 'generate-mock-server',
    leftSection: IconServer,
    label: 'Generate Mock Server',
    requires: 'mockServer'
  },
  { id: 'clone', leftSection: IconCopy, label: 'Clone' },
  { id: 'rename', leftSection: IconEdit, label: 'Rename' },
  { id: 'reveal', leftSection: IconFolder, label: getRevealInFolderLabel() },
  { id: 'divider-1', type: 'divider' },
  { id: 'remove', leftSection: IconX, label: 'Remove from Workspace' },
  { id: 'delete', leftSection: IconTrash, label: 'Delete', className: 'delete-item' }
];

export const getApiSpecMenuItems = ({ handlers, isMockServerEnabled }) =>
  API_SPEC_MENU
    .filter((item) => item.requires !== 'mockServer' || isMockServerEnabled)
    .map(({ requires, ...item }) => (item.type === 'divider' ? item : { ...item, onClick: handlers[item.id] }));
