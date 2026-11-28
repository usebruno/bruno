import collectionsReducer from './index';
import { updateVariableInScope } from './actions';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const numberVar = { uid: 'var-limit', name: 'limit', value: '20', enabled: true, dataType: 'number' };

const buildState = () => ({
  collections: [{
    uid: 'col-1',
    root: { request: { vars: { req: [numberVar] } } },
    items: [{
      uid: 'req-1',
      type: 'http-request',
      name: 'getUsers',
      request: { url: '', vars: { req: [numberVar] } }
    }],
    environments: []
  }]
});

const reduceDispatchedActions = async (scopeInfo, dataType) => {
  const state = buildState();
  const actions = [];
  const dispatch = jest.fn((action) => {
    if (typeof action === 'function') return Promise.resolve();
    actions.push(action);
    return action;
  });

  await updateVariableInScope('limit', '20', { ...scopeInfo, data: { ...scopeInfo.data, dataType } }, 'col-1')(dispatch, () => ({ collections: state }));
  return actions.reduce(collectionsReducer, state);
};

describe('updateVariableInScope data types', () => {
  it('switches a number request var to string', async () => {
    const state = await reduceDispatchedActions({ type: 'request', data: { item: { uid: 'req-1' }, variable: numberVar } }, 'string');
    expect(state.collections[0].items[0].draft.request.vars.req[0].dataType).toBeUndefined();
  });

  it('switches a number collection var to string', async () => {
    const state = await reduceDispatchedActions({ type: 'collection', data: { variable: numberVar } }, 'string');
    expect(state.collections[0].draft.root.request.vars.req[0].dataType).toBeUndefined();
  });

  it('keeps the stored type when no type is given', async () => {
    const state = await reduceDispatchedActions({ type: 'request', data: { item: { uid: 'req-1' }, variable: numberVar } }, undefined);
    expect(state.collections[0].items[0].draft.request.vars.req[0].dataType).toBe('number');
  });
});
