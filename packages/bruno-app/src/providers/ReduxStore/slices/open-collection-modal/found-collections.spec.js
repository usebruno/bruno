import * as platformUtils from 'utils/common/platform';
import { mergeFoundCollections } from './found-collections';

jest.mock('utils/common/platform', () => ({
  ...jest.requireActual('utils/common/platform'),
  isWindowsOS: jest.fn()
}));

const api = { path: '/work/api', name: 'API', mtime: 1700000000000, locationId: '/work' };
const billing = { path: '/work/billing', name: 'Billing', mtime: 1700000001000, locationId: '/work' };
const orders = { path: '/shop/orders', name: 'Orders', mtime: 1700000002000, locationId: '/shop' };

describe('mergeFoundCollections', () => {
  beforeEach(() => {
    platformUtils.isWindowsOS.mockReturnValue(false);
  });

  it('appends new collections in the order they came', () => {
    expect(mergeFoundCollections([api], [orders, billing])).toEqual([api, orders, billing]);
  });

  it('replaces the collection with the same path where it stands', () => {
    const apiFromWalk = { ...api, name: 'Public API', locationId: '/work' };
    const recentApi = { ...api, locationId: 'recents' };

    expect(mergeFoundCollections([recentApi, billing], [apiFromWalk])).toEqual([apiFromWalk, billing]);
  });

  it('matches paths that differ only in a trailing slash or the slash direction', () => {
    const apiWithSlash = { ...api, path: '/work/api/' };
    const windowsApi = { ...api, path: 'C:\\work\\api' };
    const posixWindowsApi = { ...api, path: 'C:/work/api', name: 'API again' };

    expect(mergeFoundCollections([api], [apiWithSlash])).toEqual([apiWithSlash]);
    expect(mergeFoundCollections([windowsApi], [posixWindowsApi])).toEqual([posixWindowsApi]);
  });

  it('keeps the last of two incoming collections with the same path', () => {
    const recentApi = { ...api, locationId: 'recents' };

    expect(mergeFoundCollections([], [recentApi, orders, api])).toEqual([api, orders]);
  });

  it('matches paths that differ only in case on Windows', () => {
    platformUtils.isWindowsOS.mockReturnValue(true);
    const upperCaseApi = { ...api, path: 'C:\\Work\\API' };
    const lowerCaseApi = { ...api, path: 'c:\\work\\api', name: 'API again' };

    expect(mergeFoundCollections([upperCaseApi], [lowerCaseApi])).toEqual([lowerCaseApi]);
  });

  it('keeps paths that differ in case apart on other platforms', () => {
    const upperCaseApi = { ...api, path: '/Work/API' };

    expect(mergeFoundCollections([upperCaseApi], [api])).toEqual([upperCaseApi, api]);
  });

  it('always returns a new array and leaves both inputs as they were', () => {
    const rows = Object.freeze([api]);
    const incoming = Object.freeze([billing]);

    expect(mergeFoundCollections(rows, incoming)).toEqual([api, billing]);
    expect(mergeFoundCollections(rows, [])).not.toBe(rows);
    expect(rows).toEqual([api]);
    expect(incoming).toEqual([billing]);
  });
});
