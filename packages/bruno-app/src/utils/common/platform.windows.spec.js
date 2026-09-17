jest.mock('platform', () => ({
  os: {
    family: 'Windows'
  }
}));

import { getSubdirectoriesFromRoot } from './platform';

describe('getSubdirectoriesFromRoot - Windows Platform', () => {
  it('lists the directories between the root and a nested path', () => {
    expect(getSubdirectoriesFromRoot('C:\\collections\\my-collection', 'C:\\collections\\my-collection\\api\\v2')).toEqual([
      'api',
      'v2'
    ]);
  });

  it('returns nothing for a path outside the root', () => {
    expect(getSubdirectoriesFromRoot('C:\\collections\\my-collection', 'C:\\collections')).toEqual([]);
  });

  it('returns nothing for a path on another drive', () => {
    expect(getSubdirectoriesFromRoot('C:\\collections\\my-collection', 'D:\\Temp\\transient\\bruno-a1b2')).toEqual([]);
  });
});
