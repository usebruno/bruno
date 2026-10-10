import {
  getScopedSearchStorageKey,
  readPersistedSearchState,
  writePersistedSearchState
} from './state-persistence';

describe('search state persistence', () => {
  beforeEach(() => localStorage.clear());

  it('stores search state independently for each persistence scope and document', () => {
    const firstState = {
      visible: true,
      searchText: 'status',
      regex: false,
      caseSensitive: true,
      wholeWord: false
    };
    const secondState = {
      visible: false,
      searchText: 'error',
      regex: true,
      caseSensitive: false,
      wholeWord: true
    };

    writePersistedSearchState({ scope: 'tab-a', key: 'response:editor', state: firstState });
    writePersistedSearchState({ scope: 'tab-b', key: 'response:editor', state: secondState });

    expect(readPersistedSearchState({ scope: 'tab-a', key: 'response:editor' })).toEqual(firstState);
    expect(readPersistedSearchState({ scope: 'tab-b', key: 'response:editor' })).toEqual(secondState);
    expect(localStorage.getItem(getScopedSearchStorageKey('tab-a', 'response:editor'))).toBe(JSON.stringify(firstState));
  });

  it('returns null for missing or malformed state', () => {
    expect(readPersistedSearchState({ scope: 'tab-a', key: 'missing' })).toBeNull();

    localStorage.setItem(getScopedSearchStorageKey('tab-a', 'broken'), '{');
    expect(readPersistedSearchState({ scope: 'tab-a', key: 'broken' })).toBeNull();
  });
});
