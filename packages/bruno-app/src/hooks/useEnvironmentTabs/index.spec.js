const { describe, it, expect } = require('@jest/globals');
import { render, renderHook, within } from '@testing-library/react';
import { resolveEnvironmentInheritance } from '@usebruno/common/utils';
import useEnvironmentTabs from './index';

const variable = (name, overrides = {}) => ({ uid: name, name, value: '', enabled: true, secret: false, ...overrides });

// Mirrors how EnvironmentDetails resolves the inherited variables before handing them to the hook.
const renderTabs = ({ environment, draft, environments }) =>
  renderHook(() => {
    const liveEnvironment = { ...environment, variables: draft?.variables || environment.variables };
    const { inheritedVariables } = resolveEnvironmentInheritance({ environments, targetEnvironment: liveEnvironment });
    return useEnvironmentTabs({ environment, draft, inheritedEnvironmentVariables: inheritedVariables });
  });

const countOnTab = (tabs, key) => {
  const { indicator } = tabs.find((tab) => tab.key === key);
  if (!indicator) return null;
  const { container } = render(indicator);
  return within(container).getByTestId('env-tab-count').textContent;
};

describe('useEnvironmentTabs', () => {
  it('counts only the environment own variables when it inherits nothing', () => {
    const environment = {
      uid: 'env-dev',
      name: 'Dev',
      variables: [variable('host'), variable('port'), variable('token', { secret: true })]
    };

    const { result } = renderTabs({ environment, environments: [environment] });

    expect(countOnTab(result.current, 'variables')).toBe('2');
    expect(countOnTab(result.current, 'secrets')).toBe('1');
  });

  it('adds the variables inherited from an ancestor to the count', () => {
    const base = {
      uid: 'env-base',
      name: 'Base',
      variables: [variable('host'), variable('region'), variable('token', { secret: true })]
    };
    const dev = {
      uid: 'env-dev',
      name: 'Dev',
      extends: 'Base',
      variables: [variable('port'), variable('apiKey', { secret: true })]
    };

    const { result } = renderTabs({ environment: dev, environments: [base, dev] });

    expect(countOnTab(result.current, 'variables')).toBe('3');
    expect(countOnTab(result.current, 'secrets')).toBe('2');
  });

  it('counts a redefined variable once', () => {
    const base = { uid: 'env-base', name: 'Base', variables: [variable('host'), variable('region')] };
    const dev = {
      uid: 'env-dev',
      name: 'Dev',
      extends: 'Base',
      variables: [variable('host', { value: 'localhost' })]
    };

    const { result } = renderTabs({ environment: dev, environments: [base, dev] });

    expect(countOnTab(result.current, 'variables')).toBe('2');
  });

  it('keeps the inherited variables in the count while the environment own rows are a draft', () => {
    const base = { uid: 'env-base', name: 'Base', variables: [variable('host')] };
    const dev = { uid: 'env-dev', name: 'Dev', extends: 'Base', variables: [] };
    const draft = { environmentUid: 'env-dev', variables: [variable('port')] };

    const { result } = renderTabs({ environment: dev, draft, environments: [base, dev] });

    expect(countOnTab(result.current, 'variables')).toBe('2');
  });

  it('shows no count on a tab whose variables are all disabled and none are inherited', () => {
    const environment = { uid: 'env-dev', name: 'Dev', variables: [variable('host', { enabled: false })] };

    const { result } = renderTabs({ environment, environments: [environment] });

    expect(countOnTab(result.current, 'variables')).toBeNull();
  });
});
