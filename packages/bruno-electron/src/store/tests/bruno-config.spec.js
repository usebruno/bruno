const { getBrunoConfig, setBrunoConfig, clearBrunoConfig } = require('../bruno-config');

describe('getBrunoConfig', () => {
  afterEach(() => {
    clearBrunoConfig('collection-uid');
  });

  it('prefers the unsaved draft of the config', () => {
    setBrunoConfig('collection-uid', { name: 'cached' });

    expect(getBrunoConfig('collection-uid', { draft: { brunoConfig: { name: 'draft' } }, brunoConfig: { name: 'own' } }))
      .toEqual({ name: 'draft' });
  });

  it('uses the config cached for an open collection', () => {
    setBrunoConfig('collection-uid', { name: 'cached' });

    expect(getBrunoConfig('collection-uid', { brunoConfig: { name: 'own' } })).toEqual({ name: 'cached' });
  });

  it('falls back to the collection\'s own config when none is cached for it', () => {
    expect(getBrunoConfig('collection-uid', { brunoConfig: { name: 'own' } })).toEqual({ name: 'own' });
  });

  it('returns an empty config when there is none', () => {
    expect(getBrunoConfig('collection-uid')).toEqual({});
  });
});
