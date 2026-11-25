const path = require('node:path');

const mockPreferencesFile = {};

jest.mock('electron-store', () => {
  const { get, has, set } = jest.requireActual('lodash');
  const clone = (value) => JSON.parse(JSON.stringify(value));
  return jest.fn().mockImplementation(() => ({
    get: (key, defaultValue) => (has(mockPreferencesFile, key) ? clone(get(mockPreferencesFile, key)) : defaultValue),
    set: (key, value) => set(mockPreferencesFile, key, clone(value))
  }));
});

const { getPreferences, savePreferences, saveSearchFolders, saveSearchWholeComputer } = require('../preferences');

const apiFolder = path.resolve('/work/api');
const webFolder = path.resolve('/work/web');
const longFolderPath = path.join(apiFolder, 'a'.repeat(1024));
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

const searchFolderPaths = (count) => Array.from({ length: count }, (_, index) => path.resolve(`/work/${index}`));

const searchSettingSaves = [
  ['search folders', () => saveSearchFolders([apiFolder, webFolder]), { searchFolders: [apiFolder, webFolder] }],
  ['whole computer search', () => saveSearchWholeComputer(true), { searchWholeComputer: true }]
];

describe('open collection preferences', () => {
  beforeEach(() => {
    Object.keys(mockPreferencesFile).forEach((key) => delete mockPreferencesFile[key]);
  });

  it('opens the folder picker by default when the setting was never saved', () => {
    mockPreferencesFile.preferences = { general: { defaultLocation: '/collections' } };

    expect(getPreferences().openCollection).toEqual({ autoOpenFolderPicker: true, searchFolders: [], searchWholeComputer: false });
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

  it('refuses a folder picker setting that is not true or false', async () => {
    mockPreferencesFile.preferences = { general: { defaultLocation: '/collections' } };
    const preferences = getPreferences();

    await expect(savePreferences({ ...preferences, openCollection: { autoOpenFolderPicker: 'maybe' } }))
      .rejects.toThrow('autoOpenFolderPicker must be a `boolean` type');
    expect(getPreferences().openCollection).toEqual({ autoOpenFolderPicker: true, searchFolders: [], searchWholeComputer: false });
  });

  it('keeps the setting through a full save from another preferences screen', async () => {
    mockPreferencesFile.preferences = { openCollection: { autoOpenFolderPicker: false } };
    const preferences = getPreferences();

    await savePreferences({ ...preferences, display: { zoomPercentage: 120 } });

    expect(getPreferences().openCollection).toEqual({ autoOpenFolderPicker: false, searchFolders: [], searchWholeComputer: false });
  });

  describe('search settings', () => {
    afterEach(() => {
      Object.defineProperty(process, 'platform', originalPlatform);
    });

    it.each(searchSettingSaves)('saves only the %s setting and leaves the rest of the file as it was', async (_label, save, setting) => {
      const storedPreferences = {
        general: { defaultLocation: '/collections' },
        mockServer: { instances: [{ uid: 'legacy', name: 'Legacy', sourceType: 'collection', port: 4000, globalDelay: 0 }] },
        openCollection: { autoOpenFolderPicker: false }
      };
      mockPreferencesFile.workspaces = { lastOpenedWorkspaces: ['/workspaces/team'] };
      mockPreferencesFile.preferences = JSON.parse(JSON.stringify(storedPreferences));

      await save();

      expect(mockPreferencesFile.preferences).toEqual({ ...storedPreferences, openCollection: { autoOpenFolderPicker: false, ...setting } });
      expect(mockPreferencesFile.workspaces).toEqual({ lastOpenedWorkspaces: ['/workspaces/team'] });
    });

    it.each(searchSettingSaves)('saves the new-user defaults with the %s setting on a profile that never saved preferences', async (_label, save, setting) => {
      await save();

      const preferences = getPreferences();
      expect(preferences.openCollection).toEqual({ autoOpenFolderPicker: true, searchFolders: [], searchWholeComputer: false, ...setting });
      expect(preferences.proxy).toMatchObject({ source: 'inherit' });
      expect(preferences.proxy.disabled).toBeUndefined();
      expect(preferences.onboarding.hasLaunchedBefore).toBe(false);
    });

    it.each([
      ['a single folder path instead of a list', () => saveSearchFolders(apiFolder), 'Search folders must be a list of up to 200 absolute folder paths'],
      ['a relative folder path', () => saveSearchFolders([apiFolder, 'work/web']), 'Search folders must be a list of up to 200 absolute folder paths'],
      ['a folder path that is not text', () => saveSearchFolders([apiFolder, 42]), 'Search folders must be a list of up to 200 absolute folder paths'],
      ['a folder path longer than 1024 characters', () => saveSearchFolders([longFolderPath]), 'Search folders must be a list of up to 200 absolute folder paths'],
      ['more than 200 search folders', () => saveSearchFolders(searchFolderPaths(201)), 'Search folders must be a list of up to 200 absolute folder paths'],
      ['text as the whole computer setting', () => saveSearchWholeComputer('true'), 'The whole computer search setting must be true or false']
    ])('refuses %s and changes nothing', async (_label, save, message) => {
      mockPreferencesFile.preferences = { general: { defaultLocation: '/collections' } };

      await expect(save()).rejects.toThrow(message);
      expect(mockPreferencesFile.preferences).toEqual({ general: { defaultLocation: '/collections' } });
    });

    it('saves an empty list when the last search folder is removed', async () => {
      mockPreferencesFile.preferences = { openCollection: { searchFolders: [apiFolder] } };

      await saveSearchFolders([]);

      expect(mockPreferencesFile.preferences).toEqual({ openCollection: { searchFolders: [] } });
    });

    it.each([
      ['darwin', [path.resolve('/Work/API'), webFolder, apiFolder]],
      ['win32', [path.resolve('/Work/API'), webFolder]]
    ])('drops repeated search folders on %s and keeps the first spelling', async (platform, savedFolders) => {
      Object.defineProperty(process, 'platform', { value: platform });
      mockPreferencesFile.preferences = { general: { defaultLocation: '/collections' } };

      await saveSearchFolders([path.resolve('/Work/API'), `${webFolder}${path.sep}`, apiFolder, webFolder]);

      expect(mockPreferencesFile.preferences.openCollection.searchFolders).toEqual(savedFolders);
    });

    it('keeps both settings through a full save from another preferences screen', async () => {
      mockPreferencesFile.preferences = { openCollection: { searchFolders: [apiFolder, webFolder], searchWholeComputer: true } };
      const preferences = getPreferences();

      await savePreferences({ ...preferences, display: { zoomPercentage: 120 } });

      expect(getPreferences().openCollection).toEqual({ autoOpenFolderPicker: true, searchFolders: [apiFolder, webFolder], searchWholeComputer: true });
    });

    it.each([
      ['a single folder path instead of a list', { searchFolders: apiFolder }, { searchFolders: [] }],
      ['relative, non-text and over-long folder paths', { searchFolders: ['work/api', 42, null, longFolderPath, webFolder] }, { searchFolders: [webFolder] }],
      ['more than 200 search folders', { searchFolders: searchFolderPaths(201) }, { searchFolders: searchFolderPaths(200) }],
      ['folder paths with doubled separators and dot segments', { searchFolders: ['/work//api', '/work/x/../web'] }, { searchFolders: [apiFolder, webFolder] }],
      ['repeated folder paths', { searchFolders: [apiFolder, webFolder, `${apiFolder}${path.sep}`] }, { searchFolders: [apiFolder, webFolder] }],
      ['text as the whole computer setting', { searchWholeComputer: 'yes' }, { searchWholeComputer: false }],
      ['open collection settings set to null', null, { searchFolders: [], searchWholeComputer: false }]
    ])('reads back %s as clean settings that a full save accepts', async (_label, storedSettings, cleanSettings) => {
      mockPreferencesFile.preferences = { openCollection: storedSettings };

      const preferences = getPreferences();

      expect(preferences.openCollection).toMatchObject(cleanSettings);
      await expect(savePreferences({ ...preferences, display: { zoomPercentage: 120 } })).resolves.toBeUndefined();
    });

    it.each([
      ['a single folder path instead of a list', { searchFolders: apiFolder }, 'openCollection.searchFolders'],
      ['a folder path that is not text', { searchFolders: [null] }, 'openCollection.searchFolders[0]'],
      ['a folder path longer than 1024 characters', { searchFolders: [longFolderPath] }, 'openCollection.searchFolders[0]'],
      ['more than 200 search folders', { searchFolders: searchFolderPaths(201) }, 'openCollection.searchFolders'],
      ['text as the whole computer setting', { searchWholeComputer: 'yes' }, 'openCollection.searchWholeComputer']
    ])('refuses a full save with %s', async (_label, searchSettings, invalidField) => {
      const preferences = getPreferences();

      await expect(savePreferences({ ...preferences, openCollection: { ...preferences.openCollection, ...searchSettings } })).rejects.toThrow(invalidField);
    });
  });
});
