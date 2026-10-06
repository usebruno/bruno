import reducer, {
  initRunRequestEvent,
  runRequestEvent,
  responseCleared,
  dismissUnresolvedVariables
} from 'providers/ReduxStore/slices/collections';
import { hasRequestChanges } from 'utils/collections';

const COLLECTION_UID = 'col-1';
const ITEM_UID = 'item-1';

const makeState = (item = {}) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      items: [
        {
          uid: ITEM_UID,
          type: 'http-request',
          requestUid: 'run-1',
          ...item
        }
      ]
    }
  ]
});

describe('unresolved variables reducers', () => {
  it('sets the names from an unresolved-variables run event', () => {
    const next = reducer(makeState(), runRequestEvent({
      type: 'unresolved-variables',
      unresolvedVariables: ['host', 'token'],
      itemUid: ITEM_UID,
      collectionUid: COLLECTION_UID,
      requestUid: 'run-1'
    }));

    expect(next.collections[0].items[0].unresolvedVariables).toEqual(['host', 'token']);
  });

  it('clears the names when a new run starts', () => {
    const state = makeState({ unresolvedVariables: ['host'] });

    const next = reducer(state, initRunRequestEvent({ requestUid: 'run-2', itemUid: ITEM_UID, collectionUid: COLLECTION_UID }));

    expect(next.collections[0].items[0].unresolvedVariables).toBeNull();
  });

  it('clears the names when the response is cleared', () => {
    const state = makeState({ response: { status: 200 }, unresolvedVariables: ['host'] });

    const next = reducer(state, responseCleared({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID }));

    expect(next.collections[0].items[0].unresolvedVariables).toBeNull();
  });

  it('clears the names when the info card is dismissed', () => {
    const state = makeState({ unresolvedVariables: ['host'] });

    const next = reducer(state, dismissUnresolvedVariables({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID }));

    expect(next.collections[0].items[0].unresolvedVariables).toBeNull();
  });

  it('does not mark the request as unsaved when the info card is dismissed', () => {
    const state = makeState({ unresolvedVariables: ['host'] });
    state.collections[0].items[0].draft = { ...state.collections[0].items[0] };

    const next = reducer(state, dismissUnresolvedVariables({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID }));

    expect(hasRequestChanges(next.collections[0].items[0])).toBe(false);
  });
});
