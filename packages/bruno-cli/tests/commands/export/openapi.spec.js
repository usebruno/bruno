const path = require('path');
const fs = require('fs');
const os = require('os');
const jsyaml = require('js-yaml');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { brunoToOpenApi } = require('@usebruno/converters');
const exportCommand = require('../../../src/commands/export');
const { createCollectionJsonFromPathname, getCollectionFormat } = require('../../../src/utils/collection');
const { loadEnvironments } = require('../../../src/utils/environment');
const { toApiSpecCollectionData } = require('../../../src/utils/api-spec');
const { EXIT_STATUS } = require('../../../src/constants');

const FIXTURE = path.resolve(__dirname, 'fixtures/collection');
const YML_FIXTURE = path.resolve(__dirname, 'fixtures/yml-collection');

const mockExit = () => jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`exit:${code}`);
});

const runExport = (options) => exportCommand.handler({ type: 'openapi', ...options });

const buildSpecLikeTheApp = async (collectionPath, name) => {
  const collection = createCollectionJsonFromPathname(collectionPath);
  const environments = await loadEnvironments(collectionPath, getCollectionFormat(collectionPath));
  return brunoToOpenApi(name, toApiSpecCollectionData(collection, environments), '').content;
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
      expect(spec.info.title).toBe('My API');
      expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    });

    it('exports the collection given by --source, from any directory', async () => {
      process.chdir(outDir);

      await runExport({ source: FIXTURE, outputFile: 'api.yaml' });

      expect(jsyaml.load(fs.readFileSync(path.join(outDir, 'api.yaml'), 'utf8')).info.title).toBe('My API');
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

      const expected = jsyaml.dump(await buildSpecLikeTheApp(FIXTURE, 'My API'));
      expect(fs.readFileSync(outputFile, 'utf8')).toBe(expected);
    });

    it('lists every environment\'s base URL as a server, like the app with no environment selected', async () => {
      const outputFile = path.join(outDir, 'api.yaml');

      await runExport({ source: FIXTURE, outputFile });

      const spec = jsyaml.load(fs.readFileSync(outputFile, 'utf8'));
      expect(spec.servers).toEqual(expect.arrayContaining([expect.objectContaining({ url: 'http://localhost:3000' })]));
    });

    it('writes <sanitized-collection-name>.yaml to the current directory when --output-file is not given', async () => {
      process.chdir(outDir);

      await runExport({ source: FIXTURE });

      expect(fs.existsSync(path.join(outDir, 'My API.yaml'))).toBe(true);
    });

    it('writes JSON when the output file ends in .json', async () => {
      const outputFile = path.join(outDir, 'api.json');

      await runExport({ source: FIXTURE, outputFile });

      const content = fs.readFileSync(outputFile, 'utf8');
      expect(JSON.parse(content)).toEqual(await buildSpecLikeTheApp(FIXTURE, 'My API'));
      expect(content).toBe(`${JSON.stringify(JSON.parse(content), null, 2)}\n`);
    });

    it.each(['api.yaml', 'api.yml', 'api.YAML', 'api'])('writes YAML for %s', async (fileName) => {
      const outputFile = path.join(outDir, fileName);

      await runExport({ source: FIXTURE, outputFile });

      expect(fs.readFileSync(outputFile, 'utf8')).toBe(jsyaml.dump(await buildSpecLikeTheApp(FIXTURE, 'My API')));
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

    it('exits with the invalid-file code when an environment file cannot be parsed', async () => {
      const exitSpy = mockExit();
      const collectionPath = path.join(outDir, 'collection');
      fs.cpSync(FIXTURE, collectionPath, { recursive: true });
      fs.writeFileSync(path.join(collectionPath, 'environments', 'Broken.bru'), 'vars {\n  unterminated');

      await expect(runExport({ source: collectionPath, outputFile: path.join(outDir, 'api.yaml') })).rejects.toThrow(
        `exit:${EXIT_STATUS.ERROR_INVALID_FILE}`
      );

      expect(exitSpy).toHaveBeenCalledWith(EXIT_STATUS.ERROR_INVALID_FILE);
    });
  });
});
