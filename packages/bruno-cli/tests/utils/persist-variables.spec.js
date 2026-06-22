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
});
