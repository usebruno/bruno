import { renderHook } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import { newHttpRequest, newGrpcRequest, newWsRequest } from 'providers/ReduxStore/slices/collections/actions';
import { PRESET_REQUEST_TYPES as REQUEST_TYPE } from 'utils/common/constants';
import useCreateTransientRequest from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  newHttpRequest: jest.fn((payload) => ({ type: 'http', payload })),
  newGrpcRequest: jest.fn((payload) => ({ type: 'grpc', payload })),
  newWsRequest: jest.fn((payload) => ({ type: 'ws', payload }))
}));

jest.mock('utils/collections', () => ({
  generateTransientRequestName: () => 'Untitled 1'
}));

const COLLECTION = { uid: 'scratch', items: [], brunoConfig: { presets: { requestType: 'http', requestUrl: 'https://api.test' } } };

describe('useCreateTransientRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDispatch.mockReturnValue(jest.fn(() => Promise.resolve()));
    useSelector.mockImplementation((selector) => selector({ collections: { collections: [COLLECTION] } }));
  });

  const create = (type) => {
    const { result } = renderHook(() => useCreateTransientRequest('scratch'));
    result.current.createRequest(type);
  };

  it('creates an unsaved GET http request with the collection preset URL', () => {
    create(REQUEST_TYPE.HTTP);
    expect(newHttpRequest).toHaveBeenCalledWith(expect.objectContaining({
      requestType: 'http-request', requestMethod: 'GET', requestUrl: 'https://api.test', collectionUid: 'scratch', isTransient: true
    }));
  });

  it('creates a POST graphql request with an empty graphql body', () => {
    create(REQUEST_TYPE.GRAPHQL);
    expect(newHttpRequest).toHaveBeenCalledWith(expect.objectContaining({
      requestType: 'graphql-request', requestMethod: 'POST', body: { mode: 'graphql', graphql: { query: '', variables: '' } }
    }));
  });

  it('creates grpc and websocket requests through their own actions', () => {
    create(REQUEST_TYPE.GRPC);
    create(REQUEST_TYPE.WS);
    expect(newGrpcRequest).toHaveBeenCalledWith(expect.objectContaining({ collectionUid: 'scratch', isTransient: true }));
    expect(newWsRequest).toHaveBeenCalledWith(expect.objectContaining({ requestMethod: 'ws', isTransient: true }));
  });

  it('does nothing when the collection is not loaded', () => {
    useSelector.mockImplementation((selector) => selector({ collections: { collections: [] } }));
    create(REQUEST_TYPE.HTTP);
    expect(newHttpRequest).not.toHaveBeenCalled();
  });
});
