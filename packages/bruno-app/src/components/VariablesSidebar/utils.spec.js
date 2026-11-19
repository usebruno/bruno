import { countRows, getRequestReferences, getSidebarSections, getUsedSections } from './utils';

const variable = (name, value, extra = {}) => ({ uid: `uid-${name}`, name, value, enabled: true, ...extra });

const request = {
  uid: 'req-1',
  type: 'http-request',
  name: 'getInventory',
  request: {
    url: '{{store_base_url}}/inventory',
    params: [
      { uid: 'p1', name: 'tenant', value: '{{tenant_id}}', enabled: true },
      { uid: 'p2', name: 'off', value: '{{disabled_param_var}}', enabled: false }
    ],
    headers: [
      { uid: 'h1', name: 'Authorization', value: 'Bearer {{api_token}}', enabled: true },
      { uid: 'h2', name: 'X-Request-Id', value: '{{$randomUUID}}', enabled: true }
    ],
    body: { mode: 'json', json: '{"region": "{{region}}", "prompt": "{{?Ask me}}"}' },
    auth: { mode: 'none' },
    assertions: [{ uid: 'a1', name: 'res.status', value: 'eq {{expected_status}}', enabled: true }],
    script: {
      req: 'const page = bru.getVar("page_size");',
      res: 'bru.setVar(\'next_cursor\', res.body.next);'
    },
    tests: 'expect(bru.getVar(`limit`)).to.exist;',
    vars: {
      req: [variable('limit', '20', { dataType: 'number' }), variable('disabled_var', 'x', { enabled: false })],
      res: [variable('next_cursor', 'res.body.next')]
    }
  }
};

const storeFolder = {
  uid: 'folder-store',
  type: 'folder',
  name: 'store',
  root: { request: { vars: { req: [variable('store_base_url', '{{host}}/v2/store')] } } },
  items: [request]
};

const petFolder = {
  uid: 'folder-pet',
  type: 'folder',
  name: 'pet',
  root: { request: { vars: { req: [variable('pet_timeout', '5000')] } } },
  items: [storeFolder]
};

const baseEnv = { uid: 'env-base', name: 'Base', variables: [variable('region', 'eu-west-1')] };
const prodEnv = {
  uid: 'env-prod',
  name: 'Prod',
  color: '#ce4f3b',
  extends: 'Base',
  variables: [
    variable('host', 'https://prod'),
    variable('api_token', 'secret', { secret: true }),
    variable('limit', '50', { dataType: 'number' })
  ]
};

const collection = {
  uid: 'col-1',
  name: 'bruno-testbench',
  items: [petFolder],
  root: { request: { vars: { req: [variable('api_version', 'v2')] } } },
  environments: [baseEnv, prodEnv],
  activeEnvironmentUid: 'env-prod',
  processEnvVariables: { NODE_ENV: 'development' },
  workspaceProcessEnvVariables: { CI: 'false', NODE_ENV: 'ignored' },
  runtimeVariables: { region: 'runtime-region' }
};

const globalEnvironments = [{ uid: 'genv-1', name: 'My Workspace', color: '#2f6fdd', variables: [variable('org_id', 'org_7f3a21')] }];

const names = (section) => section.rows.map((row) => row.name);
const sectionByKey = (sections, key) => sections.find((entry) => entry.key === key);

