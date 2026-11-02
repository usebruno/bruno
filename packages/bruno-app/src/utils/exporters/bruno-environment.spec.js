jest.mock('nanoid', () => ({
  nanoid: () => 'aaaaaaaaaaaaaaaaaaaa1',
  customAlphabet: () => () => 'aaaaaaaaaaaaaaaaaaaa1'
}));

import os from 'os';
import path from 'path';
import { exportBrunoEnvironment } from './bruno-environment';

const exportFilePath = path.join(os.tmpdir(), 'export');

const exportedEnvironments = async (environments) => {
  const invoke = jest.fn().mockResolvedValue(undefined);
  window.ipcRenderer = { invoke };

  await exportBrunoEnvironment({ environments, environmentType: 'collection', filePath: exportFilePath });

  return invoke.mock.calls[0][1].environments;
};

describe('exportBrunoEnvironment — inheritance', () => {
  it('carries the extends reference of an inheriting environment', async () => {
    const [environment] = await exportedEnvironments([{ name: 'dev', variables: [], extends: 'Base' }]);

    expect(environment.extends).toBe('Base');
  });

  it('leaves out extends for an environment that inherits from nothing', async () => {
    const [environment] = await exportedEnvironments([{ name: 'dev', variables: [], extends: null }]);

    expect(environment.extends).toBeUndefined();
  });

  it('carries a list of extends references', async () => {
    const [environment] = await exportedEnvironments([{ name: 'dev', variables: [], extends: ['base', 'shared'] }]);

    expect(environment.extends).toEqual(['base', 'shared']);
  });
});
