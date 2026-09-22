import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import postmanToBruno from '../../src/postman/postman-to-bruno';
import { detectPostmanVaultKeys, mangleVaultKey } from '../../src/postman/postman-vault';
import { makeCollection } from '../common/postman-collection';

const makeVaultRequest = (name, { header = [], script } = {}) => ({
  name,
  request: {
    method: 'GET',
    header,
    url: { raw: 'https://example.com', protocol: 'https', host: ['example', 'com'] }
  },
  ...(script ? { event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: script } }] } : {})
});

describe('mangleVaultKey', () => {
  it('should fold the colon into a vault_ prefix', () => {
    expect(mangleVaultKey('api-key')).toBe('vault_api-key');
  });

  it('should keep characters the bru and yml env formats both accept', () => {
    expect(mangleVaultKey('service.api-key_v2')).toBe('vault_service.api-key_v2');
  });

  it('should replace characters no env format accepts', () => {
    expect(mangleVaultKey('api key/v2')).toBe('vault_api_key_v2');
    expect(mangleVaultKey('~api:key')).toBe('vault__api_key');
  });
});

describe('detectPostmanVaultKeys', () => {
  it('should find references anywhere in the collection and dedupe them', () => {
    const collection = makeCollection([
      makeVaultRequest('One', { header: [{ key: 'Authorization', value: 'Bearer {{vault:api-key}}' }] }),
      makeVaultRequest('Two', { header: [{ key: 'X-Tenant', value: '{{vault:api-key}}/{{vault:tenant}}' }] })
    ]);

    expect(detectPostmanVaultKeys(collection)).toEqual([
      { key: 'api-key', name: 'vault_api-key' },
      { key: 'tenant', name: 'vault_tenant' }
    ]);
  });

  it('should return nothing for a collection without vault references', () => {
    expect(detectPostmanVaultKeys(makeCollection([makeVaultRequest('One')]))).toEqual([]);
  });

  it('should not recurse forever on a circular reference', () => {
    const circular = {};
    circular.self = circular;

    expect(detectPostmanVaultKeys(makeCollection([makeVaultRequest('One', { header: [{ key: circular }] })]))).toEqual([]);
  });
});

describe('postman vault secrets on import', () => {
  it('should rewrite references in request fields and report the keys', async () => {
    const collection = makeCollection([
      makeVaultRequest('One', { header: [{ key: 'Authorization', value: 'Bearer {{vault:api-key}}' }] })
    ]);

    const { collection: brunoCollection, vaultKeys } = await postmanToBruno(collection);

    expect(brunoCollection.items[0].request.headers[0].value).toBe('Bearer {{vault_api-key}}');
    expect(vaultKeys).toEqual([{ key: 'api-key', name: 'vault_api-key' }]);
  });

  it('should leave a collection without vault references untouched', async () => {
    const { collection, vaultKeys } = await postmanToBruno(makeCollection([makeVaultRequest('One')]));

    expect(vaultKeys).toEqual([]);
    expect(collection.items[0].name).toBe('One');
  });

  it('should translate pm.vault reads against the global environment by default', async () => {
    const collection = makeCollection([makeVaultRequest('One', { script: ['const t = pm.vault.get("api-key");'] })]);

    const { collection: brunoCollection } = await postmanToBruno(collection);

    expect(brunoCollection.items[0].request.script.req).toBe('const t = bru.getGlobalEnvVar("vault_api-key");');
  });

  it('should translate pm.vault reads against the collection environment when chosen', async () => {
    const collection = makeCollection([makeVaultRequest('One', { script: ['const t = pm.vault.get("api-key");'] })]);

    const { collection: brunoCollection } = await postmanToBruno(collection, { vaultTarget: 'collection' });

    expect(brunoCollection.items[0].request.script.req).toBe('const t = bru.getEnvVar("vault_api-key");');
  });

  it('should still rewrite references when scripts are preserved', async () => {
    const collection = makeCollection([
      makeVaultRequest('One', {
        header: [{ key: 'Authorization', value: '{{vault:api-key}}' }],
        script: ['const t = pm.vault.get("api-key");']
      })
    ]);

    const { collection: brunoCollection } = await postmanToBruno(collection, { preserveScripts: true });

    expect(brunoCollection.items[0].request.headers[0].value).toBe('{{vault_api-key}}');
    expect(brunoCollection.items[0].request.script.req).toBe('const t = pm.vault.get("api-key");');
  });
});

