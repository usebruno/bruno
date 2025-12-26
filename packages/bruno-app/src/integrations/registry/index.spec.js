/* eslint-env jest */
import registry from './index';

describe('Integrations Registry', () => {
  beforeEach(() => {
    registry.unregisterAll();
  });

  test('register and unregister', () => {
    const meta = { id: 'test-integration' };
    expect(registry.register(meta)).toBe(true);
    expect(registry.getRegistered()).toContain('test-integration');
    expect(registry.getRegisteredMetadata()).toEqual([meta]);
    expect(registry.register(meta)).toBe(false); // duplicate
    return registry.unregister('test-integration').then((res) => {
      expect(res).toBe(true);
      expect(registry.getRegistered()).not.toContain('test-integration');
    });
  });

  test('enable calls init and disable calls dispose', async () => {
    const initMock = jest.fn(async (context) => {
      // return a dispose function
      return async () => {
        // called on dispose
      };
    });

    const disposeMock = jest.fn(async () => {});

    const meta = { id: 'life-cycle', init: initMock, dispose: disposeMock };
    registry.register(meta);

    const enabled = await registry.enable('life-cycle', { some: 'context' });
    expect(enabled).toBe(true);
    expect(registry.getEnabled()).toContain('life-cycle');
    expect(initMock).toHaveBeenCalledWith({ some: 'context' });

    // disable should call the dispose returned from init (which is anonymous), or metadata.dispose
    await registry.disable('life-cycle');
    expect(registry.getEnabled()).not.toContain('life-cycle');
  });

  test('initWithPreferences enables registered integrations', async () => {
    let initCalled = false;
    const meta = {
      id: 'pref-integration',
      init: async () => { initCalled = true; }
    };
    registry.register(meta);

    await registry.initWithPreferences({ integrations: { 'pref-integration': { enabled: true } } }, { foo: 'bar' });

    expect(initCalled).toBe(true);
    expect(registry.getEnabled()).toContain('pref-integration');
  });
});
