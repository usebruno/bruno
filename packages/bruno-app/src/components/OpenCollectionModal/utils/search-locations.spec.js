import { countSearchLocations, describeLocationStatus, toLocationRows } from './search-locations';

const location = (kind, path, fields = {}) => ({ id: path, path, kind, status: 'done', found: 0, ...fields });

const defaultLocation = location('default-location', '/Users/me/collections', { found: 2 });
const documents = location('documents', '/Users/me/Documents/bruno');
const defaultWorkspace = location('workspace', '/Users/me/Library/Application Support/bruno/default-workspace', { found: 1 });
const teamWorkspace = location('workspace', '/Users/me/work/team', { found: 4 });
const addedFolder = location('user', '/Users/me/projects', { found: 5 });
const home = location('home', '/Users/me', { found: 7 });
const computer = location('computer', '/', { id: 'computer', found: 3 });

describe('countSearchLocations', () => {
  it.each([
    ['nothing when there are no locations', [], 0],
    ['each default location and added folder', [defaultLocation, documents, addedFolder], 3],
    ['every workspace folder together as one location', [defaultWorkspace, teamWorkspace], 1],
    ['the home folder and the rest of the computer together as one location', [defaultLocation, defaultWorkspace, teamWorkspace, home, computer], 3],
    ['the rest of the computer as that location when the home folder is an added folder', [location('user', '/Users/me'), computer], 2]
  ])('counts %s', (_description, locations, count) => {
    expect(countSearchLocations(locations)).toBe(count);
  });
});

describe('toLocationRows', () => {
  it('folds the workspace folders into one row where the first one was and leaves out the home folder and the rest of the computer', () => {
    const rows = toLocationRows([defaultLocation, defaultWorkspace, addedFolder, teamWorkspace, home, computer]);

    expect(rows.map((row) => row.id)).toEqual([defaultLocation.id, 'all-workspaces', addedFolder.id]);
  });

  it('keeps a folder added at / as its own row, apart from the rest of the computer', () => {
    const rootFolder = location('user', '/');

    expect(toLocationRows([rootFolder, computer])).toEqual([{ ...rootFolder, title: '/' }]);
  });

  it('adds up what the workspace folders found and lists them with ~ in the tooltip', () => {
    expect(toLocationRows([defaultWorkspace, teamWorkspace])).toEqual([
      {
        id: 'all-workspaces',
        kind: 'workspace',
        path: null,
        title: '~/Library/Application Support/bruno/default-workspace\n~/work/team',
        status: 'done',
        found: 5
      }
    ]);
  });

  it('keeps every other location as its own row, with its full path as the tooltip', () => {
    expect(toLocationRows([defaultLocation, addedFolder])).toEqual([
      { ...defaultLocation, title: '/Users/me/collections' },
      { ...addedFolder, title: '/Users/me/projects' }
    ]);
  });

  it.each([
    ['scanning', ['done', 'denied', 'scanning']],
    ['denied', ['missing', 'denied', 'idle']],
    ['missing', ['idle', 'missing', 'done']],
    ['idle', ['done', 'idle']],
    ['done', ['done', 'done']]
  ])('shows the workspace row as %s when its folders are %j', (groupStatus, statuses) => {
    const workspaces = statuses.map((status, index) => location('workspace', `/Users/me/workspace-${index}`, { status }));

    expect(toLocationRows(workspaces)[0].status).toBe(groupStatus);
  });
});

describe('describeLocationStatus', () => {
  it.each([
    ['scanning', 0, 'Scanning…', false],
    ['denied', 0, 'No access', true],
    ['missing', 0, 'Not found', true],
    ['done', 12, '12 found', false],
    ['done', 0, '0 found', false],
    ['idle', 0, 'Not scanned', false]
  ])('shows the %s status with %i found as %s', (status, found, text, isProblem) => {
    expect(describeLocationStatus({ status, found })).toEqual({ text, isProblem });
  });
});
