import { tildify } from './collection-location';

const GROUP_STATUS_PRECEDENCE = ['scanning', 'denied', 'missing', 'idle'];

const isWorkspace = (location) => location.kind === 'workspace';

export const countSearchLocations = (locations) => {
  const workspaceCount = locations.filter(isWorkspace).length;
  return locations.length - workspaceCount + (workspaceCount > 0 ? 1 : 0);
};

const toWorkspaceGroupRow = (workspaces) => ({
  id: 'all-workspaces',
  kind: 'workspace',
  path: null,
  title: workspaces.map((workspace) => tildify(workspace.path)).join('\n'),
  status: GROUP_STATUS_PRECEDENCE.find((status) => workspaces.some((workspace) => workspace.status === status)) || 'done',
  found: workspaces.reduce((sum, workspace) => sum + workspace.found, 0)
});

export const toLocationRows = (locations) => {
  const workspaces = locations.filter(isWorkspace);
  return locations
    .filter((location) => location.kind !== 'home' && (!isWorkspace(location) || location === workspaces[0]))
    .map((location) => (isWorkspace(location) ? toWorkspaceGroupRow(workspaces) : { ...location, title: location.path }));
};

export const describeLocationStatus = ({ status, found }) => {
  switch (status) {
    case 'scanning':
      return { text: 'Scanning…', isProblem: false };
    case 'denied':
      return { text: 'No access', isProblem: true };
    case 'missing':
      return { text: 'Not found', isProblem: true };
    case 'done':
      return { text: `${found} found`, isProblem: false };
    case 'idle':
      return { text: 'Not scanned', isProblem: false };
  }
};
