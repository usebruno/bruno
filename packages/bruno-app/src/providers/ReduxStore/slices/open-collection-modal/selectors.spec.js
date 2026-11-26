import { selectMyComputerCollections, selectSearchWholeComputer } from './selectors';

const api = { path: '/work/api', name: 'API', mtime: 1700000000000, locationId: '/work' };
const billing = { path: '/work/billing', name: 'Billing', mtime: 1700000001000, locationId: '/work' };
const orders = { path: '/shop/orders', name: 'Orders', mtime: 1700000002000, locationId: '/shop' };
const notes = { path: '/elsewhere/notes', name: 'Notes', mtime: 1700000003000, locationId: 'recents' };

const stateWith = (previousCollections, collections) => ({
  openCollectionModal: { myComputer: { previousCollections, collections } }
});

describe('selectMyComputerCollections', () => {
  it('lists the rows of the last and the current scan once each, sorted by full path', () => {
    const apiFromCurrentScan = { ...api, name: 'Public API' };

    expect(selectMyComputerCollections(stateWith([billing, api, notes], [orders, apiFromCurrentScan])))
      .toEqual([notes, orders, apiFromCurrentScan, billing]);
  });

  it('returns the same list while the rows stay the same', () => {
    const previousCollections = [billing];
    const collections = [api];

    const first = selectMyComputerCollections(stateWith(previousCollections, collections));

    expect(selectMyComputerCollections(stateWith(previousCollections, collections))).toBe(first);
    expect(selectMyComputerCollections(stateWith(previousCollections, [api, orders]))).not.toBe(first);
  });

  it('sorts without touching the rows in the state', () => {
    const previousCollections = Object.freeze([billing, api]);
    const collections = Object.freeze([orders]);

    expect(selectMyComputerCollections(stateWith(previousCollections, collections))).toEqual([orders, api, billing]);
    expect(previousCollections).toEqual([billing, api]);
    expect(collections).toEqual([orders]);
  });
});

describe('selectSearchWholeComputer', () => {
  it.each([
    [true, { openCollection: { searchWholeComputer: true } }],
    [false, { openCollection: { searchWholeComputer: false } }],
    [false, { openCollection: { searchWholeComputer: 'yes' } }],
    [false, { openCollection: { searchFolders: ['/work'] } }],
    [false, {}]
  ])('is %s for the preferences %j', (expected, preferences) => {
    expect(selectSearchWholeComputer({ app: { preferences } })).toBe(expected);
  });
});
