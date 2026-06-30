const { describe, it, expect, beforeAll } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const { parseRequest, parseEnvironment } = require('@usebruno/filestore');

const SCHEMA_DIR = path.resolve(__dirname, '..', '..', 'schemas', 'v1');
const FIXTURE_ROOT = path.resolve(__dirname, '..', '..', '..', 'bruno-tests', 'collection');

const loadSchema = (name) => JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, name), 'utf8'));

const walkBruFiles = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'environments') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkBruFiles(full));
    else if (entry.name.endsWith('.bru') && entry.name !== 'collection.bru' && entry.name !== 'folder.bru') {
      out.push(full);
    }
  }
  return out;
};

describe('schemas/v1 — meta-schema validity', () => {
  it('every schema file is a valid Draft 2020-12 JSON Schema', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    for (const file of fs.readdirSync(SCHEMA_DIR)) {
      if (!file.endsWith('.json')) continue;
      const schema = loadSchema(file);
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.$id).toMatch(/^https:\/\/usebruno\.com\/schemas\/v1\//);
      // Compiling under draft 2020-12 surfaces structural errors (bad type[] arrays,
      // unresolved $ref, etc.) — meta-schema check via direct compile.
      expect(() => ajv.compile(schema)).not.toThrow();
    }
  });
});

describe('schemas/v1/request.json — accepts real bruno-lang parser output', () => {
  let validate;
  beforeAll(() => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    validate = ajv.compile(loadSchema('request.json'));
  });

  const requestFixtures = walkBruFiles(FIXTURE_ROOT);

  it('finds a non-empty fixture set', () => {
    expect(requestFixtures.length).toBeGreaterThan(10);
  });

  // One it() per fixture would explode the test count; one collective check is enough
  // — when something breaks we want to know which file, so we collect failures.
  it('every .bru request in packages/bruno-tests/collection validates', () => {
    const failures = [];
    for (const file of requestFixtures) {
      const parsed = parseRequest(fs.readFileSync(file, 'utf8'), { format: 'bru' });
      if (!validate(parsed)) {
        failures.push({
          file: path.relative(FIXTURE_ROOT, file),
          errors: validate.errors.slice(0, 3)
        });
      }
    }
    if (failures.length) {
      // Surface the first few problems so the message stays scannable.
      throw new Error(`request schema rejected ${failures.length} fixtures:\n` + JSON.stringify(failures.slice(0, 5), null, 2));
    }
  });
});

describe('schemas/v1/environment.json — accepts real environment files', () => {
  let validate;
  beforeAll(() => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    validate = ajv.compile(loadSchema('environment.json'));
  });

  it('packages/bruno-tests/collection/environments/*.bru all validate', () => {
    const envDir = path.join(FIXTURE_ROOT, 'environments');
    const files = fs.readdirSync(envDir).filter((f) => f.endsWith('.bru'));
    expect(files.length).toBeGreaterThan(0);
    const failures = [];
    for (const f of files) {
      const parsed = parseEnvironment(fs.readFileSync(path.join(envDir, f), 'utf8'), { format: 'bru' });
      if (!validate(parsed)) {
        failures.push({ file: f, errors: validate.errors.slice(0, 3) });
      }
    }
    if (failures.length) {
      throw new Error(`environment schema rejected ${failures.length} fixtures:\n` + JSON.stringify(failures, null, 2));
    }
  });
});

describe('schemas/v1/cli-output.json — accepts representative envelopes', () => {
  let validate;
  beforeAll(() => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    validate = ajv.compile(loadSchema('cli-output.json'));
  });

  it('validates a run.start event', () => {
    expect(validate({
      version: 1,
      kind: 'run.start',
      ok: true,
      data: { collection: {}, total_requests: 1 },
      meta: { cli_version: '1.16.0' }
    })).toBe(true);
  });

  it('validates an error envelope', () => {
    expect(validate({
      version: 1,
      kind: 'error',
      ok: false,
      error: {
        code: 5,
        name: 'input_not_found',
        message: 'no such file'
      }
    })).toBe(true);
  });

  it('rejects an envelope missing required fields', () => {
    expect(validate({ kind: 'oops' })).toBe(false);
  });
});
