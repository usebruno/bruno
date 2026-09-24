import reducer, { collectionAddEnvFileEvent } from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ENV_UID = 'env-1';

const externalSecrets = {
  type: 'my-vault',
  variables: [
    { name: 'secret', value: 'secret/data/secret' },
    { name: 'password', value: 'secret/data/password' }
  ]
};

const makeEnvironment = (overrides = {}) => ({
  uid: ENV_UID,
  name: 'test_env',
  pathname: '/coll/environments/test_env.bru',
  variables: [
    { uid: 'var-1', name: 'env_str', value: 'env_string', type: 'text', enabled: true, secret: false },
    { uid: 'var-2', name: 'env_num', value: '300', type: 'text', dataType: 'number', enabled: true, secret: false },
    { uid: 'var-3', name: 'env_bool', value: 'true', type: 'text', dataType: 'boolean', enabled: true, secret: false },
    { uid: 'var-4', name: 'env_obj', value: '{"scope":"env"}', type: 'text', dataType: 'object', enabled: true, secret: false }
  ],
  color: null,
  ...overrides
});

const makeInitialState = (environments = []) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      items: [],
      environments
    }
  ],
  collectionSortOrder: 'default',
  activeWorkspaceUid: null
});

describe('collectionAddEnvFileEvent', () => {
  it('keeps externalSecrets when a new environment is added', () => {
    const state = makeInitialState();

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment({ externalSecrets }), collectionUid: COLLECTION_UID })
    );

    expect(nextState.collections[0].environments[0].externalSecrets).toEqual(externalSecrets);
  });

  it('keeps externalSecrets when an existing environment changes', () => {
    const state = makeInitialState([makeEnvironment()]);

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment({ externalSecrets }), collectionUid: COLLECTION_UID })
    );

    expect(nextState.collections[0].environments[0].externalSecrets).toEqual(externalSecrets);
  });

  it('keeps variable dataType when a new environment is added', () => {
    const state = makeInitialState();

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment(), collectionUid: COLLECTION_UID })
    );

    const variables = nextState.collections[0].environments[0].variables;
    expect(variables.find((v) => v.name === 'env_num')).toMatchObject({ value: '300', dataType: 'number' });
    expect(variables.find((v) => v.name === 'env_bool')).toMatchObject({ value: 'true', dataType: 'boolean' });
    expect(variables.find((v) => v.name === 'env_obj')).toMatchObject({ value: '{"scope":"env"}', dataType: 'object' });
    expect(variables.find((v) => v.name === 'env_str')).not.toHaveProperty('dataType');
  });

  it('keeps variable dataType when an existing environment changes', () => {
    const state = makeInitialState([makeEnvironment({ variables: [] })]);

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment(), collectionUid: COLLECTION_UID })
    );

    const variables = nextState.collections[0].environments[0].variables;
    expect(variables.find((v) => v.name === 'env_num')).toMatchObject({ value: '300', dataType: 'number' });
    expect(variables.find((v) => v.name === 'env_str')).not.toHaveProperty('dataType');
  });

  it('clears externalSecrets when the block is removed from the file', () => {
    const state = makeInitialState([makeEnvironment({ externalSecrets })]);

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment(), collectionUid: COLLECTION_UID })
    );

    expect(nextState.collections[0].environments[0].externalSecrets).toBeUndefined();
  });
});
