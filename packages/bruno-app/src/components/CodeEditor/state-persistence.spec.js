import {
  clearPersistedSearchScope,
  getScopedSearchStorageKey,
  readPersistedSearchState,
  writePersistedSearchState
} from './state-persistence';

describe('search state persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    clearPersistedSearchScope();
  });

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
    expect(localStorage.length).toBe(0);
  });

  it('returns null for missing or malformed state', () => {
    expect(readPersistedSearchState({ scope: 'tab-a', key: 'missing' })).toBeNull();

    localStorage.setItem(getScopedSearchStorageKey('tab-a', 'broken'), '{');
    expect(readPersistedSearchState({ scope: 'tab-a', key: 'broken' })).toBeNull();
  });

  it('does not restore search text from browser storage', () => {
    localStorage.setItem(
      getScopedSearchStorageKey('tab-a', 'response:editor'),
      JSON.stringify({ visible: true, searchText: 'response credential' })
    );

    expect(readPersistedSearchState({ scope: 'tab-a', key: 'response:editor' })).toBeNull();
  });

  it('does not retain searches in a new renderer session', () => {
    writePersistedSearchState({
      scope: 'tab-a',
      key: 'response:editor',
      state: { visible: true, searchText: 'response credential' }
    });

    jest.isolateModules(() => {
      const { readPersistedSearchState: readNewSession } = require('./state-persistence');
      expect(readNewSession({ scope: 'tab-a', key: 'response:editor' })).toBeNull();
    });
  });

  it('keeps independent snapshots when a caller changes a state object', () => {
    const state = { searchText: 'original', visible: true };
    writePersistedSearchState({ scope: 'tab-a', key: 'response:editor', state });
    state.searchText = 'changed input';

    const restored = readPersistedSearchState({ scope: 'tab-a', key: 'response:editor' });
    restored.searchText = 'changed output';

    expect(readPersistedSearchState({ scope: 'tab-a', key: 'response:editor' }).searchText).toBe('original');
  });

  it('clears only the requested document or scope', () => {
    const state = { searchText: 'query' };
    for (const scope of ['tab-a', 'tab-a-extra']) {
      for (const key of ['response:editor', 'response:text']) {
        writePersistedSearchState({ scope, key, state });
      }
    }

    writePersistedSearchState({ scope: 'tab-a', key: 'response:editor', state: null });
    expect(readPersistedSearchState({ scope: 'tab-a', key: 'response:editor' })).toBeNull();
    expect(readPersistedSearchState({ scope: 'tab-a', key: 'response:text' })).toEqual(state);

    clearPersistedSearchScope('tab-a');
    expect(readPersistedSearchState({ scope: 'tab-a', key: 'response:text' })).toBeNull();
    expect(readPersistedSearchState({ scope: 'tab-a-extra', key: 'response:editor' })).toEqual(state);
    expect(readPersistedSearchState({ scope: 'tab-a-extra', key: 'response:text' })).toEqual(state);
  });
});
