import registry from './registry';

describe('loadBundledIntegrations', () => {
  afterEach(() => {
    // Clean up registry and reset module cache between tests
    registry.unregisterAll();
    jest.resetModules();
  });

  it('registers GitHub integration when module exports named GitHubIntegration', () => {
    jest.resetModules();
    jest.doMock('@usebruno/integration-github', () => ({
      GitHubIntegration: { id: 'github', label: 'GitHub Integration' }
    }), { virtual: true });

    const loader = require('./loader');
    loader.loadBundledIntegrations();

    const registered = registry.getRegistered();
    expect(registered).toContain('github');
  });

  it('registers GitHub integration when module exports default', () => {
    jest.resetModules();
    jest.doMock('@usebruno/integration-github', () => ({
      default: { id: 'github', label: 'GitHub Integration' }
    }), { virtual: true });

    const loader = require('./loader');
    loader.loadBundledIntegrations();

    const registered = registry.getRegistered();
    expect(registered).toContain('github');
  });
});
