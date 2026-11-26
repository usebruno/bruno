const path = require('path');
const fs = require('fs');
const os = require('os');
const jsyaml = require('js-yaml');
const yargs = require('yargs/yargs');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const exportCommand = require('../../src/commands/export');

const FIXTURE = path.resolve(__dirname, 'export', 'fixtures', 'collection');

const parseStrictly = (args) => yargs()
  .command(exportCommand)
  .strict()
  .exitProcess(false)
  .fail((message) => {
    throw new Error(message);
  })
  .parse(args);

describe('bru export', () => {
  let outDir;

  beforeEach(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-export-'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(outDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('runs the openapi export for `export openapi`', async () => {
    const outputFile = path.join(outDir, 'api.yaml');

    await yargs().command(exportCommand).parseAsync(['export', 'openapi', '--source', FIXTURE, '--output-file', outputFile]);

    const spec = jsyaml.load(fs.readFileSync(outputFile, 'utf8'));
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info.title).toBe('My API');
  });

  it('passes the short -s and -f options to the openapi export', async () => {
    const outputFile = path.join(outDir, 'api.json');

    await yargs().command(exportCommand).parseAsync(['export', 'openapi', '-s', FIXTURE, '-f', outputFile]);

    expect(JSON.parse(fs.readFileSync(outputFile, 'utf8')).info.title).toBe('My API');
  });

  it('rejects an export format it does not support', () => {
    expect(() => parseStrictly(['export', 'postman'])).toThrow('Please specify an export format, e.g. "openapi"');
  });

  it('asks for an export format when none is given', () => {
    expect(() => parseStrictly(['export'])).toThrow('Not enough non-option arguments');
  });
});
