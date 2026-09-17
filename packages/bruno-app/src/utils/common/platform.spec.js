jest.mock('platform', () => ({
  os: {
    family: 'Unix'
  }
}));

import { getSubdirectoriesFromRoot } from './platform';

describe('getSubdirectoriesFromRoot', () => {
  it('lists the directories between the root and a nested path', () => {
    expect(getSubdirectoriesFromRoot('/collections/my-collection', '/collections/my-collection/api/v2')).toEqual([
      'api',
      'v2'
    ]);
  });

  it('returns nothing for the root itself', () => {
    expect(getSubdirectoriesFromRoot('/collections/my-collection', '/collections/my-collection')).toEqual([]);
  });

  it('returns nothing for a path outside the root', () => {
    expect(getSubdirectoriesFromRoot('/collections/my-collection', '/tmp/transient/bruno-a1b2')).toEqual([]);
    expect(getSubdirectoriesFromRoot('/collections/my-collection', '/collections')).toEqual([]);
  });

  it('keeps a directory whose name merely starts with dots', () => {
    expect(getSubdirectoriesFromRoot('/collections/my-collection', '/collections/my-collection/..hidden')).toEqual([
      '..hidden'
    ]);
  });
});
