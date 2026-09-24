import reducer, { setActiveTab, setSelectedRequest, clearSelectedRequest } from './logs';

const mockRequest = { itemUid: 'item-1', timestamp: 1000, data: {} };

describe('setActiveTab', () => {
  it('preserves selectedRequest when switching away from network tab', () => {
    const stateWithRequest = reducer(undefined, setSelectedRequest(mockRequest));
    expect(stateWithRequest.selectedRequest).toEqual(mockRequest);

    const stateAfterSwitch = reducer(stateWithRequest, setActiveTab('console'));
    expect(stateAfterSwitch.selectedRequest).toEqual(mockRequest);
  });

  it('preserves selectedRequest when switching back to network tab', () => {
    let state = reducer(undefined, setSelectedRequest(mockRequest));
    state = reducer(state, setActiveTab('console'));
    state = reducer(state, setActiveTab('network'));
    expect(state.selectedRequest).toEqual(mockRequest);
  });

  it('clears selectedRequest only when explicitly dispatching clearSelectedRequest', () => {
    let state = reducer(undefined, setSelectedRequest(mockRequest));
    state = reducer(state, clearSelectedRequest());
    expect(state.selectedRequest).toBeNull();
  });
});
