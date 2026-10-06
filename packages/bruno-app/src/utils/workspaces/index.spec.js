import { isCollectionInWorkspace } from './index';

describe('isCollectionInWorkspace', () => {
  const workspace = { collections: [{ path: '/work/orders' }, { path: 'C:\\work\\payments\\' }] };

  it('finds a collection the workspace lists', () => {
    expect(isCollectionInWorkspace(workspace, { pathname: '/work/orders' })).toBe(true);
  });

  it('treats backslashes and a trailing slash as the same path', () => {
    expect(isCollectionInWorkspace(workspace, { pathname: 'C:/work/payments' })).toBe(true);
  });

  it('does not find a collection the workspace does not list', () => {
    expect(isCollectionInWorkspace(workspace, { pathname: '/work/users' })).toBe(false);
  });

  it('finds nothing without a workspace or its collections', () => {
    expect(isCollectionInWorkspace(undefined, { pathname: '/work/orders' })).toBe(false);
    expect(isCollectionInWorkspace({}, { pathname: '/work/orders' })).toBe(false);
  });
});
