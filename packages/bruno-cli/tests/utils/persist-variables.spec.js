const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  applyVariableUpdates,
  persistVariableUpdates,
  mergeScriptVarsIntoEnvList,
  mergeScriptVarsIntoCollectionVarsList
} = require('../../src/utils/persist-variables');

const tmpBase = path.join(os.tmpdir(), 'bruno-cli-persist-vars-tests');

beforeEach(() => {
  fs.mkdirSync(tmpBase, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpBase, { recursive: true, force: true });
});

const writeFile = (name, content) => {
  const filePath = path.join(tmpBase, name);
  fs.writeFileSync(filePath, content);
  return filePath;
};

describe('mergeScriptVarsIntoEnvList', () => {
  it('updates existing enabled var values', () => {
    const variables = [
      { name: 'host', value: 'old', enabled: true, type: 'text', secret: false }
    ];
    const merged = mergeScriptVarsIntoEnvList(variables, { host: 'new' });
    expect(merged).toHaveLength(1);
    expect(merged[0].value).toBe('new');
  });

  it('appends new keys not present in the file', () => {
    const variables = [];
    const merged = mergeScriptVarsIntoEnvList(variables, { token: 'abc' });
    expect(merged).toEqual([
      { name: 'token', value: 'abc', enabled: true, type: 'text', secret: false }
    ]);
  });

  it('removes enabled keys that disappeared from script output', () => {
    const variables = [
      { name: 'a', value: '1', enabled: true, type: 'text', secret: false },
      { name: 'b', value: '2', enabled: true, type: 'text', secret: false }
    ];
    const merged = mergeScriptVarsIntoEnvList(variables, { a: '1' });
    expect(merged.map((v) => v.name)).toEqual(['a']);
  });

  it('preserves disabled variables even when absent from script output', () => {
    const variables = [
      { name: 'a', value: '1', enabled: false, type: 'text', secret: false }
    ];
    const merged = mergeScriptVarsIntoEnvList(variables, { b: '2' });
    const names = merged.map((v) => v.name).sort();
    expect(names).toEqual(['a', 'b']);
    expect(merged.find((v) => v.name === 'a').enabled).toBe(false);
  });

  it('ignores the internal __name__ key', () => {
    const merged = mergeScriptVarsIntoEnvList([], { __name__: 'dev', host: 'x' });
    expect(merged).toEqual([
      { name: 'host', value: 'x', enabled: true, type: 'text', secret: false }
    ]);
  });
});

describe('mergeScriptVarsIntoCollectionVarsList', () => {
  it('updates, adds, and removes collection vars symmetrically', () => {
    const variables = [
      { name: 'keep', value: '1', enabled: true, type: 'request' },
      { name: 'gone', value: '2', enabled: true, type: 'request' },
      { name: 'disabled', value: '3', enabled: false, type: 'request' }
    ];
    const merged = mergeScriptVarsIntoCollectionVarsList(variables, { keep: '1-updated', fresh: '4' });
    const byName = Object.fromEntries(merged.map((v) => [v.name, v]));
    expect(byName.keep.value).toBe('1-updated');
    expect(byName.fresh.value).toBe('4');
    expect(byName.disabled).toBeDefined();
    expect(byName.gone).toBeUndefined();
  });
});

describe('applyVariableUpdates', () => {
  it('mirrors dirty scopes into shared in-memory maps', () => {
    const envVariables = { host: 'old', __name__: 'dev' };
    const runtimeVariables = { stale: '1' };
    const globalEnvVars = { region: 'us' };
    const request = { collectionVariables: { color: 'red' } };

    applyVariableUpdates(
      {
        envVariables: { host: 'new', token: 'abc', __name__: 'dev' },
        runtimeVariables: { fresh: '2' },
        globalEnvironmentVariables: { region: 'eu' },
        collectionVariables: { color: 'blue' }
      },
      { envVariables, runtimeVariables, globalEnvVars, request }
    );

    expect(envVariables).toEqual({ host: 'new', token: 'abc', __name__: 'dev' });
    expect(runtimeVariables).toEqual({ fresh: '2' });
    expect(globalEnvVars).toEqual({ region: 'eu' });
    expect(request.collectionVariables).toEqual({ color: 'blue' });
  });

  it('leaves untouched scopes alone when result fields are null', () => {
    const envVariables = { host: 'old', __name__: 'dev' };
    const runtimeVariables = { keep: '1' };
    applyVariableUpdates(
      { envVariables: null, runtimeVariables: null, globalEnvironmentVariables: null, collectionVariables: null },
      { envVariables, runtimeVariables, globalEnvVars: {}, request: {} }
    );
    expect(envVariables).toEqual({ host: 'old', __name__: 'dev' });
    expect(runtimeVariables).toEqual({ keep: '1' });
  });
});

