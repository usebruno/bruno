const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseEnvironment } = require('@usebruno/filestore');
const { writeEnvironmentFile } = require('../../../src/utils/environment');

const environment = {
  name: 'staging',
  variables: [
    { uid: 'u1', name: 'baseUrl', value: 'https://staging.example.com', type: 'text', enabled: true, secret: false },
    { uid: 'u2', name: 'token', value: '', type: 'text', enabled: true, secret: true },
    { uid: 'u3', name: 'legacyHost', value: 'https://old.example.com', type: 'text', enabled: false, secret: false }
  ]
};

describe('writeEnvironmentFile', () => {
  let dir;
  let envDirPath;

  beforeEach(() => {
    dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-cli-env-file-')));
    envDirPath = path.join(dir, 'environments');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  describe.each(['yml', 'bru'])('%s format', (format) => {
    it('writes a file that parses back with its secret and disabled variables', () => {
      const { name, filePath } = writeEnvironmentFile(environment, envDirPath, { format });

      expect(name).toBe('staging');
      expect(filePath).toBe(path.join(envDirPath, `staging.${format}`));
      const parsed = parseEnvironment(fs.readFileSync(filePath, 'utf8'), { format });
      // .bru keeps secrets in a block of their own, so only the set of variables is compared.
      expect(parsed.variables).toHaveLength(3);
      expect(parsed.variables).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false }),
        expect.objectContaining({ name: 'token', enabled: true, secret: true }),
        expect.objectContaining({ name: 'legacyHost', value: 'https://old.example.com', enabled: false, secret: false })
      ]));
    });

    it('creates the environments directory when it is missing', () => {
      expect(fs.existsSync(envDirPath)).toBe(false);

      writeEnvironmentFile(environment, envDirPath, { format });

      expect(fs.existsSync(envDirPath)).toBe(true);
    });

    it('gives a taken name a copy suffix instead of replacing the existing file', () => {
      const { filePath: firstPath } = writeEnvironmentFile(environment, envDirPath, { format });
      fs.writeFileSync(firstPath, 'hand-edited');

      const second = writeEnvironmentFile(environment, envDirPath, { format });
      const third = writeEnvironmentFile(environment, envDirPath, { format });

      expect(second).toEqual({ name: 'staging copy', filePath: path.join(envDirPath, `staging copy.${format}`) });
      expect(third).toEqual({ name: 'staging copy 2', filePath: path.join(envDirPath, `staging copy 2.${format}`) });
      expect(fs.readFileSync(firstPath, 'utf8')).toBe('hand-edited');
    });
  });

  it('sanitizes the environment name into a filename', () => {
    const { name, filePath } = writeEnvironmentFile({ ...environment, name: 'qa/eu: west' }, envDirPath, { format: 'yml' });

    expect(name).toBe('qa-eu- west');
    expect(path.basename(filePath)).toBe('qa-eu- west.yml');
  });
});
