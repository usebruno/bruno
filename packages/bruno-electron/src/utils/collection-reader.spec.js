const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stringifyRequest, stringifyEnvironment, stringifyCollection } = require('@usebruno/filestore');
const { readCollectionForApiSpec } = require('./collection-reader');

const httpItem = (name, url) => ({
  type: 'http-request',
  name,
  seq: 1,
  request: { method: 'GET', url, headers: [], params: [], body: { mode: 'none' }, auth: { mode: 'none' } }
});

const gqlItem = (name, url, query) => ({
  type: 'graphql-request',
  name,
  seq: 1,
  request: { method: 'POST', url, headers: [], params: [], body: { mode: 'graphql', graphql: { query, variables: '' } }, auth: { mode: 'none' } }
});

const envObj = (name, variables) => ({ name, variables });

const tmpDirs = [];
const mkTmp = (tag) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `apispec-${tag}-`));
  tmpDirs.push(dir);
  return dir;
};
const writeFile = (dir, rel, content) => {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

const mkCollection = (tag) => {
  const dir = mkTmp(tag);
  writeFile(dir, 'bruno.json', JSON.stringify({ version: '1', name: 'MyCollection' }));
  return dir;
};

afterAll(() => {
  tmpDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }));
});

describe.each(['bru', 'yml'])('readCollectionForApiSpec: %s collections', (format) => {
  const ext = format === 'yml' ? 'yml' : 'bru';
  let result;

  beforeAll(async () => {
    const dir = mkTmp(format);
    if (format === 'yml') {
      writeFile(dir, 'opencollection.yml', stringifyCollection({}, { name: 'MyCollection', version: '1' }));
    } else {
      writeFile(dir, 'bruno.json', JSON.stringify({ version: '1', name: 'MyCollection' }));
    }
    writeFile(dir, `GetUsers.${ext}`, stringifyRequest(httpItem('GetUsers', 'https://api.test/users'), { format }));
    writeFile(dir, path.join('FolderA', `GetPosts.${ext}`), stringifyRequest(httpItem('GetPosts', 'https://api.test/posts'), { format }));
    writeFile(dir, path.join('FolderA', `GqlUsers.${ext}`), stringifyRequest(gqlItem('GqlUsers', 'https://api.test/graphql', '{ users { id } }'), { format }));
    writeFile(dir, path.join('environments', `Local.${ext}`), stringifyEnvironment(envObj('Local', [{ name: 'baseUrl', value: 'https://local.test', enabled: true, secret: false, type: 'text' }]), { format }));
    writeFile(dir, path.join('environments', `Prod.${ext}`), stringifyEnvironment(envObj('Prod', [{ name: 'baseUrl', value: 'https://prod.test', enabled: true, secret: false, type: 'text' }]), { format }));
    result = await readCollectionForApiSpec(dir);
  });

  it('reads every http and graphql request, including nested folders', () => {
    const byName = Object.fromEntries(result.requests.map((f) => [f.name, f.type]));
    expect(byName).toEqual({ GetUsers: 'http-request', GetPosts: 'http-request', GqlUsers: 'graphql-request' });
  });

  it('reads the collection name from the config file for its format', () => {
    expect(result.name).toBe('MyCollection');
  });

  it('sets pathname and depth so folder tags/operationIds match the in-app export', () => {
    const byName = Object.fromEntries(result.requests.map((f) => [f.name, f]));
    expect(byName.GetUsers.depth).toBe(1);
    expect(byName.GetPosts.depth).toBe(2);
    expect(byName.GqlUsers.depth).toBe(2);
    expect(path.isAbsolute(byName.GetUsers.pathname)).toBe(true);
    expect(byName.GetUsers.pathname.endsWith(`GetUsers.${ext}`)).toBe(true);
  });

  it('keeps the graphql query intact in the parsed request body', () => {
    const gql = result.requests.find((f) => f.name === 'GqlUsers');
    expect(gql.request.body.mode).toBe('graphql');
    expect(gql.request.body.graphql.query).toContain('users');
  });

  it('loads every environment with its own variables', () => {
    expect(Object.keys(result.envVariables).sort()).toEqual([`Local.${ext}`, `Prod.${ext}`]);
    const local = result.envVariables[`Local.${ext}`].find((v) => v.name === 'baseUrl');
    expect(local.value).toBe('https://local.test');
    const prod = result.envVariables[`Prod.${ext}`].find((v) => v.name === 'baseUrl');
    expect(prod.value).toBe('https://prod.test');
  });
});