describe('persistVariableUpdates — env file', () => {
  it('round-trips a yml env file', () => {
    const filePath = writeFile('dev.yml',
      'name: dev\nvariables:\n  - name: host\n    value: old\n  - name: token\n    value: keep\n'
    );
    persistVariableUpdates(
      { envVariables: { host: 'new', extra: 'added', __name__: 'dev' } },
      { envFile: { path: filePath, format: 'yml' } }
    );
    const written = fs.readFileSync(filePath, 'utf8');
    expect(written).toMatch(/host/);
    expect(written).toMatch(/new/);
    expect(written).toMatch(/extra/);
    expect(written).not.toMatch(/keep/);
    expect(written).not.toMatch(/__name__/);
  });

  it('round-trips a json env file', () => {
    const filePath = writeFile('dev.json', JSON.stringify({
      name: 'dev',
      variables: [
        { name: 'host', value: 'old' },
        { name: 'token', value: 'keep' }
      ]
    }, null, 2));
    persistVariableUpdates(
      { envVariables: { host: 'new', extra: 'added', __name__: 'dev' } },
      { envFile: { path: filePath, format: 'json' } }
    );
    const written = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const byName = Object.fromEntries(written.variables.map((v) => [v.name, v.value]));
    expect(byName.host).toBe('new');
    expect(byName.extra).toBe('added');
    expect(byName.token).toBeUndefined();
  });

  it('content-comparison guard skips rewrites that are byte-identical', () => {
    const filePath = writeFile('dev.yml',
      'name: dev\nvariables:\n  - name: host\n    value: same\n'
    );
    const before = fs.statSync(filePath).mtimeMs;
    const wait = Date.now() + 5;
    while (Date.now() < wait) { /* spin to ensure mtime can change */ }
    persistVariableUpdates(
      { envVariables: { host: 'same', __name__: 'dev' } },
      { envFile: { path: filePath, format: 'yml' } }
    );
    const after = fs.statSync(filePath).mtimeMs;
    expect(after).toBe(before);
  });

  it('is a no-op when the env file does not exist', () => {
    const filePath = path.join(tmpBase, 'missing.yml');
    persistVariableUpdates(
      { envVariables: { host: 'new' } },
      { envFile: { path: filePath, format: 'yml' } }
    );
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('preserves disabled vars when the script set unrelated keys', () => {
    const filePath = writeFile('dev.yml',
      'name: dev\nvariables:\n  - name: host\n    value: x\n  - name: stash\n    value: y\n    disabled: true\n'
    );
    persistVariableUpdates(
      { envVariables: { host: 'x', extra: 'z' } },
      { envFile: { path: filePath, format: 'yml' } }
    );
    const written = fs.readFileSync(filePath, 'utf8');
    expect(written).toMatch(/stash/);
    expect(written).toMatch(/disabled:\s*true/);
  });
});

describe('persistVariableUpdates — collection vars', () => {
  it('writes collection vars back to collection.bru', () => {
    const collectionRootPath = writeFile('collection.bru',
      'meta {\n  name: test\n  seq: 1\n}\n\nvars:pre-request {\n  k1: old\n}\n'
    );
    const collection = {
      format: 'bru',
      brunoConfig: { name: 'test' },
      root: {
        meta: { name: 'test', seq: 1 },
        request: {
          vars: { req: [{ name: 'k1', value: 'old', enabled: true, type: 'request' }] }
        }
      }
    };
    persistVariableUpdates(
      { collectionVariables: { k1: 'new', k2: 'fresh' } },
      { collection, collectionRootPath }
    );
    const written = fs.readFileSync(collectionRootPath, 'utf8');
    expect(written).toMatch(/k1:\s*new/);
    expect(written).toMatch(/k2:\s*fresh/);
    expect(collection.root.request.vars.req.map((v) => v.name).sort()).toEqual(['k1', 'k2']);
  });

  it('does nothing if no collectionRootPath given', () => {
    const collection = { format: 'bru', root: {} };
    expect(() => persistVariableUpdates(
      { collectionVariables: { k1: 'v' } },
      { collection, collectionRootPath: undefined }
    )).not.toThrow();
  });

  it('writes collection vars back to opencollection.yml for yml-format collections', () => {
    const collectionRootPath = writeFile('opencollection.yml',
      'opencollection: 1.0.0\ninfo:\n  name: yml-collection\nrequest:\n  vars:\n    - name: k1\n      value: old\n'
    );
    const collection = {
      format: 'yml',
      brunoConfig: { name: 'yml-collection' },
      root: {
        meta: null,
        request: {
          headers: [],
          auth: { mode: 'none' },
          script: { req: null, res: null },
          tests: null,
          vars: { req: [{ uid: 'v1', name: 'k1', value: 'old', enabled: true, type: 'request' }], res: [] }
        }
      }
    };
    persistVariableUpdates(
      { collectionVariables: { k1: 'new', k2: 'fresh' } },
      { collection, collectionRootPath }
    );
    const written = fs.readFileSync(collectionRootPath, 'utf8');
    expect(written).toMatch(/name:\s*k1/);
    expect(written).toMatch(/value:\s*new/);
    expect(written).toMatch(/name:\s*k2/);
    expect(written).toMatch(/value:\s*fresh/);
  });
});

describe('persistVariableUpdates — .bru env format', () => {
  it('round-trips a .bru env file', () => {
    const filePath = writeFile('dev.bru',
      'vars {\n  host: old\n  token: keep\n}\n'
    );
    persistVariableUpdates(
      { envVariables: { host: 'new', extra: 'added', __name__: 'dev' } },
      { envFile: { path: filePath, format: 'bru' } }
    );
    const written = fs.readFileSync(filePath, 'utf8');
    expect(written).toMatch(/host:\s*new/);
    expect(written).toMatch(/extra:\s*added/);
    expect(written).not.toMatch(/token:\s*keep/);
    expect(written).not.toMatch(/__name__/);
  });
});

describe('persistVariableUpdates — global env file', () => {
  it('routes globalEnvironmentVariables result to the globalEnvFile descriptor', () => {
    const envPath = writeFile('dev.yml',
      'name: dev\nvariables:\n  - name: host\n    value: stale\n'
    );
    const globalPath = writeFile('global.yml',
      'name: global\nvariables:\n  - name: region\n    value: us\n'
    );
    persistVariableUpdates(
      { globalEnvironmentVariables: { region: 'eu', extra: 'new' } },
      {
        envFile: { path: envPath, format: 'yml' },
        globalEnvFile: { path: globalPath, format: 'yml' }
      }
    );
    // global file got the script's payload
    expect(fs.readFileSync(globalPath, 'utf8')).toMatch(/value:\s*eu/);
    // env file untouched — no envVariables in result
    expect(fs.readFileSync(envPath, 'utf8')).toMatch(/stale/);
  });
});

describe('typed-value inference', () => {
  it('infers number / boolean / object dataType for newly-added env vars', () => {
    const filePath = writeFile('typed.yml', 'name: typed\nvariables: []\n');
    persistVariableUpdates(
      { envVariables: { count: 42, flag: true, cfg: { port: 3000 } } },
      { envFile: { path: filePath, format: 'yml' } }
    );
    const { parseEnvironment } = require('@usebruno/filestore');
    const reparsed = parseEnvironment(fs.readFileSync(filePath, 'utf8'), { format: 'yml' });
    const byName = Object.fromEntries(reparsed.variables.map((v) => [v.name, v]));
    expect(byName.count).toMatchObject({ value: 42, dataType: 'number' });
    expect(byName.flag).toMatchObject({ value: true, dataType: 'boolean' });
    expect(byName.cfg).toMatchObject({ value: { port: 3000 }, dataType: 'object' });
  });

  it('preserves existing dataType when script writes the same typed value', () => {
    const filePath = writeFile('typed.yml',
      'name: typed\nvariables:\n  - name: count\n    value:\n      type: number\n      data: "1"\n'
    );
    persistVariableUpdates(
      { envVariables: { count: 5 } },
      { envFile: { path: filePath, format: 'yml' } }
    );
    const { parseEnvironment } = require('@usebruno/filestore');
    const reparsed = parseEnvironment(fs.readFileSync(filePath, 'utf8'), { format: 'yml' });
    expect(reparsed.variables[0]).toMatchObject({ name: 'count', value: 5, dataType: 'number' });
  });

  it('drops dataType when a previously typed key is set back to a string', () => {
    const filePath = writeFile('typed.yml',
      'name: typed\nvariables:\n  - name: val\n    value:\n      type: number\n      data: 1\n'
    );
    persistVariableUpdates(
      { envVariables: { val: 'now-a-string' } },
      { envFile: { path: filePath, format: 'yml' } }
    );
    const written = fs.readFileSync(filePath, 'utf8');
    expect(written).not.toMatch(/type:\s*number/);
    expect(written).toMatch(/value:\s*now-a-string/);
  });

  it('infers dataType for newly-added collection vars', () => {
    const collectionRootPath = writeFile('collection.bru', 'meta {\n  name: t\n  seq: 1\n}\n');
    const collection = {
      format: 'bru',
      brunoConfig: { name: 't' },
      root: { meta: { name: 't', seq: 1 }, request: { vars: { req: [] } } }
    };
    persistVariableUpdates(
      { collectionVariables: { count: 7, flag: false } },
      { collection, collectionRootPath }
    );
    const countVar = collection.root.request.vars.req.find((v) => v.name === 'count');
    const flagVar = collection.root.request.vars.req.find((v) => v.name === 'flag');
    expect(countVar.dataType).toBe('number');
    expect(flagVar.dataType).toBe('boolean');
  });
});

describe('script-driven typed vars: disk content has the right dataType annotations', () => {
  // The .bru serializer emits `@number\n  port: 3000` (annotation on its own line) — see
  // packages/bruno-lang/v2/src/utils.js serializeAnnotations + serializeVar.
  it('persists @number/@boolean/@object annotations in a .bru env file', () => {
    const filePath = writeFile('Test.bru', 'vars {\n  host: https://example.test\n}\n');

    persistVariableUpdates(
      {
        envVariables: {
          host: 'https://example.test',
          envNum: 42,
          envBool: true,
          envObj: { port: 3000, ssl: true },
          envStr: 'hello'
        }
      },
      { envFile: { path: filePath, format: 'bru' } }
    );

    const written = fs.readFileSync(filePath, 'utf8');
    expect(written).toMatch(/@number\s+envNum:\s*42/);
    expect(written).toMatch(/@boolean\s+envBool:\s*true/);
    expect(written).toMatch(/@object\s+envObj:/);
    expect(written).toContain('"port": 3000');
    expect(written).toContain('"ssl": true');
    // 'string' is the implicit default — never materialized as an annotation.
    expect(written).not.toMatch(/@string\s+envStr/);
    expect(written).toMatch(/envStr:\s*hello/);
  });

  it('persists @number/@boolean/@object annotations in collection.bru for collection vars', () => {
    const collectionRootPath = writeFile(
      'collection.bru',
      'meta {\n  name: typed-collection\n  seq: 1\n}\n'
    );
    const collection = {
      format: 'bru',
      brunoConfig: { name: 'typed-collection' },
      root: {
        meta: { name: 'typed-collection', seq: 1 },
        request: { vars: { req: [] } }
      }
    };

    persistVariableUpdates(
      {
        collectionVariables: {
          collNum: 7,
          collBool: false,
          collObj: { region: 'eu', retries: 3 },
          collStr: 'plain'
        }
      },
      { collection, collectionRootPath }
    );

    const written = fs.readFileSync(collectionRootPath, 'utf8');
    expect(written).toMatch(/@number\s+collNum:\s*7/);
    expect(written).toMatch(/@boolean\s+collBool:\s*false/);
    expect(written).toMatch(/@object\s+collObj:/);
    expect(written).toContain('"region": "eu"');
    expect(written).toContain('"retries": 3');
    expect(written).not.toMatch(/@string\s+collStr/);
    expect(written).toMatch(/collStr:\s*plain/);
  });

  // The yml serializer encodes typed values as a `{ type, data }` block instead of `@dataType`
  // decorators — see packages/bruno-filestore/src/formats/yml/common/datatype.ts.
  it('persists typed global env vars to a yml global env file with type/data blocks', () => {
    const globalPath = writeFile(
      'global.yml',
      'name: global\nvariables:\n  - name: baseUrl\n    value: https://example.test\n'
    );

    persistVariableUpdates(
      {
        globalEnvironmentVariables: {
          baseUrl: 'https://example.test',
          globalNum: 99,
          globalBool: false,
          globalObj: { tier: 'premium', limit: 100 }
        }
      },
      { globalEnvFile: { path: globalPath, format: 'yml' } }
    );

    const written = fs.readFileSync(globalPath, 'utf8');
    expect(written).toMatch(/name:\s*globalNum[\s\S]*?type:\s*number[\s\S]*?data:\s*['"]?99/);
    expect(written).toMatch(/name:\s*globalBool[\s\S]*?type:\s*boolean[\s\S]*?data:\s*['"]?false/);
    expect(written).toMatch(/name:\s*globalObj[\s\S]*?type:\s*object[\s\S]*?data:[\s\S]*?tier/);
    // 'string' values stay as raw `value: ...` — no type/data block.
    expect(written).toMatch(/name:\s*baseUrl[\s\S]*?value:\s*https:\/\/example\.test/);
    expect(written).not.toMatch(/name:\s*baseUrl[\s\S]*?type:\s*string/);
  });

  // Regression guard: a script that writes a string to a previously typed key must drop the
  // annotation so the disk shape matches the new value's inferred dataType.
  it('drops the @number annotation in a .bru env file when a script downgrades the value to a string', () => {
    const filePath = writeFile(
      'Test.bru',
      'vars {\n  @number\n  count: 1\n}\n'
    );

    persistVariableUpdates(
      { envVariables: { count: 'now-a-string' } },
      { envFile: { path: filePath, format: 'bru' } }
    );

    const written = fs.readFileSync(filePath, 'utf8');
    expect(written).not.toMatch(/@number/);
    expect(written).toMatch(/count:\s*now-a-string/);
  });
});

// Regression guards for --env-var leak: CLI overrides commonly carry secret material
// (the CLI can't decrypt secret vars at rest, so users pass them in transiently).
// Those values must never reach disk, and the file's existing entry must be preserved.
describe('mergeScriptVarsIntoEnvList — --env-var overrides', () => {
  it('does not persist an override value even when the script returns it back in the env map', () => {
    const variables = [
      { name: 'token', value: 'real-secret', enabled: true, type: 'text', secret: true },
      { name: 'host', value: 'localhost', enabled: true, type: 'text', secret: false }
    ];
    // Runtime returns the full env map (because some other var was dirtied), including the override.
    const scriptVars = { token: 'transient-cli-value', host: 'api.example.com' };

    const merged = mergeScriptVarsIntoEnvList(variables, scriptVars, {
      overrides: new Set(['token'])
    });

    const tokenEntry = merged.find((v) => v.name === 'token');
    expect(tokenEntry).toBeDefined();
    expect(tokenEntry.value).toBe('real-secret');
    expect(tokenEntry.secret).toBe(true);

    const hostEntry = merged.find((v) => v.name === 'host');
    expect(hostEntry.value).toBe('api.example.com');
  });

  it('does not drop an overridden file entry when the script does not echo it back', () => {
    const variables = [
      { name: 'token', value: 'real-secret', enabled: true, type: 'text', secret: true }
    ];
    // Script touched something else; runtime returns env without `token` since the override
    // was filtered out before this call (or simply was never in the map).
    const merged = mergeScriptVarsIntoEnvList(variables, { other: 'x' }, {
      overrides: new Set(['token'])
    });

    expect(merged.find((v) => v.name === 'token')).toMatchObject({ value: 'real-secret', secret: true });
  });

  it('does not append a new entry for an override key the script also set', () => {
    const merged = mergeScriptVarsIntoEnvList([], { token: 'transient', x: '1' }, {
      overrides: new Set(['token'])
    });

    expect(merged.find((v) => v.name === 'token')).toBeUndefined();
    expect(merged.find((v) => v.name === 'x')).toBeDefined();
  });
});

describe('persistVariableUpdates — disk error resilience', () => {
  // CI runs may execute against read-only mounts. The PR's design choice is to log + continue.
  // The actual try/catch lives in run-single-request.js; persistVariableUpdates itself surfaces
  // the throw, which is what we verify here — the caller is the one that swallows it.
  it('surfaces fs errors to the caller (caller is expected to catch and warn)', () => {
    const filePath = path.join(tmpBase, 'Locked.bru');
    fs.writeFileSync(filePath, 'vars {\n  host: old\n}\n');
    fs.chmodSync(filePath, 0o444);

    let threw = false;
    try {
      persistVariableUpdates(
        { envVariables: { host: 'new' } },
        { envFile: { path: filePath, format: 'bru' } }
      );
    } catch (err) {
      threw = true;
      expect(err.code).toMatch(/EACCES|EPERM/);
    } finally {
      fs.chmodSync(filePath, 0o644);
    }

    // On some filesystems / OS combos chmod 444 doesn't block root-equivalent writes (e.g.
    // running as root in a container). Skip the assertion in that case rather than fail noisily.
    if (process.getuid && process.getuid() !== 0) {
      expect(threw).toBe(true);
    }
  });
});
