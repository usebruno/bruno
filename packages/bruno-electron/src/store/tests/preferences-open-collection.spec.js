const mockPreferencesFile = {};

jest.mock('electron-store', () => {
  const { get, has, set } = jest.requireActual('lodash');
  const clone = (value) => JSON.parse(JSON.stringify(value));
  return jest.fn().mockImplementation(() => ({
    get: (key, defaultValue) => (has(mockPreferencesFile, key) ? clone(get(mockPreferencesFile, key)) : defaultValue),
    set: (key, value) => set(mockPreferencesFile, key, clone(value))
  }));
});

const { getPreferences, savePreferences } = require('../preferences');

describe('open collection preferences', () => {
  beforeEach(() => {
    Object.keys(mockPreferencesFile).forEach((key) => delete mockPreferencesFile[key]);
  });

  it('opens the folder picker by default when the setting was never saved', () => {
    mockPreferencesFile.preferences = { general: { defaultLocation: '/collections' } };

    expect(getPreferences().openCollection).toEqual({ autoOpenFolderPicker: true });
  });

  it('saves the folder picker setting with the other preferences', async () => {
    mockPreferencesFile.preferences = { general: { defaultLocation: '/collections' } };
    const preferences = getPreferences();

    await savePreferences({ ...preferences, openCollection: { autoOpenFolderPicker: false } });

    expect(getPreferences()).toMatchObject({
      general: { defaultLocation: '/collections' },
      openCollection: { autoOpenFolderPicker: false }
    });
  });

  it('keeps the setting through a full save from another preferences screen', async () => {
    mockPreferencesFile.preferences = { openCollection: { autoOpenFolderPicker: false } };
    const preferences = getPreferences();

    await savePreferences({ ...preferences, display: { zoomPercentage: 120 } });

    expect(getPreferences().openCollection).toEqual({ autoOpenFolderPicker: false });
  });
});
