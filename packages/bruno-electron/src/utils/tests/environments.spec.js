const path = require('path');
const fs = require('fs/promises');
const os = require('os');
const { parseEnvironment, stringifyEnvironment } = require('@usebruno/filestore');
const { renameEnvironmentExtendsReferences } = require('../environments');

const format = 'yml';

describe('environment extends references', () => {
  let environmentsDirPath;

  const environmentFilePath = (name) => path.join(environmentsDirPath, `${name}.yml`);

  const writeEnvironment = (name, contents) => fs.writeFile(environmentFilePath(name), contents);

  const readExtends = async (name) => {
    const contents = await fs.readFile(environmentFilePath(name), 'utf8');
    return parseEnvironment(contents, { format }).extends;
  };

  // Mirrors the rename the app performs: the file moves and the name it carries moves with it.
  const renameEnvironment = async (oldName, newName) => {
    const environment = parseEnvironment(await fs.readFile(environmentFilePath(oldName), 'utf8'), { format });
    environment.name = newName;

    await fs.writeFile(environmentFilePath(newName), stringifyEnvironment(environment, { format }));
    await fs.rm(environmentFilePath(oldName));
  };

  beforeEach(async () => {
    environmentsDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'bruno-environments-'));
  });

  afterEach(async () => {
    await fs.rm(environmentsDirPath, { recursive: true, force: true });
  });

  describe('renameEnvironmentExtendsReferences', () => {
    it('leaves a reference that differs only in case untouched', async () => {
      await writeEnvironment('base', 'name: base\nvariables: []\n');
      await writeEnvironment('prod', 'name: prod\nextends: BASE\nvariables: []\n');
      await renameEnvironment('base', 'shared');

      await renameEnvironmentExtendsReferences({ environmentsDirPath, format, oldName: 'base', newName: 'shared' });

      expect(await readExtends('prod')).toBe('BASE');
    });

    it('leaves a non-string reference untouched', async () => {
      await writeEnvironment('base', 'name: base\nvariables: []\n');
      await writeEnvironment('prod', 'name: prod\nextends:\n  - base\nvariables: []\n');
      await renameEnvironment('base', 'shared');

      await renameEnvironmentExtendsReferences({ environmentsDirPath, format, oldName: 'base', newName: 'shared' });

      expect(await readExtends('prod')).toEqual(['base']);
    });

    it('updates the remaining references when a sibling file cannot be parsed', async () => {
      await writeEnvironment('base', 'name: base\nvariables: []\n');
      await writeEnvironment('broken', 'name: broken\nvariables: [\n');
      await writeEnvironment('prod', 'name: prod\nextends: base\nvariables: []\n');
      await renameEnvironment('base', 'shared');

      await renameEnvironmentExtendsReferences({ environmentsDirPath, format, oldName: 'base', newName: 'shared' });

      expect(await readExtends('prod')).toBe('shared');
    });

    it('leaves a reference to another environment untouched', async () => {
      await writeEnvironment('base', 'name: base\nvariables: []\n');
      await writeEnvironment('common', 'name: common\nvariables: []\n');
      await writeEnvironment('prod', 'name: prod\nextends: common\nvariables: []\n');
      await renameEnvironment('base', 'shared');

      await renameEnvironmentExtendsReferences({ environmentsDirPath, format, oldName: 'base', newName: 'shared' });

      expect(await readExtends('prod')).toBe('common');
    });
  });
});