describe('getSidebarSections', () => {
  const sections = getSidebarSections({ collection, item: request, globalEnvironments, activeGlobalEnvironmentUid: 'genv-1' });

  it('orders scopes from highest to lowest precedence', () => {
    expect(sections.map((entry) => entry.key)).toEqual([
      'runtime',
      'request',
      'folder:folder-store',
      'folder:folder-pet',
      'environment',
      'collection',
      'global',
      'process.env'
    ]);
  });

  it('lists enabled request vars and post-response vars as read-only', () => {
    const requestSection = sectionByKey(sections, 'request');
    expect(names(requestSection)).toEqual(['limit', 'next_cursor']);
    expect(requestSection.rows[1]).toMatchObject({ readOnly: true, postResponse: true });
  });

  it('parses stored values by their data type', () => {
    expect(sectionByKey(sections, 'request').rows[0]).toMatchObject({ value: 20, rawValue: '20', dataType: 'number' });
  });

  it('labels folder and environment sections with a coloured pill', () => {
    expect(sectionByKey(sections, 'folder:folder-store').pill).toEqual({ label: 'store' });
    expect(sectionByKey(sections, 'environment').pill).toEqual({ label: 'Prod', color: '#ce4f3b' });
    expect(sectionByKey(sections, 'global').pill).toEqual({ label: 'My Workspace', color: '#2f6fdd' });
  });

  it('includes inherited environment variables and keeps the secret flag', () => {
    const environment = sectionByKey(sections, 'environment');
    expect(names(environment)).toEqual(['region', 'host', 'api_token', 'limit']);
    expect(environment.rows.find((row) => row.name === 'api_token').secret).toBe(true);
  });

  it('shows one row for an inherited variable that the environment redefines as a secret', () => {
    const local = { uid: 'env-local', name: 'Local', variables: [variable('host', 'https://local')] };
    const prod = { uid: 'env-prod', name: 'Prod', extends: 'Local', variables: [variable('host', 'https://prod', { secret: true })] };
    const envSections = getSidebarSections({
      collection: { ...collection, environments: [local, prod], activeEnvironmentUid: 'env-prod' },
      item: null,
      globalEnvironments: [],
      activeGlobalEnvironmentUid: null
    });
    const hostRows = sectionByKey(envSections, 'environment').rows.filter((row) => row.name === 'host');
    expect(hostRows).toHaveLength(1);
    expect(hostRows[0]).toMatchObject({ value: 'https://prod', secret: true });
  });

  it('references process env variables through process.env', () => {
    expect(sectionByKey(sections, 'process.env').rows.map((row) => row.reference)).toEqual(['process.env.CI', 'process.env.NODE_ENV']);
  });

  it('reads drafts so unsaved edits show up', () => {
    const draftCollection = { ...collection, draft: { root: { request: { vars: { req: [variable('draft_var', 'd')] } } } } };
    const draftSections = getSidebarSections({ collection: draftCollection, item: null, globalEnvironments, activeGlobalEnvironmentUid: 'genv-1' });
    expect(names(sectionByKey(draftSections, 'collection'))).toEqual(['draft_var']);
  });

  it('skips request, folder and empty scopes without a request item', () => {
    const noItem = getSidebarSections({ collection, item: null, globalEnvironments, activeGlobalEnvironmentUid: null });
    expect(noItem.map((entry) => entry.key)).toEqual(['runtime', 'environment', 'collection', 'process.env']);
  });
});

describe('getRequestReferences', () => {
  const references = getRequestReferences(collection, request);

  it('collects references from every part of the request', () => {
    expect(references.get('tenant_id')).toEqual(['Params']);
    expect(references.get('api_token')).toEqual(['Headers']);
    expect(references.get('expected_status')).toEqual(['Assertions']);
    expect(references.get('page_size')).toEqual(['Pre Request Script']);
    expect(references.get('next_cursor')).toEqual(['Post Response Vars', 'Post Response Script']);
    expect(references.get('limit')).toEqual(['Pre Request Vars', 'Tests']);
  });

  it('skips disabled rows and prompt variables', () => {
    expect(references.has('disabled_param_var')).toBe(false);
    expect(references.has('disabled_var')).toBe(false);
    expect(references.has('?Ask me')).toBe(false);
  });
});

describe('getUsedSections', () => {
  const sections = getSidebarSections({ collection, item: request, globalEnvironments, activeGlobalEnvironmentUid: 'genv-1' });
  const used = getUsedSections({ collection, item: request, sections });

  it('puts undefined variables first', () => {
    expect(used[0].key).toBe('undefined');
    expect(names(used[0])).toEqual(['tenant_id', 'expected_status', 'page_size']);
  });

  it('places each used variable in the scope it resolves from', () => {
    expect(used.map((entry) => entry.key)).toEqual(['undefined', 'runtime', 'request', 'folder:folder-store', 'environment']);
    expect(names(sectionByKey(used, 'runtime'))).toEqual(['region']);
    expect(names(sectionByKey(used, 'request'))).toEqual(['limit', 'next_cursor']);
    expect(names(sectionByKey(used, 'environment'))).toEqual(['host', 'api_token']);
  });

  it('shows the resolved value of a variable that references another one', () => {
    expect(sectionByKey(used, 'folder:folder-store').rows[0]).toMatchObject({
      rawValue: '{{host}}/v2/store',
      value: 'https://prod/v2/store'
    });
  });

  it('skips dynamic variables', () => {
    expect(used.flatMap(names)).not.toContain('$randomUUID');
  });

  it('counts the rows across sections', () => {
    expect(countRows(used)).toBe(9);
  });
});
