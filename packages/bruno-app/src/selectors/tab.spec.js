import { getTabUidForItem, isTabForItemActive, isTabForItemPresent } from './tab';

describe('tab selectors', () => {
  const baseState = {
    tabs: {
      activeTabUid: null,
      tabs: []
    }
  };

  it('does not resolve request tab uid from response-example pathname fallback', () => {
    const state = {
      ...baseState,
      tabs: {
        ...baseState.tabs,
        tabs: [
          {
            uid: 'example-1',
            type: 'response-example',
            pathname: '/c/req.bru',
            collectionUid: 'c1'
          }
        ]
      }
    };

    const selector = getTabUidForItem({ itemUid: 'request-1', itemPathname: '/c/req.bru', collectionUid: 'c1' });
    expect(selector(state)).toBeNull();
  });

  it('does not mark request active when only response-example tab is active on same pathname', () => {
    const state = {
      ...baseState,
      tabs: {
        activeTabUid: 'example-1',
        tabs: [
          {
            uid: 'example-1',
            type: 'response-example',
            pathname: '/c/req.bru',
            collectionUid: 'c1'
          }
        ]
      }
    };

    const selector = isTabForItemActive({ itemUid: 'request-1', itemPathname: '/c/req.bru', collectionUid: 'c1' });
    expect(selector(state)).toBe(false);
  });

  it('does not mark request present when only response-example tab exists for same pathname', () => {
    const state = {
      ...baseState,
      tabs: {
        ...baseState.tabs,
        tabs: [
          {
            uid: 'example-1',
            type: 'response-example',
            pathname: '/c/req.bru',
            collectionUid: 'c1'
          }
        ]
      }
    };

    const selector = isTabForItemPresent({ itemUid: 'request-1', itemPathname: '/c/req.bru', collectionUid: 'c1' });
    expect(selector(state)).toBe(false);
  });

  it('still resolves regular request tab by pathname fallback', () => {
    const state = {
      ...baseState,
      tabs: {
        ...baseState.tabs,
        tabs: [
          {
            uid: 'request-1',
            type: 'http-request',
            pathname: '/c/req.bru',
            collectionUid: 'c1'
          }
        ]
      }
    };

    const selector = getTabUidForItem({ itemUid: 'missing-uid', itemPathname: '/c/req.bru', collectionUid: 'c1' });
    expect(selector(state)).toBe('request-1');
  });
});