describe('readCollectionForApiSpec: robustness', () => {
  it('skips an unparseable request file instead of failing the whole load, and reports it in skipped', async () => {
    const dir = mkCollection('bad');
    writeFile(dir, 'Good.bru', stringifyRequest(httpItem('Good', 'https://api.test/ok'), { format: 'bru' }));
    writeFile(dir, 'Broken.bru', 'not valid bru at all {{{{');
    const result = await readCollectionForApiSpec(dir);
    expect(result.requests.map((f) => f.name)).toEqual(['Good']);
    expect(result.skipped).toEqual(['Broken.bru']);
  });

  it('rejects when a directory inside the collection cannot be read, so the load error is surfaced', async () => {
    const dir = mkCollection('noaccess');
    writeFile(dir, 'GetUsers.bru', stringifyRequest(httpItem('GetUsers', 'https://api.test/ok'), { format: 'bru' }));
    writeFile(dir, path.join('locked', 'Hidden.bru'), stringifyRequest(httpItem('Hidden', 'https://api.test/hidden'), { format: 'bru' }));
    const lockedDir = path.join(dir, 'locked');
    const realReaddir = fs.readdirSync;
    const spy = jest.spyOn(fs, 'readdirSync').mockImplementation((p, opts) => {
      if (p === lockedDir) {
        const err = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      }
      return realReaddir(p, opts);
    });
    try {
      await expect(readCollectionForApiSpec(dir)).rejects.toThrow('EACCES');
    } finally {
      spy.mockRestore();
    }
  });

  it('rejects when the collection root itself cannot be read, instead of returning an empty result', async () => {
    const dir = mkCollection('noaccess-root');
    writeFile(dir, 'GetUsers.bru', stringifyRequest(httpItem('GetUsers', 'https://api.test/ok'), { format: 'bru' }));
    const realReaddir = fs.readdirSync;
    const spy = jest.spyOn(fs, 'readdirSync').mockImplementation((p, opts) => {
      if (p === dir) {
        const err = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      }
      return realReaddir(p, opts);
    });
    try {
      await expect(readCollectionForApiSpec(dir)).rejects.toThrow('EACCES');
    } finally {
      spy.mockRestore();
    }
  });

  it('reports a malformed bru environment in skipped instead of raising an unhandled promise rejection', async () => {
    const dir = mkCollection('bad-env');
    writeFile(dir, path.join('environments', 'Broken.bru'), '@@@ not valid bru @@@\n');
    writeFile(dir, path.join('environments', 'Good.bru'), stringifyEnvironment(envObj('Good', [{ name: 'baseUrl', value: 'https://x', enabled: true, secret: false, type: 'text' }]), { format: 'bru' }));
    const result = await readCollectionForApiSpec(dir);
    expect(Object.keys(result.envVariables)).toEqual(['Good.bru']);
    expect(result.skipped).toEqual([path.join('environments', 'Broken.bru')]);
  });

  it('reads .env into processEnvVariables', async () => {
    const dir = mkCollection('dotenv');
    writeFile(dir, '.env', 'API_TOKEN=secret123\n');
    const result = await readCollectionForApiSpec(dir);
    expect(result.processEnvVariables.API_TOKEN).toBe('secret123');
  });

  it('applies the injected decryptEnvSecrets callback to a bru environment secret', async () => {
    const dir = mkCollection('secret');
    writeFile(dir, path.join('environments', 'Local.bru'), stringifyEnvironment(envObj('Local', [{ name: 'token', value: '', enabled: true, secret: true, type: 'text' }]), { format: 'bru' }));
    const decryptEnvSecrets = jest.fn((environment) => {
      environment.variables.find((v) => v.name === 'token').value = 'decrypted';
    });
    const result = await readCollectionForApiSpec(dir, { decryptEnvSecrets });
    expect(decryptEnvSecrets).toHaveBeenCalledWith(expect.anything(), 'Local');
    expect(result.envVariables['Local.bru'].find((v) => v.name === 'token').value).toBe('decrypted');
  });

  it('applies injected decryptEnvSecrets to a yml environment secret, stripping the .yml extension for the name', async () => {
    const dir = mkCollection('secret-yml');
    writeFile(dir, path.join('environments', 'Local.yml'), stringifyEnvironment(envObj('Local', [{ name: 'token', value: '', enabled: true, secret: true, type: 'text' }]), { format: 'yml' }));
    const decryptEnvSecrets = jest.fn((environment) => {
      environment.variables.find((v) => v.name === 'token').value = 'decrypted';
    });
    const result = await readCollectionForApiSpec(dir, { decryptEnvSecrets });
    expect(decryptEnvSecrets).toHaveBeenCalledWith(expect.anything(), 'Local');
    expect(result.envVariables['Local.yml'].find((v) => v.name === 'token').value).toBe('decrypted');
  });

  it.each(['bru', 'yml'])('%s: marks which variables are secret, so the caller can tell a secret environment apart', async (format) => {
    const ext = format === 'yml' ? 'yml' : 'bru';
    const dir = mkCollection(`secret-flag-${format}`);
    writeFile(
      dir,
      path.join('environments', `Local.${ext}`),
      stringifyEnvironment(
        envObj('Local', [
          { name: 'token', value: '', enabled: true, secret: true, type: 'text' },
          { name: 'baseUrl', value: 'https://x', enabled: true, secret: false, type: 'text' }
        ]),
        { format }
      )
    );

    const result = await readCollectionForApiSpec(dir);
    const byName = Object.fromEntries(result.envVariables[`Local.${ext}`].map((v) => [v.name, v.secret]));

    expect(byName).toEqual({ token: true, baseUrl: false });
  });
});

