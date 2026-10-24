import { buildSidebarEntries } from './index';
import * as platformUtils from 'utils/common/platform';

jest.mock('utils/common/platform', () => ({
  ...jest.requireActual('utils/common/platform'),
  isWindowsOS: jest.fn()
}));

describe('buildSidebarEntries', () => {
  it('resolves collection without ghost entry when paths differ only by case on Windows', () => {
    platformUtils.isWindowsOS.mockReturnValue(true);

    const activeWorkspace = {
      type: 'custom',
      collections: [
        { path: 'C:\\users\\bob\\my-collection', remote: true }
      ]
    };

    const collections = [
      { uid: '123', pathname: 'C:\\Users\\Bob\\My-Collection' }
    ];

    const entries = buildSidebarEntries({ collections, activeWorkspace, workspaces: [] });

    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('loaded');
    expect(entries[0].collection).toBe(collections[0]);
  });

  it('keeps case-sensitive behavior on non-Windows platforms', () => {
    platformUtils.isWindowsOS.mockReturnValue(false);

    const activeWorkspace = {
      type: 'custom',
      collections: [
        { path: '/users/bob/my-collection', remote: true }
      ]
    };

    const collections = [
      { uid: '123', pathname: '/Users/Bob/My-Collection' }
    ];

    const entries = buildSidebarEntries({ collections, activeWorkspace, workspaces: [] });

    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('ghost');
  });
});
