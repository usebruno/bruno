import { configureStore } from '@reduxjs/toolkit';
import { sseMiddleware } from './middleware';
import { getSseStorageKey } from 'utils/response/sse';

jest.mock('../../slices/collections', () => ({
  appSetRuntimeVariable: (payload) => ({ type: 'save-variable', payload })
}));
jest.mock('utils/collections', () => ({
  findCollectionByUid: (collections, uid) => collections.find((collection) => collection.uid === uid),
  findItemInCollection: (collection, uid) => collection.items.find((item) => item.uid === uid)
}));

const item = { uid: 'request', pathname: '/demo/chat.bru', type: 'http-request', response: {
  stream: { running: true },
  data: [{ type: 'incoming', message: 'data: {"text":"你好"}\n\ndata: {"text":"世界"}\n\n' }]
} };
const collection = { uid: 'collection', pathname: '/demo', items: [item], runtimeVariables: { existing: 'keep' } };
const options = { mode: 'custom', saveVariables: true, rules: [{ name: 'answer', path: '$.text', merge: 'append' }] };

const makeStore = (overrides = {}) => configureStore({
  reducer: (state = { collections: { collections: [collection] }, saved: {} }, action) => {
    if (action.type === 'save-variable') return { ...state, saved: { ...state.saved, [action.payload.key]: action.payload.value } };
    if (action.type === 'collections/requestCancelled') {
      return { ...state, collections: { collections: state.collections.collections.map((current) => ({
        ...current,
        items: current.items.map((request) => ({ ...request, response: { ...request.response, stream: { running: false } } }))
      })) } };
    }
    return state;
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sseMiddleware),
  preloadedState: { collections: { collections: [{ ...collection, ...overrides }] }, saved: {} }
});

beforeEach(() => localStorage.clear());

it('saves merged values on completion without mounting a response view', () => {
  localStorage.setItem(getSseStorageKey(item, collection), JSON.stringify(options));
  const store = makeStore();
  store.dispatch({ type: 'collections/requestCancelled', payload: { collectionUid: 'collection', itemUid: 'request' } });
  expect(store.getState().saved).toEqual({ answer: '你好世界' });
});

it.each([
  { ...options, saveVariables: false },
  { ...options, rules: [{ name: 'answer', path: '$[' }] },
  { ...options, mode: 'auto' }
])('does not save disabled or invalid extraction settings', (settings) => {
  localStorage.setItem(getSseStorageKey(item, collection), JSON.stringify(settings));
  const store = makeStore();
  store.dispatch({ type: 'collections/requestCancelled', payload: { collectionUid: 'collection', itemUid: 'request' } });
  expect(store.getState().saved).toEqual({});
});
