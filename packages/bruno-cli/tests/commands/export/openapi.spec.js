const path = require('path');
const fs = require('fs');
const os = require('os');
const jsyaml = require('js-yaml');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const exportOpenApiCommand = require('../../../src/commands/export/openapi');
const { EXIT_STATUS } = require('../../../src/constants');

const FIXTURE = path.resolve(__dirname, 'fixtures/collection');
const YML_FIXTURE = path.resolve(__dirname, 'fixtures/yml-collection');

const mockExit = () => jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`exit:${code}`);
});

// The spec the app's Create API Spec writes for fixtures/collection, with no environment selected
const APP_SPEC = path.resolve(__dirname, 'fixtures', 'collection.openapi.yaml');

const runExport = (options) => exportOpenApiCommand.handler(options);

// operationIds are built from the request's absolute path, so keep only the part inside the collection
const withRelativeOperationIds = (spec) => {
  Object.values(spec.paths).forEach((pathItem) => Object.values(pathItem).forEach((operation) => {
    operation.operationId = operation.operationId.replace(/^.*fixtures_collection_/, '');
  }));
  return spec;
};

const readAppSpecYaml = () => fs.readFileSync(APP_SPEC, 'utf8');

const readExportedSpec = (outputFile) => withRelativeOperationIds(jsyaml.load(fs.readFileSync(outputFile, 'utf8')));

const copyFixture = (destination) => {
  fs.cpSync(FIXTURE, destination, { recursive: true });
  return destination;
};

