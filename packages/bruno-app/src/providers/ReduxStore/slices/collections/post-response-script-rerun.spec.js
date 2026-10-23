import reducer, { setPostResponseScriptRunning, runRequestEvent } from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';

const makeState = () => ({
  collections: [
    {
      uid: COLLECTION_UID,
      items: [
        {
          uid: 'item-a',
          type: 'http-request',
          requestUid: 'run-a',
          response: { status: 200, data: { from: 'a' } },
          postResponseScriptErrorMessage: 'old error',
          postResponseScriptErrorContext: { line: 1 },
          postResponseTestResults: [{ status: 'pass', description: 'old' }]
        },
        {
          uid: 'item-b',
          type: 'http-request',
          requestUid: 'run-b',
          response: { status: 201, data: { from: 'b' } },
          postResponseScriptErrorMessage: 'b error',
          postResponseTestResults: [{ status: 'fail', description: 'b' }]
        }
      ]
    }
  ]
});

describe('setPostResponseScriptRunning', () => {
  it('clears only that item\'s previous post-response outcome when a re-run starts', () => {
    const next = reducer(makeState(), setPostResponseScriptRunning({ itemUid: 'item-a', collectionUid: COLLECTION_UID, running: true }));
    const [a, b] = next.collections[0].items;

    expect(a.postResponseScriptRunning).toBe(true);
    expect(a.postResponseScriptErrorMessage).toBeNull();
    expect(a.postResponseScriptErrorContext).toBeNull();
    expect(a.postResponseTestResults).toEqual([]);
    expect(b.postResponseScriptErrorMessage).toBe('b error');
    expect(b.postResponseTestResults).toHaveLength(1);
  });

  it('keeps the response and the latest outcome when the re-run ends', () => {
    let state = reducer(makeState(), setPostResponseScriptRunning({ itemUid: 'item-a', collectionUid: COLLECTION_UID, running: true }));
    state = reducer(state, runRequestEvent({
      type: 'post-response-script-execution',
      itemUid: 'item-a',
      collectionUid: COLLECTION_UID,
      requestUid: 'run-a',
      errorMessage: 'boom',
      errorContext: null
    }));
    state = reducer(state, setPostResponseScriptRunning({ itemUid: 'item-a', collectionUid: COLLECTION_UID, running: false }));

    const a = state.collections[0].items[0];
    expect(a.postResponseScriptRunning).toBe(false);
    expect(a.postResponseScriptErrorMessage).toBe('boom');
    expect(a.response).toEqual({ status: 200, data: { from: 'a' } });
  });
});
