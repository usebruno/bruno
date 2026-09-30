const { extractBenchmarkContext } = require('./extract-context');

describe('extractBenchmarkContext', () => {
  it('prefers collectionPathname over collectionUid', () => {
    expect(
      extractBenchmarkContext([
        { collectionUid: 'uid-1', collectionPathname: '/collections/foo' }
      ])
    ).toEqual({ collectionPathname: '/collections/foo' });
  });

  it('normalizes collectionPath to collectionPathname', () => {
    expect(extractBenchmarkContext([{ collectionPath: '/collections/bar' }])).toEqual({
      collectionPathname: '/collections/bar'
    });
  });

  it('uses collectionUid when no path is present', () => {
    expect(extractBenchmarkContext([{ collectionUid: 'uid-2' }])).toEqual({ collectionUid: 'uid-2' });
  });

  it('reads nested collection pathname and uid', () => {
    expect(
      extractBenchmarkContext([{ collection: { pathname: '/nested/path', uid: 'uid-3' } }])
    ).toEqual({ collectionPathname: '/nested/path' });

    expect(extractBenchmarkContext([{ collection: { uid: 'uid-only' } }])).toEqual({
      collectionUid: 'uid-only'
    });
  });

  it('extracts request identity keys without renaming', () => {
    expect(
      extractBenchmarkContext([{ collectionUid: 'c', itemUid: 'item-1', requestId: 'req-9' }])
    ).toEqual({ collectionUid: 'c', itemUid: 'item-1', requestId: 'req-9' });
  });

  it('reads nested request uid as itemUid', () => {
    expect(
      extractBenchmarkContext([{ request: { uid: 'request-item-uid' } }])
    ).toEqual({ itemUid: 'request-item-uid' });
  });

  it('ignores bare pathname on the root object', () => {
    expect(
      extractBenchmarkContext([{ pathname: '/collections/foo/requests/get.bru', collectionUid: 'c-1' }])
    ).toEqual({ collectionUid: 'c-1' });
  });

  it('ignores positional string arguments', () => {
    expect(extractBenchmarkContext(['item-uid', 'col-uid', { message: 'hi' }])).toEqual({});
  });

  it('merges fields across multiple object arguments with path winning', () => {
    expect(
      extractBenchmarkContext([
        { collectionUid: 'from-first' },
        { collectionPathname: '/from-second' }
      ])
    ).toEqual({ collectionPathname: '/from-second' });
  });
});
