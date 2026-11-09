const mockPreferencesFile = {};

jest.mock('electron-store', () => {
  const { get, has, set } = jest.requireActual('lodash');
  const clone = (value) => JSON.parse(JSON.stringify(value));
  return jest.fn().mockImplementation(() => ({
    get: (key, defaultValue) => (has(mockPreferencesFile, key) ? clone(get(mockPreferencesFile, key)) : defaultValue),
    set: (key, value) => set(mockPreferencesFile, key, clone(value))
  }));
});

const { getPreferences, savePreferences, saveAutoOpenFolderPicker } = require('../preferences');

describe('open collection preferences', () => {
  beforeEach(() => {
    Object.keys(mockPreferencesFile).forEach((key) => delete mockPreferencesFile[key]);
  });

  it('opens the folder picker by default when the setting was never saved', () => {
    mockPreferencesFile.preferences = { general: { defaultLocation: '/collections' } };

    expect(getPreferences().openCollection).toEqual({ autoOpenFolderPicker: true });
  });

  it('saves only the folder picker setting and leaves the rest of the file as it was', async () => {
    const storedPreferences = {
      general: { defaultLocation: '/collections' },
      mockServer: { instances: [{ uid: 'legacy', name: 'Legacy', sourceType: 'collection', port: 4000, globalDelay: 0 }] },
      openCollection: { autoOpenFolderPicker: true }
    };
    mockPreferencesFile.lastOpenedCollections = ['/collections/api'];
    mockPreferencesFile.preferences = JSON.parse(JSON.stringify(storedPreferences));

    await saveAutoOpenFolderPicker(false);

    expect(mockPreferencesFile.preferences).toEqual({ ...storedPreferences, openCollection: { autoOpenFolderPicker: false } });
    expect(mockPreferencesFile.lastOpenedCollections).toEqual(['/collections/api']);
  });

  it('saves the new-user defaults with the setting on a profile that never saved preferences', async () => {
    mockPreferencesFile.lastOpenedCollections = [];

    await saveAutoOpenFolderPicker(false);

    const preferences = getPreferences();
    expect(preferences.openCollection).toEqual({ autoOpenFolderPicker: false });
    expect(preferences.proxy).toMatchObject({ source: 'inherit' });
    expect(preferences.proxy.disabled).toBeUndefined();
    expect(preferences.onboarding.hasLaunchedBefore).toBe(false);
    expect(mockPreferencesFile.lastOpenedCollections).toEqual([]);
  });

  it.each([
    ['text', 'false'],
    ['a number', 0],
    ['nothing', undefined]
  ])('refuses %s as the setting and changes nothing', async (_label, value) => {
    mockPreferencesFile.preferences = { general: { defaultLocation: '/collections' } };

    await expect(saveAutoOpenFolderPicker(value)).rejects.toThrow('The folder picker setting must be true or false');
    expect(mockPreferencesFile.preferences).toEqual({ general: { defaultLocation: '/collections' } });
  });

  it('keeps the setting through a full save from another preferences screen', async () => {
    mockPreferencesFile.preferences = { openCollection: { autoOpenFolderPicker: false } };
    const preferences = getPreferences();

    await savePreferences({ ...preferences, display: { zoomPercentage: 120 } });

    expect(getPreferences().openCollection).toEqual({ autoOpenFolderPicker: false });
  });
});