describe('the shared vault fixture collection', () => {
  // Also importable by hand for manual testing - see tests/import/postman/fixtures.
  const readFixture = () =>
    JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../../../tests/import/postman/fixtures/postman-with-vault-secrets.json'),
        'utf8'
      )
    );

  it('should report every key once, with its mangled name', async () => {
    const { issues, vaultKeys } = await postmanToBruno(readFixture());

    expect(issues).toEqual([]);
    expect(vaultKeys).toEqual([
      { key: 'api-key', name: 'vault_api-key' },
      { key: 'db password', name: 'vault_db_password' },
      { key: 'service/token', name: 'vault_service_token' },
      { key: 'tenant.id', name: 'vault_tenant.id' }
    ]);
  });

  it('should rewrite references in auth, headers, query params and both body types', async () => {
    const { collection } = await postmanToBruno(readFixture());
    const [headerRequest, jsonRequest, formRequest, folder] = collection.items;

    expect(collection.root.request.auth.bearer.token).toBe('{{vault_api-key}}');

    const headers = Object.fromEntries(headerRequest.request.headers.map((h) => [h.name, h.value]));
    expect(headers.Authorization).toBe('Bearer {{vault_api-key}}');
    expect(headers['X-Tenant']).toBe('{{vault_tenant.id}}');
    expect(headers['X-Plain']).toBe('{{plainVar}}');

    expect(headerRequest.request.url).toContain('{{vault_tenant.id}}');
    expect(headerRequest.request.params[0].value).toBe('{{vault_tenant.id}}');

    expect(jsonRequest.request.body.json).toContain('{{vault_db_password}}');
    expect(formRequest.request.body.formUrlEncoded[0].value).toBe('{{vault_service_token}}');
    expect(folder.items[0].request.headers[0].value).toBe('{{vault_api-key}}');
  });

  it('should read the same mangled names from scripts that the references were rewritten to', async () => {
    const { collection } = await postmanToBruno(readFixture());
    const [headerRequest, aliasRequest, destructuredRequest, folder] = collection.items;

    expect(collection.root.request.script.req).toContain('bru.getGlobalEnvVar("vault_api-key")');

    // await survives, since awaiting a non-promise resolves to the value
    expect(headerRequest.request.script.req).toContain('await bru.getGlobalEnvVar("vault_api-key")');
    expect(headerRequest.request.script.req).toContain('await bru.getGlobalEnvVar("vault_tenant.id")');

    expect(aliasRequest.request.script.req).toContain('bru.getGlobalEnvVar("vault_db_password")');
    expect(destructuredRequest.request.script.req).toContain('bru.getGlobalEnvVar("vault_service_token")');
    expect(destructuredRequest.request.script.req).toContain('bru.getGlobalEnvVar("vault_tenant.id")');

    expect(folder.items[0].request.script.req).toContain('bru.setGlobalEnvVar("vault_api-key", \'rotated-value\')');
    expect(folder.items[0].request.script.req).toContain('bru.deleteGlobalEnvVar("vault_service_token")');

    const scripts = [
      collection.root.request.script.req,
      headerRequest.request.script.req,
      aliasRequest.request.script.req,
      destructuredRequest.request.script.req,
      folder.items[0].request.script.req
    ];
    scripts.forEach((script) => expect(script).not.toContain('vault.get'));
  });

  it('should point scripts at the collection environment when that target is chosen', async () => {
    const { collection } = await postmanToBruno(readFixture(), { vaultTarget: 'collection' });

    expect(collection.items[0].request.script.req).toContain('await bru.getEnvVar("vault_api-key")');
    expect(collection.items[3].items[0].request.script.req).toContain('bru.deleteEnvVar("vault_service_token")');
  });
});