describe('readCollectionForApiSpec: yml collection config (opencollection.yml)', () => {
  it('reads the name from opencollection.yml and honors its ignore patterns for a yml collection', async () => {
    const dir = mkTmp('ocignore');
    writeFile(dir, 'opencollection.yml', stringifyCollection({}, { name: 'YmlColl', version: '1', ignore: ['drafts/**'] }));
    writeFile(dir, 'GetUsers.yml', stringifyRequest(httpItem('GetUsers', 'https://api.test/users'), { format: 'yml' }));
    writeFile(dir, path.join('drafts', 'Scratch.yml'), stringifyRequest(httpItem('Scratch', 'https://api.test/scratch'), { format: 'yml' }));
    const result = await readCollectionForApiSpec(dir);
    expect(result.name).toBe('YmlColl');
    expect(result.requests.map((f) => f.name)).toEqual(['GetUsers']);
  });
});

describe('readCollectionForApiSpec: .yaml extension environments', () => {
  it('stores a .yaml environment under its file name and strips the extension for the secrets lookup', async () => {
    const dir = mkCollection('yaml-env');
    writeFile(dir, path.join('environments', 'Local.yaml'), stringifyEnvironment(envObj('Local', [{ name: 'baseUrl', value: 'https://local.test', enabled: true, secret: false, type: 'text' }]), { format: 'yml' }));
    const decryptEnvSecrets = jest.fn();
    const result = await readCollectionForApiSpec(dir, { decryptEnvSecrets });
    expect(Object.keys(result.envVariables)).toEqual(['Local.yaml']);
    expect(decryptEnvSecrets).toHaveBeenCalledWith(expect.anything(), 'Local');
  });
});

describe('readCollectionForApiSpec: collection-level variables', () => {
  it('extracts enabled collection variables from the collection root so the exporter can resolve them', async () => {
    const dir = mkTmp('collvars');
    writeFile(dir, 'opencollection.yml', stringifyCollection(
      { request: { vars: { req: [{ name: 'baseUrl', value: 'https://coll.test', enabled: true, type: 'text' }] } } },
      { name: 'C', version: '1' }
    ));
    writeFile(dir, 'GetUsers.yml', stringifyRequest(httpItem('GetUsers', '{{baseUrl}}/users'), { format: 'yml' }));
    const result = await readCollectionForApiSpec(dir);
    expect(result.collectionVariables).toEqual({ baseUrl: 'https://coll.test' });
    expect(result.requests.map((f) => f.name)).toEqual(['GetUsers']);
  });

  it('extracts collection variables from a bru collection root, which parses to a different shape than yml', async () => {
    const dir = mkTmp('collvars-bru');
    writeFile(dir, 'bruno.json', JSON.stringify({ version: '1', name: 'BruColl' }));
    writeFile(dir, 'collection.bru', 'vars:pre-request {\n  baseUrl: https://coll.test\n}\n');
    writeFile(dir, 'GetUsers.bru', stringifyRequest(httpItem('GetUsers', '{{baseUrl}}/users'), { format: 'bru' }));
    const result = await readCollectionForApiSpec(dir);
    expect(result.collectionVariables).toEqual({ baseUrl: 'https://coll.test' });
    expect(result.requests.map((f) => f.name)).toEqual(['GetUsers']);
  });

  it('leaves out disabled collection variables', async () => {
    const dir = mkTmp('collvars-disabled');
    writeFile(dir, 'opencollection.yml', stringifyCollection(
      { request: { vars: { req: [
        { name: 'baseUrl', value: 'https://coll.test', enabled: true, type: 'text' },
        { name: 'oldUrl', value: 'https://old.test', enabled: false, type: 'text' }
      ] } } },
      { name: 'C', version: '1' }
    ));
    const result = await readCollectionForApiSpec(dir);
    expect(result.collectionVariables).toEqual({ baseUrl: 'https://coll.test' });
  });
});

