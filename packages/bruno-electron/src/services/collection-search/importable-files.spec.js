const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findImportableFiles, readImportableFileText } = require('./importable-files');

describe('findImportableFiles', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-importable-files-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  const writeFile = (name, content = '') => {
    fs.writeFileSync(path.join(tempDir, name), content);
    return path.join(tempDir, name);
  };

  const formatsByName = async () =>
    Object.fromEntries((await findImportableFiles(tempDir)).map((file) => [file.name, file.format]));

  it('recognises Postman, Insomnia and OpenAPI exports and zip archives', async () => {
    writeFile('backup.zip');
    writeFile('Orders.postman_collection.json', '{}');
    writeFile('postman.json', '{ "info": { "_postman_id": "1" } }');
    writeFile('openapi.json', '{ "openapi": "3.0.0" }');
    writeFile('swagger.json', '{ "swagger": "2.0" }');
    writeFile('insomnia.json', '{ "_type": "export", "__export_format": 4 }');
    writeFile('openapi.yaml', 'openapi: 3.1.0\ninfo:\n  title: Orders\n');
    writeFile('swagger.yml', 'swagger: "2.0"\n');
    writeFile('insomnia.yaml', '_type: export\n__export_format: 4\n');

    expect(await formatsByName()).toEqual({
      'backup.zip': 'zip',
      'Orders.postman_collection.json': 'postman',
      'postman.json': 'postman',
      'openapi.json': 'openapi',
      'swagger.json': 'openapi',
      'insomnia.json': 'insomnia',
      'openapi.yaml': 'openapi',
      'swagger.yml': 'openapi',
      'insomnia.yaml': 'insomnia'
    });
  });

  it('ignores other files and folders', async () => {
    writeFile('package.json', '{ "name": "app" }');
    writeFile('config.yaml', 'name: app\n');
    writeFile('notes.txt', 'openapi: 3.0.0');
    fs.mkdirSync(path.join(tempDir, 'specs.zip'));

    expect(await findImportableFiles(tempDir)).toEqual([]);
  });

  it('does not mistake a key that only looks like a spec for a spec', async () => {
    writeFile('package.json', '{ "name": "app", "scripts": { "openapi": "node generate.js" } }');
    writeFile('docker-compose.yml', 'services:\n  swagger:\n    image: swaggerapi/swagger-ui\n');

    expect(await findImportableFiles(tempDir)).toEqual([]);
  });

  it('recognises an Insomnia v5 export', async () => {
    writeFile('insomnia.yaml', 'type: collection.insomnia.rest/5.0\nname: Orders\n');

    expect(await formatsByName()).toEqual({ 'insomnia.yaml': 'insomnia' });
  });

  it('recognises a spec that starts with a byte order mark', async () => {
    writeFile('openapi.yaml', '\uFEFFopenapi: 3.0.0\n');

    expect(await formatsByName()).toEqual({ 'openapi.yaml': 'openapi' });
  });

  it('returns the full path, name and format of each file', async () => {
    const filePath = writeFile('openapi.yaml', 'openapi: 3.0.0\n');

    expect(await findImportableFiles(tempDir)).toEqual([{ path: filePath, name: 'openapi.yaml', format: 'openapi' }]);
  });

  it('returns nothing for a folder it cannot read', async () => {
    expect(await findImportableFiles(path.join(tempDir, 'missing'))).toEqual([]);
  });

  describe('readImportableFileText', () => {
    it('returns the whole text of an importable file', async () => {
      const filePath = writeFile('openapi.yaml', 'openapi: 3.0.0\ninfo:\n  title: Orders\n');

      expect(await readImportableFileText(filePath)).toBe('openapi: 3.0.0\ninfo:\n  title: Orders\n');
    });

    it('drops a byte order mark', async () => {
      const filePath = writeFile('openapi.json', '\uFEFF{ "openapi": "3.0.0" }');

      expect(await readImportableFileText(filePath)).toBe('{ "openapi": "3.0.0" }');
    });

    it('refuses a ZIP', async () => {
      const filePath = writeFile('backup.zip', 'not text');

      await expect(readImportableFileText(filePath)).rejects.toThrow('backup.zip isn’t a file Bruno can import');
    });

    it('refuses a missing file', async () => {
      await expect(readImportableFileText(path.join(tempDir, 'gone.json'))).rejects.toThrow('gone.json isn’t a file Bruno can import');
    });

    const itWithFileLinks = process.platform === 'win32' ? it.skip : it;

    itWithFileLinks('refuses a link, even one named like an export', async () => {
      const target = writeFile('secret.txt', 'secret');
      const link = path.join(tempDir, 'Orders.postman_collection.json');
      fs.symlinkSync(target, link);

      await expect(readImportableFileText(link)).rejects.toThrow('isn’t a file Bruno can import');
    });

    it('refuses a file that is not something Bruno can import', async () => {
      const filePath = writeFile('secrets.json', '{ "token": "abc" }');

      await expect(readImportableFileText(filePath)).rejects.toThrow('secrets.json isn’t a file Bruno can import');
    });
  });
});
