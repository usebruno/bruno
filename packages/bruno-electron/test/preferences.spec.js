/* eslint-env jest */
const { getPreferences, savePreferences, preferencesUtil } = require('../src/store/preferences');

describe('Preferences integrations helpers', () => {
  let original;

  beforeAll(() => {
    original = getPreferences();
  });

  afterAll(async () => {
    // restore original preferences
    await savePreferences(original);
  });

  test('default integration pref is disabled', () => {
    const pref = preferencesUtil.getIntegrationPref('nonexistent');
    expect(pref).toEqual({ enabled: false });
    expect(preferencesUtil.isIntegrationEnabled('nonexistent')).toBe(false);
  });

  test('setIntegrationEnabled persists enabled state', async () => {
    await preferencesUtil.setIntegrationEnabled('sample-integration', true);
    expect(preferencesUtil.isIntegrationEnabled('sample-integration')).toBe(true);

    const pref = preferencesUtil.getIntegrationPref('sample-integration');
    expect(pref.enabled).toBe(true);

    // cleanup
    await preferencesUtil.setIntegrationEnabled('sample-integration', false);
    expect(preferencesUtil.isIntegrationEnabled('sample-integration')).toBe(false);
  });
});