describe('readCollectionForApiSpec: config edge cases', () => {
  it('prefers opencollection.yml over bruno.json when both exist', async () => {
    const dir = mkTmp('both-configs');
    writeFile(dir, 'opencollection.yml', stringifyCollection({}, { name: 'FromYml', version: '1' }));
    writeFile(dir, 'bruno.json', JSON.stringify({ version: '1', name: 'FromJson' }));
    const result = await readCollectionForApiSpec(dir);
    expect(result.name).toBe('FromYml');
  });

  it('still loads requests when opencollection.yml is malformed', async () => {
    const dir = mkTmp('bad-config');
    writeFile(dir, 'opencollection.yml', ':: not valid yaml ::\n\t');
    writeFile(dir, 'GetUsers.yml', stringifyRequest(httpItem('GetUsers', 'https://api.test/users'), { format: 'yml' }));
    const result = await readCollectionForApiSpec(dir);
    expect(result.name).toBe('');
    expect(result.requests.map((f) => f.name)).toEqual(['GetUsers']);
  });

  it('reports a malformed collection root in skipped so the missing collection variables are surfaced', async () => {
    const dir = mkTmp('bad-root');
    writeFile(dir, 'bruno.json', JSON.stringify({ version: '1', name: 'BruColl' }));
    writeFile(dir, 'collection.bru', 'vars:pre-request {{{ broken');
    writeFile(dir, 'GetUsers.bru', stringifyRequest(httpItem('GetUsers', '{{baseUrl}}/users'), { format: 'bru' }));
    const result = await readCollectionForApiSpec(dir);
    expect(result.skipped).toEqual(['collection.bru']);
    expect(result.collectionVariables).toEqual({});
    expect(result.requests.map((f) => f.name)).toEqual(['GetUsers']);
  });

  it('reads a real collection that has no requests in it and simply finds nothing to export', async () => {
    const dir = mkTmp('empty');
    writeFile(dir, 'bruno.json', JSON.stringify({ version: '1', name: 'Empty' }));
    const result = await readCollectionForApiSpec(dir);
    expect(result.requests).toEqual([]);
    expect(result.envVariables).toEqual({});
    expect(result.collectionVariables).toEqual({});
    expect(result.skipped).toEqual([]);
    expect(result.name).toBe('Empty');
  });
});

describe('readCollectionForApiSpec: folders that are not Bruno collections', () => {
  it('refuses a folder that does not contain a Bruno collection file', async () => {
    const dir = mkTmp('not-a-collection');
    writeFile(dir, 'readme.txt', 'i am not a collection');
    await expect(readCollectionForApiSpec(dir)).rejects.toThrow('No bruno.json or opencollection.yml found');
  });

  it('refuses a completely empty folder', async () => {
    await expect(readCollectionForApiSpec(mkTmp('bare'))).rejects.toThrow('No bruno.json or opencollection.yml found');
  });

  it('refuses a folder that does not exist, rather than pretending the collection was empty', async () => {
    const missing = path.join(mkTmp('missing'), 'gone');
    await expect(readCollectionForApiSpec(missing)).rejects.toThrow('No bruno.json or opencollection.yml found');
  });

  it('says which Bruno collection file it found, so the app can tell a real collection from any other folder', async () => {
    const ymlDir = mkTmp('marker-yml');
    writeFile(ymlDir, 'opencollection.yml', stringifyCollection({}, { name: 'FromYml', version: '1' }));
    expect((await readCollectionForApiSpec(ymlDir)).configFile).toBe('opencollection.yml');

    const jsonDir = mkTmp('marker-json');
    writeFile(jsonDir, 'bruno.json', JSON.stringify({ version: '1', name: 'FromJson' }));
    expect((await readCollectionForApiSpec(jsonDir)).configFile).toBe('bruno.json');
  });

  it('accepts a collection that uses the older bruno.json file', async () => {
    const dir = mkTmp('json-only');
    writeFile(dir, 'bruno.json', JSON.stringify({ version: '1', name: 'JsonOnly' }));
    writeFile(dir, 'GetUsers.bru', stringifyRequest(httpItem('GetUsers', 'https://api.test/ok'), { format: 'bru' }));
    const result = await readCollectionForApiSpec(dir);
    expect(result.requests.map((f) => f.name)).toEqual(['GetUsers']);
  });
});
