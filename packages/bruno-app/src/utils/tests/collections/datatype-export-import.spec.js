// Stub both `nanoid` and `customAlphabet` — the import pipeline needs both.
jest.mock('nanoid', () => ({
  nanoid: () => 'aaaaaaaaaaaaaaaaaaaa1',
  customAlphabet: () => () => 'aaaaaaaaaaaaaaaaaaaa1'
}));

import { transformCollectionToSaveToExportAsFile } from '../../collections/index';
import { prepareCollectionForExport, deleteSecretsInEnvs } from '../../collections/export';
import { processBrunoCollection } from '../../importers/bruno-collection';

const UID = 'aaaaaaaaaaaaaaaaaaaa1';
const typedVars = () => [
  { uid: UID, name: 'count', value: 42, enabled: true, dataType: 'number' },
  { uid: UID, name: 'flag', value: true, enabled: true, dataType: 'boolean' },
  { uid: UID, name: 'config', value: { a: 1 }, enabled: true, dataType: 'object' },
  { uid: UID, name: 'plain', value: 'hello', enabled: true }
];

const buildCollection = () => ({
  uid: UID,
  name: 'Typed Collection',
  version: '1',
  items: [
    {
      uid: UID,
      type: 'folder',
      name: 'typed-folder',
      seq: 1,
      root: {
        request: {
          headers: [],
          script: { req: null, res: null },
          vars: { req: typedVars(), res: [] },
          tests: null
        }
      },
      items: [
        {
          uid: UID,
          type: 'http-request',
          name: 'typed-request',
          seq: 1,
          request: {
            url: 'https://example.com',
            method: 'GET',
            headers: [],
            params: [],
            body: { mode: 'none' },
            auth: { mode: 'none' },
            script: { req: null, res: null },
            vars: { req: typedVars(), res: [] },
            assertions: [],
            tests: null
          }
        }
      ]
    }
  ],
  root: {
    request: {
      headers: [],
      script: { req: null, res: null },
      vars: { req: typedVars(), res: [] },
      tests: null
    }
  },
  environments: [
    {
      uid: UID,
      name: 'staging',
      variables: [
        { uid: UID, name: 'port', value: 8080, type: 'text', enabled: true, secret: false, dataType: 'number' },
        { uid: UID, name: 'debug', value: true, type: 'text', enabled: true, secret: false, dataType: 'boolean' },
        { uid: UID, name: 'config', value: { region: 'us' }, type: 'text', enabled: true, secret: false, dataType: 'object' },
        { uid: UID, name: 'plain', value: 'hi', type: 'text', enabled: true, secret: false },
        { uid: UID, name: 'token', value: 'shh', type: 'text', enabled: true, secret: true, dataType: 'number' }
      ]
    }
  ],
  brunoConfig: { version: '1', name: 'Typed Collection' }
});

const assertTypedVars = (vars) => {
  expect(vars).toHaveLength(4);
  expect(vars[0]).toMatchObject({ name: 'count', value: 42, dataType: 'number' });
  expect(vars[1]).toMatchObject({ name: 'flag', value: true, dataType: 'boolean' });
  expect(vars[2]).toMatchObject({ name: 'config', value: { a: 1 }, dataType: 'object' });
  expect(vars[3]).toMatchObject({ name: 'plain', value: 'hello' });
  expect(vars[3].dataType).toBeUndefined();
};

describe('Bruno JSON export/import — dataType preservation', () => {
  it('preserves dataType on collection / folder / request variables and env variables through a full round-trip', async () => {
    const collection = buildCollection();
    const exported = prepareCollectionForExport(transformCollectionToSaveToExportAsFile(collection));
    const json = JSON.parse(JSON.stringify(exported));

    const secretBeforeImport = json.environments[0].variables.find((v) => v.name === 'token');
    expect(secretBeforeImport.value).toBe('');
    expect(secretBeforeImport.dataType).toBe('number');

    const imported = await processBrunoCollection(json);

    assertTypedVars(imported.root.request.vars.req);
    const folder = imported.items.find((i) => i.type === 'folder');
    assertTypedVars(folder.root.request.vars.req);
    const request = folder.items.find((i) => i.type === 'http-request');
    assertTypedVars(request.request.vars.req);

    const envVars = imported.environments[0].variables;
    expect(envVars.find((v) => v.name === 'port')).toMatchObject({ value: 8080, dataType: 'number', secret: false });
    expect(envVars.find((v) => v.name === 'debug')).toMatchObject({ value: true, dataType: 'boolean', secret: false });
    expect(envVars.find((v) => v.name === 'config')).toMatchObject({ value: { region: 'us' }, dataType: 'object', secret: false });
    const plainEnv = envVars.find((v) => v.name === 'plain');
    expect(plainEnv).toMatchObject({ value: 'hi', secret: false });
    expect(plainEnv.dataType).toBeUndefined();
    const secretEnv = envVars.find((v) => v.name === 'token');
    expect(secretEnv).toMatchObject({ secret: true, value: '', dataType: 'number' });
  });
});

describe('deleteSecretsInEnvs', () => {
  it('clears the value but preserves dataType on secret variables', () => {
    const envs = [
      {
        variables: [
          { name: 'apiKey', value: 'shh', secret: true, dataType: 'number' },
          { name: 'visible', value: 42, secret: false, dataType: 'number' }
        ]
      }
    ];

    deleteSecretsInEnvs(envs);

    expect(envs[0].variables[0]).toEqual({ name: 'apiKey', value: '', secret: true, dataType: 'number' });
    expect(envs[0].variables[1]).toEqual({ name: 'visible', value: 42, secret: false, dataType: 'number' });
  });
});
