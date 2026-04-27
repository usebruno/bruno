import { collectionsSlice } from './index';

describe('collectionsSlice - responseCleared reducer', () => {
  const collectionUid = 'collection-1';
  const itemUid = 'item-1';

  const createTestItem = (overrides = {}) => ({
    uid: itemUid,
    name: 'Test Request',
    type: 'http-request',
    response: {
      status: 200,
      data: 'response data'
    },
    assertionResults: [{ name: 'assertion-1', status: 'pass' }],
    preRequestTestResults: [{ name: 'pretest-1', status: 'pass' }],
    postResponseTestResults: [{ name: 'posttest-1', status: 'pass' }],
    testResults: [{ name: 'test-1', status: 'pass' }],
    ...overrides
  });

  const createTestState = (items = [createTestItem()]) => ({
    collections: [
      {
        uid: collectionUid,
        name: 'Test Collection',
        items
      }
    ]
  });

  // Core behavior
  it('should clear response and all test result fields when stream is not running', () => {
    const initialState = createTestState();

    const action = {
      type: collectionsSlice.actions.responseCleared.type,
      payload: { collectionUid, itemUid }
    };

    const newState = collectionsSlice.reducer(initialState, action);
    const item = newState.collections[0].items[0];

    expect(item.response).toBeNull();
    expect(item.assertionResults).toEqual([]);
    expect(item.preRequestTestResults).toEqual([]);
    expect(item.postResponseTestResults).toEqual([]);
    expect(item.testResults).toEqual([]);
  });

  // Streaming behavior
  it('should only clear data and size when stream is running', () => {
    const streamingItem = createTestItem({
      response: {
        data: 'streaming data',
        size: 100,
        stream: { running: true }
      }
    });

    const state = createTestState([streamingItem]);

    const action = {
      type: collectionsSlice.actions.responseCleared.type,
      payload: { collectionUid, itemUid }
    };

    const newState = collectionsSlice.reducer(state, action);
    const item = newState.collections[0].items[0];

    expect(item.response.data).toBe('');
    expect(item.response.size).toBe(0);
    expect(item.response).not.toBeNull();
  });

  // Isolation behavior
  it('should clear only the targeted item and leave others unchanged', () => {
    const item1 = createTestItem({ uid: 'item-1' });

    const item2 = createTestItem({
      uid: 'item-2',
      response: { status: 404, data: 'response 2' }
    });

    const state = createTestState([item1, item2]);

    const action = {
      type: collectionsSlice.actions.responseCleared.type,
      payload: { collectionUid, itemUid: 'item-1' }
    };

    const newState = collectionsSlice.reducer(state, action);

    // affected item
    expect(newState.collections[0].items[0].response).toBeNull();
    expect(newState.collections[0].items[0].assertionResults).toEqual([]);

    // unaffected item
    expect(newState.collections[0].items[1].response).toEqual({
      status: 404,
      data: 'response 2'
    });
    expect(newState.collections[0].items[1].assertionResults).toEqual([
      { name: 'assertion-1', status: 'pass' }
    ]);
  });
});
