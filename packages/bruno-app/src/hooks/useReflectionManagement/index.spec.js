import { renderHook, act } from '@testing-library/react';

let mockDispatch;
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  loadGrpcMethodsFromReflection: jest.fn((item, uid, url) => ({
    type: 'MOCK/loadGrpcMethodsFromReflection',
    item,
    uid,
    url
  }))
}));

const { loadGrpcMethodsFromReflection } = require('providers/ReduxStore/slices/collections/actions');
const useReflectionManagement = require('./index').default;

const CACHE_KEY = 'bruno.grpc.reflectionCache';

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

describe('useReflectionManagement', () => {
  beforeEach(() => {
    mockDispatch = jest.fn();
    localStorage.clear();
  });

  it('dispatches the interpolated URL, not the raw template', async () => {
    const item = makeItem('{{host}}');
    const collection = makeCollection({
      activeEnvUid: 'env-a',
      envs: [envWithHost('env-a', 'grpc://server-a:9000')]
    });
    mockDispatch.mockResolvedValue({ methods: [{ path: '/A/M' }], error: null });

    const { result } = renderHook(() => useReflectionManagement(item, collection));

    await act(async () => {
      await result.current.loadMethodsFromReflection('{{host}}');
    });

    expect(loadGrpcMethodsFromReflection).toHaveBeenCalledTimes(1);
    expect(loadGrpcMethodsFromReflection).toHaveBeenCalledWith(item, 'coll-1', 'grpc://server-a:9000');
  });

  it('keeps the same raw URL in separate cache slots per environment', async () => {
    const item = makeItem('{{host}}');
    const envs = [
      envWithHost('env-a', 'grpc://server-a:9000'),
      envWithHost('env-b', 'grpc://server-b:9000')
    ];

    let collection = makeCollection({ activeEnvUid: 'env-a', envs });
    mockDispatch.mockResolvedValue({ methods: [{ path: '/A/Only' }], error: null });
    const { result, rerender } = renderHook(({ coll }) => useReflectionManagement(item, coll), {
      initialProps: { coll: collection }
    });
    await act(async () => {
      await result.current.loadMethodsFromReflection('{{host}}');
    });

    collection = makeCollection({ activeEnvUid: 'env-b', envs });
    mockDispatch.mockResolvedValue({ methods: [{ path: '/B/Only' }], error: null });
    rerender({ coll: collection });
    let envBResult;
    await act(async () => {
      envBResult = await result.current.loadMethodsFromReflection('{{host}}');
    });

    expect(loadGrpcMethodsFromReflection).toHaveBeenNthCalledWith(1, item, 'coll-1', 'grpc://server-a:9000');
    expect(loadGrpcMethodsFromReflection).toHaveBeenNthCalledWith(2, item, 'coll-1', 'grpc://server-b:9000');
    expect(envBResult.fromCache).toBe(false);
    expect(envBResult.methods).toEqual([{ path: '/B/Only' }]);

    const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(cache['grpc://server-a:9000']).toEqual([{ path: '/A/Only' }]);
    expect(cache['grpc://server-b:9000']).toEqual([{ path: '/B/Only' }]);
  });

  it('serves the cached result on the second call for the same env (no re-dispatch)', async () => {
    const item = makeItem('{{host}}');
    const collection = makeCollection({
      activeEnvUid: 'env-a',
      envs: [envWithHost('env-a', 'grpc://server-a:9000')]
    });
    mockDispatch.mockResolvedValue({ methods: [{ path: '/A/M' }], error: null });

    const { result } = renderHook(() => useReflectionManagement(item, collection));

    await act(async () => {
      await result.current.loadMethodsFromReflection('{{host}}');
    });

    let second;
    await act(async () => {
      second = await result.current.loadMethodsFromReflection('{{host}}');
    });

    expect(loadGrpcMethodsFromReflection).toHaveBeenCalledTimes(1);
    expect(second.fromCache).toBe(true);
    expect(second.methods).toEqual([{ path: '/A/M' }]);
  });

  it('bypasses the cache when isManualRefresh is true', async () => {
    const item = makeItem('{{host}}');
    const collection = makeCollection({
      activeEnvUid: 'env-a',
      envs: [envWithHost('env-a', 'grpc://server-a:9000')]
    });
    mockDispatch.mockResolvedValue({ methods: [{ path: '/A/M' }], error: null });

    const { result } = renderHook(() => useReflectionManagement(item, collection));

    await act(async () => {
      await result.current.loadMethodsFromReflection('{{host}}');
    });

    let refreshed;
    await act(async () => {
      refreshed = await result.current.loadMethodsFromReflection('{{host}}', true);
    });

    expect(loadGrpcMethodsFromReflection).toHaveBeenCalledTimes(2);
    expect(loadGrpcMethodsFromReflection).toHaveBeenNthCalledWith(2, item, 'coll-1', 'grpc://server-a:9000');
    expect(refreshed.fromCache).toBe(false);
  });

  it('keys on the un-interpolated string when a variable is missing from scope', async () => {
    const item = makeItem('{{host}}');
    const collection = makeCollection({ activeEnvUid: null, envs: [] });
    mockDispatch.mockResolvedValue({ methods: [], error: null });

    const { result } = renderHook(() => useReflectionManagement(item, collection));

    await act(async () => {
      await result.current.loadMethodsFromReflection('{{host}}');
    });

    expect(loadGrpcMethodsFromReflection).toHaveBeenCalledWith(item, 'coll-1', '{{host}}');
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    expect(Object.keys(cache)).toEqual(['{{host}}']);
  });
});