describe('bru export openapi', () => {
  let originalCwd;
  let outDir;
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    originalCwd = process.cwd();
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-export-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    jest.restoreAllMocks();
    fs.rmSync(outDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  describe('collection source', () => {
    it('exports the collection in the current directory when --source is not given', async () => {
      process.chdir(FIXTURE);
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ outputFile });

      const spec = jsyaml.load(fs.readFileSync(outputFile, 'utf8'));
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info.title).toBe('My API-v2-test');
      expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    });

    it('exports the collection given by --source, from any directory', async () => {
      process.chdir(outDir);

      await runExport({ source: FIXTURE, outputFile: 'api.yaml' });

      expect(jsyaml.load(fs.readFileSync(path.join(outDir, 'api.yaml'), 'utf8')).info.title).toBe('My API-v2-test');
    });

    it('resolves a relative --source against the current directory', async () => {
      process.chdir(path.dirname(FIXTURE));

      await runExport({ source: 'collection', outputFile: path.join(outDir, 'api.yaml') });

      expect(fs.existsSync(path.join(outDir, 'api.yaml'))).toBe(true);
    });

    it('exports an OpenCollection (yml) collection', async () => {
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: YML_FIXTURE, outputFile });

      expect(jsyaml.load(fs.readFileSync(outputFile, 'utf8')).info.title).toBe('ymlcollection');
    });
  });

  describe('output', () => {
    it('writes the same YAML the app produces for the collection, with no environment selected', async () => {
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: FIXTURE, outputFile });

      expect(jsyaml.dump(readExportedSpec(outputFile))).toBe(readAppSpecYaml());
    });

    it('lists every environment\'s base URL as a server, in the order the app reads them', async () => {
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: FIXTURE, outputFile });

      expect(readExportedSpec(outputFile).servers).toEqual([
        { url: 'http://localhost:3000', description: 'Local' },
        { url: 'https://api.example.com', description: 'Prod' },
        { url: 'https://dev.example.com', description: 'dev' }
      ]);
    });

    it('leaves out requests in folders listed in the collection\'s ignore setting', async () => {
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: FIXTURE, outputFile });

      expect(Object.keys(readExportedSpec(outputFile).paths)).not.toContain('/hidden');
    });

    it('writes <sanitized-collection-name>.yaml to the current directory when --output-file is not given', async () => {
      process.chdir(outDir);

      await runExport({ source: FIXTURE });

      expect(fs.existsSync(path.join(outDir, 'My API-v2-test.yaml'))).toBe(true);
    });

    it('writes JSON when the output file ends in .json', async () => {
      const outputFile = path.join(outDir, 'api.json');

      await runExport({ source: FIXTURE, outputFile });

      const content = fs.readFileSync(outputFile, 'utf8');
      expect(withRelativeOperationIds(JSON.parse(content))).toEqual(jsyaml.load(readAppSpecYaml()));
      expect(content).toBe(`${JSON.stringify(JSON.parse(content), null, 2)}\n`);
    });

    it.each(['api.yaml', 'api.yml', 'api.YAML', 'api'])('writes YAML for %s', async (fileName) => {
      const outputFile = path.join(outDir, fileName);

      await runExport({ source: FIXTURE, outputFile });

      expect(jsyaml.dump(readExportedSpec(outputFile))).toBe(readAppSpecYaml());
    });

    it('rejects an output file extension that is neither JSON nor YAML', async () => {
      const exitSpy = mockExit();

      await expect(runExport({ source: FIXTURE, outputFile: path.join(outDir, 'api.txt') })).rejects.toThrow(
        `exit:${EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT}`
      );

      expect(exitSpy).toHaveBeenCalledWith(EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT);
      expect(fs.existsSync(path.join(outDir, 'api.txt'))).toBe(false);
    });

    it('creates missing parent directories of the output file', async () => {
      const outputFile = path.join(outDir, 'nested', 'deeper', 'api.yaml');

      await runExport({ source: FIXTURE, outputFile });

      expect(fs.existsSync(outputFile)).toBe(true);
    });

    it('overwrites an existing output file without asking', async () => {
      const outputFile = path.join(outDir, 'api.yaml');
      fs.writeFileSync(outputFile, 'old content');

      await runExport({ source: FIXTURE, outputFile });

      expect(fs.readFileSync(outputFile, 'utf8')).not.toContain('old content');
    });

    it('reports the output path on success', async () => {
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: FIXTURE, outputFile });

      expect(logSpy.mock.calls.flat().join(' ')).toContain(outputFile);
    });

    it('still writes the spec, and reports the exporter\'s warnings on stderr', async () => {
      const collectionPath = copyFixture(path.join(outDir, 'collection'));
      fs.writeFileSync(
        path.join(collectionPath, 'bad-json.bru'),
        'meta {\n  name: bad-json\n  type: http\n  seq: 3\n}\n\npost {\n  url: https://api.example.com/bad\n  body: json\n  auth: none\n}\n\nbody:json {\n  { invalid\n}\n'
      );
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: collectionPath, outputFile });

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(errorSpy.mock.calls.flat().join(' ')).toContain('Warning: bad-json: Failed to parse JSON in request body');
    });

    it('still writes the spec, and lists the request files that could not be parsed', async () => {
      const collectionPath = copyFixture(path.join(outDir, 'collection'));
      fs.writeFileSync(path.join(collectionPath, 'broken.bru'), 'meta {\n  name: broken\n');
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: collectionPath, outputFile });

      expect(fs.existsSync(outputFile)).toBe(true);
      const logged = errorSpy.mock.calls.flat().join(' ');
      expect(logged).toContain('1 file(s) could not be parsed and were left out of the spec: broken.bru');
    });

    it('still writes the spec when an environment file cannot be parsed, and lists it as skipped', async () => {
      const collectionPath = copyFixture(path.join(outDir, 'collection'));
      fs.writeFileSync(path.join(collectionPath, 'environments', 'Broken.bru'), 'vars {\n  unterminated');
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: collectionPath, outputFile });

      expect(readExportedSpec(outputFile).servers.map((server) => server.description)).toEqual(['Local', 'Prod', 'dev']);
      expect(errorSpy.mock.calls.flat().join(' ')).toContain(path.join('environments', 'Broken.bru'));
    });

    it('still writes the spec when bruno.json cannot be parsed, named after the folder like the app', async () => {
      const collectionPath = copyFixture(path.join(outDir, 'my-collection'));
      fs.writeFileSync(path.join(collectionPath, 'bruno.json'), '{ not json');
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: collectionPath, outputFile });

      expect(jsyaml.load(fs.readFileSync(outputFile, 'utf8')).info.title).toBe('my-collection');
      expect(errorSpy.mock.calls.flat().join(' ')).toContain('could not be parsed and were left out of the spec: bruno.json');
    });
  });

  describe('which files are read, matching the app', () => {
    it('does not read a folder in the ignore list, even when its files are broken', async () => {
      const collectionPath = copyFixture(path.join(outDir, 'collection'));
      fs.writeFileSync(path.join(collectionPath, 'ignored', 'folder.bru'), 'meta {\n  name: ignored\n');
      fs.writeFileSync(path.join(collectionPath, 'ignored', 'broken.bru'), 'not valid bru {{{{');
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: collectionPath, outputFile });

      expect(Object.keys(readExportedSpec(outputFile).paths)).not.toContain('/hidden');
      expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('could not be parsed');
    });

    it('leaves out an environment file listed in the ignore list', async () => {
      const collectionPath = copyFixture(path.join(outDir, 'collection'));
      const configPath = path.join(collectionPath, 'bruno.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      fs.writeFileSync(configPath, JSON.stringify({ ...config, ignore: [...config.ignore, 'environments/Prod.bru'] }));
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: collectionPath, outputFile });

      expect(readExportedSpec(outputFile).servers.map((server) => server.description)).toEqual(['Local', 'dev']);
    });

    it('reads .yaml request files in an OpenCollection collection', async () => {
      const collectionPath = path.join(outDir, 'yml-collection');
      fs.cpSync(YML_FIXTURE, collectionPath, { recursive: true });
      const requestYml = fs.readFileSync(path.join(collectionPath, 'request_1.yml'), 'utf8');
      fs.writeFileSync(path.join(collectionPath, 'users.yaml'), requestYml.replace('name: request_1', 'name: users').replace(/url: .*/, 'url: https://api.example.com/users'));
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: collectionPath, outputFile });

      expect(Object.keys(jsyaml.load(fs.readFileSync(outputFile, 'utf8')).paths)).toContain('/users');
    });
  });

  describe('failures', () => {
    it('exits with the not-in-collection code when --source does not exist', async () => {
      const exitSpy = mockExit();
      const missing = path.join(outDir, 'missing');

      await expect(runExport({ source: missing, outputFile: path.join(outDir, 'api.yaml') })).rejects.toThrow(
        `exit:${EXIT_STATUS.ERROR_NOT_IN_COLLECTION}`
      );

      expect(exitSpy).toHaveBeenCalledWith(EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
      expect(errorSpy.mock.calls.flat().join(' ')).toContain(missing);
    });

    it('exits with the not-in-collection code when --source is not a collection', async () => {
      const exitSpy = mockExit();

      await expect(runExport({ source: outDir, outputFile: path.join(outDir, 'api.yaml') })).rejects.toThrow(
        `exit:${EXIT_STATUS.ERROR_NOT_IN_COLLECTION}`
      );

      expect(exitSpy).toHaveBeenCalledWith(EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
    });

    it('exits with the missing-output-dir code before exporting when the output directory cannot be created', async () => {
      const exitSpy = mockExit();
      const blockingFile = path.join(outDir, 'not-a-directory');
      fs.writeFileSync(blockingFile, '');
      const outputFile = path.join(blockingFile, 'api.yaml');

      await expect(runExport({ source: FIXTURE, outputFile })).rejects.toThrow(`exit:${EXIT_STATUS.ERROR_MISSING_OUTPUT_DIR}`);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_STATUS.ERROR_MISSING_OUTPUT_DIR);
      expect(errorSpy.mock.calls.flat().join(' ')).toContain(blockingFile);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('exits with a non-zero code and reports the error when the output file cannot be written', async () => {
      const exitSpy = mockExit();
      const outputFile = path.join(outDir, 'taken');
      fs.mkdirSync(outputFile);

      await expect(runExport({ source: FIXTURE, outputFile })).rejects.toThrow(`exit:${EXIT_STATUS.ERROR_GENERIC}`);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_STATUS.ERROR_GENERIC);
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
