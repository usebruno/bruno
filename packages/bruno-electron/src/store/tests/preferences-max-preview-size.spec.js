const mockPreferencesFile = {};

jest.mock('electron-store', () => {
  const { get, has, set } = jest.requireActual('lodash');
  const clone = (value) => JSON.parse(JSON.stringify(value));
  return jest.fn().mockImplementation(() => ({
    get: (key, defaultValue) => (has(mockPreferencesFile, key) ? clone(get(mockPreferencesFile, key)) : defaultValue),
    set: (key, value) => set(mockPreferencesFile, key, clone(value))
  }));
});

const { getPreferences, savePreferences, preferencesUtil } = require('../preferences');

describe('max preview size preference', () => {
  beforeEach(() => {
    Object.keys(mockPreferencesFile).forEach((key) => delete mockPreferencesFile[key]);
  });

  it('saves a positive size', async () => {
    await savePreferences({ ...getPreferences(), response: { maxPreviewSizeMB: 3 } });

    expect(preferencesUtil.getMaxPreviewSizeMB()).toBe(3);
  });

  it.each([0, -1])('refuses a size of %p', async (size) => {
    await expect(savePreferences({ ...getPreferences(), response: { maxPreviewSizeMB: size } }))
      .rejects.toThrow('Number must be greater than 0');
  });

  it('refuses an infinite size', async () => {
    await expect(savePreferences({ ...getPreferences(), response: { maxPreviewSizeMB: Infinity } }))
      .rejects.toThrow('Max response size must be a finite number');
    expect(preferencesUtil.getMaxPreviewSizeMB()).toBe(10);
  });

  it.each([null, 'abc', 0, -5])('falls back to 10 when the stored size is %p', (size) => {
    mockPreferencesFile.preferences = { response: { maxPreviewSizeMB: size } };

    expect(preferencesUtil.getMaxPreviewSizeMB()).toBe(10);
  });
});
