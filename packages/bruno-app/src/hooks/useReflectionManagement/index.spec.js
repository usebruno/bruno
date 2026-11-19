import { renderHook, act } from '@testing-library/react';

let mockDispatch;
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  loadGrpcMethodsFromReflection: jest.fn((item, uid, url, isManualRefresh) => ({
    type: 'MOCK/loadGrpcMethodsFromReflection',
    item,
    uid,
    url,
    isManualRefresh
  }))
}));

const { loadGrpcMethodsFromReflection } = require('providers/ReduxStore/slices/collections/actions');
const useReflectionManagement = require('./index').default;

const makeItem = (url) => ({
  uid: 'item-1',
  type: 'grpc-request',
  request: {
    url,
    method: '',
    methodType: '',
    params: [],
    headers: [],
    body: { mode: 'grpc', grpc: [] },
    vars: { req: [], res: [] }
  }
});

const makeCollection = ({ activeEnvUid, envs = [] } = {}) => ({
  uid: 'coll-1',
  activeEnvironmentUid: activeEnvUid,
  environments: envs,
  items: [makeItem('{{host}}')],
  globalEnvironmentVariables: {},
  processEnvVariables: {},
  runtimeVariables: {},
  promptVariables: {},
  workspaceProcessEnvVariables: {},
  globalEnvSecrets: []
});

const envWithHost = (uid, hostValue) => ({
  uid,
  name: uid,
  variables: [{ name: 'host', value: hostValue, enabled: true }]
});

const renderWithEnv = (hostValue) => {
  const item = makeItem('{{host}}');
  const collection = makeCollection({
    activeEnvUid: 'env-a',
    envs: [envWithHost('env-a', hostValue)]
  });
  return renderHook(() => useReflectionManagement(item, collection));
};

describe('useReflectionManagement', () => {
  beforeEach(() => {
    mockDispatch = jest.fn().mockResolvedValue({ methods: [{ path: '/A/M' }], error: null, fromCache: false });
    loadGrpcMethodsFromReflection.mockClear();
  });

  it('dispatches the interpolated URL, not the raw template', async () => {
    const { result } = renderWithEnv('grpc://server-a:9000');

    await act(async () => {
      await result.current.loadMethodsFromReflection('{{host}}');
    });

    expect(loadGrpcMethodsFromReflection).toHaveBeenCalledTimes(1);
    expect(loadGrpcMethodsFromReflection).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'item-1' }),
      'coll-1',
      'grpc://server-a:9000',
      false
    );
  });

  it('keys on the un-interpolated string when a variable is missing from scope', async () => {
    const item = makeItem('{{host}}');
    const collection = makeCollection({ activeEnvUid: null, envs: [] });
    const { result } = renderHook(() => useReflectionManagement(item, collection));

    await act(async () => {
      await result.current.loadMethodsFromReflection('{{host}}');
    });

    expect(loadGrpcMethodsFromReflection).toHaveBeenCalledWith(item, 'coll-1', '{{host}}', false);
  });

  it('asks for a fresh reflection when this is a manual refresh', async () => {
    const { result } = renderWithEnv('grpc://server-a:9000');

    await act(async () => {
      await result.current.loadMethodsFromReflection('{{host}}', true);
    });

    expect(loadGrpcMethodsFromReflection).toHaveBeenCalledWith(
      expect.anything(),
      'coll-1',
      'grpc://server-a:9000',
      true
    );
  });

  it('reports whether the methods came from what was already stored', async () => {
    mockDispatch.mockResolvedValue({ methods: [{ path: '/A/M' }], error: null, fromCache: true });
    const { result } = renderWithEnv('grpc://server-a:9000');

    let outcome;
    await act(async () => {
      outcome = await result.current.loadMethodsFromReflection('{{host}}');
    });

    expect(outcome).toEqual({ methods: [{ path: '/A/M' }], error: null, fromCache: true });
  });

  it('refuses a non-string url instead of handing it to the main process', async () => {
    const { result } = renderWithEnv('grpc://server-a:9000');

    let outcome;
    await act(async () => {
      outcome = await result.current.loadMethodsFromReflection({ methods: [{ path: '/A/M' }], error: null });
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(outcome.methods).toEqual([]);
    expect(outcome.error).toBeInstanceOf(Error);
  });

  it('turns the error string the main process returns into an Error', async () => {
    mockDispatch.mockResolvedValue({ methods: [], error: '14 UNAVAILABLE: No connection established' });
    const { result } = renderWithEnv('grpc://server-a:9000');

    let outcome;
    await act(async () => {
      outcome = await result.current.loadMethodsFromReflection('{{host}}');
    });

    expect(outcome.error).toBeInstanceOf(Error);
    expect(outcome.error.message).toBe('14 UNAVAILABLE: No connection established');
  });
});
