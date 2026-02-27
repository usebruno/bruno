let mockStoreData = {};

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation((opts = {}) => {
    return {
      get: (key, fallback) => (key in mockStoreData ? mockStoreData[key] : fallback),
      set: (key, value) => {
        mockStoreData[key] = value;
      }
    };
  });
});

const { getPreferences } = require('../../src/store/preferences');

describe('Default Location Migration', () => {
  beforeEach(() => {
    // Reset mock store data before each test
    mockStoreData = {};
  });

  it('should migrate defaultCollectionLocation to defaultLocation', () => {
    mockStoreData['preferences'] = {
      general: {
        defaultCollectionLocation: '/home/user/collections'
      }
    };

    const preferences = getPreferences();

    expect(preferences.general.defaultLocation).toBe('/home/user/collections');
    expect(mockStoreData['preferences'].general.defaultCollectionLocation).toBeUndefined();
    expect(mockStoreData['preferences'].general.defaultLocation).toBe('/home/user/collections');
  });

  it('should not migrate if defaultLocation already exists', () => {
    mockStoreData['preferences'] = {
      general: {
        defaultCollectionLocation: '/old/path',
        defaultLocation: '/new/path'
      }
    };

    const preferences = getPreferences();

    expect(preferences.general.defaultLocation).toBe('/new/path');
    // Old key is left untouched
    expect(mockStoreData['preferences'].general.defaultCollectionLocation).toBe('/old/path');
  });

  it('should return default empty string when neither key exists', () => {
    mockStoreData['preferences'] = {};

    const preferences = getPreferences();

    expect(preferences.general.defaultLocation).toBe('');
    // No migration occurred — store unchanged
    expect(mockStoreData['preferences'].general).toBeUndefined();
  });
});
