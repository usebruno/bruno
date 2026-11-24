import { act, renderHook } from '@testing-library/react';
import useEndpointActions from './useEndpointActions';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const collection = { uid: 'pets', pathname: '/collections/pets' };
const createPet = { id: 'POST:/pets', method: 'POST', path: '/pets', pathname: '/collections/pets/Create pet.bru' };
const listPets = { id: 'GET:/pets', method: 'GET', path: '/pets', pathname: '/collections/pets/List pets.bru' };
const collectionDrift = { modified: [createPet, listPets], missing: [], localOnly: [] };

const renderActions = () => renderHook(() => useEndpointActions(collection, collectionDrift, jest.fn().mockResolvedValue(undefined)));

const confirm = async (result) => {
  await act(async () => {
    await result.current.confirmPendingAction();
  });
};

describe('useEndpointActions', () => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue({ success: true }) };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('says that Reset keeps the values and resets the endpoint without a full reset', async () => {
    const { result } = renderActions();

    act(() => result.current.handleResetEndpoint(createPet));
    expect(result.current.pendingAction.message).toBe('Reset "POST /pets" to the spec? Fields you added are removed and fields you deleted come back. Your values are kept.');
    await confirm(result);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:reset-endpoints-to-spec', { collectionPath: '/collections/pets', endpoints: [createPet] });
  });

  it('says that Reset All keeps the values and resets every modified endpoint without a full reset', async () => {
    const { result } = renderActions();

    act(() => result.current.handleResetAllModified());
    expect(result.current.pendingAction.message).toBe('Reset 2 modified endpoint(s) to the spec? Fields you added are removed and fields you deleted come back. Your values are kept.');
    await confirm(result);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:reset-endpoints-to-spec', { collectionPath: '/collections/pets', endpoints: [createPet, listPets] });
  });

  it('warns that Revert All to Spec replaces the values, and resets the modified endpoints fully', async () => {
    const { result } = renderActions();

    act(() => result.current.handleRevertAllChanges());
    expect(result.current.pendingAction.message).toContain('Your values (tokens, {{env}} references, credentials) will be replaced with the spec\'s.');
    await confirm(result);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:reset-endpoints-to-spec', { collectionPath: '/collections/pets', endpoints: [createPet, listPets], fullReset: true });
  });
});
