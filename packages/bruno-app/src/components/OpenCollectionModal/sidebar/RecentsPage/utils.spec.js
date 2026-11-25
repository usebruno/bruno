import { isSameOpenCollections, mergeOpenCollections } from './utils';

const recent = (path, usedAt, lastEvent) => ({ path, name: path.split('/').pop(), usedAt, lastEvent });
const open = (pathname, name, importedAt) => ({ pathname, name, importedAt });
const paths = ({ collections }) => collections.map((collection) => collection.path);

describe('mergeOpenCollections', () => {
  it('keeps the recorded collections in their stored order when nothing is open', () => {
    const recents = [recent('/work/billing', 3000, 'closed'), recent('/work/orders', 500, 'opened')];

    const merged = mergeOpenCollections(recents, []);

    expect(merged.collections).toEqual(recents);
    expect(merged.openPathKeys.size).toBe(0);
    expect(merged.unrecordedPathKeys.size).toBe(0);
  });

  it('adds every collection open in the workspace, dated from when it was opened, and marks the unrecorded ones', () => {
    const merged = mergeOpenCollections([], [open('/work/payments', 'Payments', 1000)]);

    expect(merged.collections).toEqual([{ path: '/work/payments', name: 'Payments', usedAt: 1000, lastEvent: 'opened' }]);
    expect([...merged.openPathKeys]).toEqual(['/work/payments']);
    expect([...merged.unrecordedPathKeys]).toEqual(['/work/payments']);
  });

  it('lists a recorded collection that is open once, dated by its later open, and does not mark it unrecorded', () => {
    const recents = [recent('/work/payments', 2500, 'opened')];

    const merged = mergeOpenCollections(recents, [open('/work/payments', 'Payments', 1000)]);

    expect(merged.collections).toEqual([{ path: '/work/payments', name: 'Payments', usedAt: 2500, lastEvent: 'opened' }]);
    expect(merged.unrecordedPathKeys.size).toBe(0);
  });

  it('counts a collection recorded before it was opened again, or recorded as closed, as opened when it is open now', () => {
    const recents = [recent('/work/billing', 400, 'opened'), recent('/work/orders', 200, 'closed')];

    const merged = mergeOpenCollections(recents, [open('/work/billing', 'Billing', 1000), open('/work/orders', 'Orders', 1000)]);

    expect(merged.collections.map(({ usedAt, lastEvent }) => ({ usedAt, lastEvent }))).toEqual([
      { usedAt: 1000, lastEvent: 'opened' },
      { usedAt: 1000, lastEvent: 'opened' }
    ]);
  });

  it('dates an open collection from when it was opened, not from a later close in another workspace', () => {
    const recents = [recent('/work/payments', 5000, 'closed'), recent('/work/billing', 3000, 'closed')];

    const merged = mergeOpenCollections(recents, [open('/work/payments', 'Payments', 1000)]);

    expect(merged.collections).toEqual([
      recent('/work/billing', 3000, 'closed'),
      { path: '/work/payments', name: 'Payments', usedAt: 1000, lastEvent: 'opened' }
    ]);
  });

  it('places the open collections among the closed ones by time, without reordering the closed ones', () => {
    const recents = [
      recent('/work/closed-late', 5000, 'closed'),
      recent('/work/opened-mid', 3000, 'opened'),
      recent('/work/closed-early', 800, 'closed'),
      recent('/work/closed-earliest', 600, 'closed')
    ];
    const openCollections = [open('/work/restored', 'restored', 1000), open('/work/opened-mid', 'opened-mid', 1000)];

    expect(paths(mergeOpenCollections(recents, openCollections))).toEqual([
      '/work/closed-late',
      '/work/opened-mid',
      '/work/restored',
      '/work/closed-early',
      '/work/closed-earliest'
    ]);
  });

  it('keeps the closed collections in their stored order even when their times are out of order', () => {
    const recents = [recent('/work/a', 100, 'closed'), recent('/work/b', 900, 'closed')];

    expect(paths(mergeOpenCollections(recents, [open('/work/c', 'c', 500)]))).toEqual(['/work/c', '/work/a', '/work/b']);
  });
});

describe('isSameOpenCollections', () => {
  const payments = { pathname: '/work/payments', name: 'Payments', importedAt: 1000, items: [] };

  it('treats collections with the same path, name and open time as the same, whatever else changed', () => {
    expect(isSameOpenCollections([payments], [{ ...payments, items: [{ uid: 'request-1' }], mountStatus: 'mounted' }])).toBe(true);
  });

  it('sees a renamed, moved, reopened, added or removed collection as a change', () => {
    expect(isSameOpenCollections([payments], [{ ...payments, name: 'Billing' }])).toBe(false);
    expect(isSameOpenCollections([payments], [{ ...payments, pathname: '/work/billing' }])).toBe(false);
    expect(isSameOpenCollections([payments], [{ ...payments, importedAt: 2000 }])).toBe(false);
    expect(isSameOpenCollections([payments], [payments, { ...payments, pathname: '/work/orders' }])).toBe(false);
    expect(isSameOpenCollections([payments], [])).toBe(false);
  });
});
