import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react';
import collectionsReducer, { updateCollectionRequestScript, updateCollectionProtobuf } from 'providers/ReduxStore/slices/collections';
import useProtoFileManagement from './index';

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('utils/network/index', () => ({
  loadGrpcMethodsFromProtoFile: jest.fn()
}));

const COLLECTION_UID = 'col-1';
const COLLECTION_PATH = '/tmp/collection-1';
const SCRIPT = 'bru.setVar("x", 1);';
const EXISTING_PROTO = { path: 'protos/existing.proto', type: 'file', exists: true };
const EXISTING_IMPORT_PATH = { path: 'protos', enabled: true, exists: true };

const createStore = () => configureStore({
  reducer: { collections: collectionsReducer },
  preloadedState: {
    collections: {
      collections: [{
        uid: COLLECTION_UID,
        pathname: COLLECTION_PATH,
        format: 'yml',
        root: { request: { script: { req: '', res: '' } } },
        brunoConfig: {
          protobuf: { protoFiles: [EXISTING_PROTO], importPaths: [EXISTING_IMPORT_PATH] }
        },
        items: []
      }]
    }
  }
});

const getCollection = (store) => store.getState().collections.collections[0];

const renderProtoHook = (store) => renderHook(() => useProtoFileManagement(getCollection(store)), {
  wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
});

let writtenProtobuf;
let writeError;

beforeEach(() => {
  writtenProtobuf = null;
  writeError = null;
  window.ipcRenderer = {
    invoke: jest.fn(async (channel, brunoConfig) => {
      if (channel === 'renderer:update-bruno-config') {
        if (writeError) throw writeError;
        writtenProtobuf = brunoConfig.protobuf;
      }
    })
  };
});

describe('useProtoFileManagement — persisting protobuf config from a request', () => {
  it('keeps the draft and the written file in sync when the collection has a draft', async () => {
    const store = createStore();
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_UID, script: SCRIPT }));
    const { result } = renderProtoHook(store);

    await act(async () => {
      await result.current.addProtoFileFromRequest(`${COLLECTION_PATH}/protos/new.proto`);
    });

    const { draft } = getCollection(store);
    expect(writtenProtobuf.protoFiles).toEqual([EXISTING_PROTO, { path: 'protos/new.proto', type: 'file' }]);
    expect(draft.brunoConfig.protobuf).toEqual(writtenProtobuf);
    expect(draft.root.request.script.req).toBe(SCRIPT);
  });

  it('keeps the draft and the written file in sync when an import path is toggled from a request', async () => {
    const store = createStore();
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_UID, script: SCRIPT }));
    const { result } = renderProtoHook(store);

    await act(async () => {
      await result.current.toggleImportPathFromRequest(0);
    });

    expect(writtenProtobuf.importPaths).toEqual([{ ...EXISTING_IMPORT_PATH, enabled: false }]);
    expect(getCollection(store).draft.brunoConfig.protobuf).toEqual(writtenProtobuf);
  });

  it('writes to disk without creating a draft when the collection has no unsaved changes', async () => {
    const store = createStore();
    const { result } = renderProtoHook(store);

    await act(async () => {
      await result.current.addProtoFileFromRequest(`${COLLECTION_PATH}/protos/new.proto`);
    });

    expect(writtenProtobuf.protoFiles).toEqual([EXISTING_PROTO, { path: 'protos/new.proto', type: 'file' }]);
    expect(getCollection(store).draft).toBeUndefined();
  });

  it('preserves a file added from the settings tab draft and does not duplicate it on consecutive adds', async () => {
    const store = createStore();
    const settingsTabProto = { path: 'protos/from-settings.proto', type: 'file' };
    store.dispatch(updateCollectionProtobuf({
      collectionUid: COLLECTION_UID,
      protobuf: { protoFiles: [EXISTING_PROTO, settingsTabProto], importPaths: [EXISTING_IMPORT_PATH] }
    }));
    const { result, rerender } = renderProtoHook(store);

    await act(async () => {
      await result.current.addProtoFileFromRequest(`${COLLECTION_PATH}/protos/first.proto`);
    });
    rerender();
    await act(async () => {
      await result.current.addProtoFileFromRequest(`${COLLECTION_PATH}/protos/second.proto`);
    });
    rerender();
    let outcome;
    await act(async () => {
      outcome = await result.current.addProtoFileFromRequest(`${COLLECTION_PATH}/protos/first.proto`);
    });

    const expectedProtoFiles = [
      EXISTING_PROTO,
      settingsTabProto,
      { path: 'protos/first.proto', type: 'file' },
      { path: 'protos/second.proto', type: 'file' }
    ];
    expect(outcome).toEqual({ success: true, relativePath: 'protos/first.proto', alreadyExists: true });
    expect(writtenProtobuf.protoFiles).toEqual(expectedProtoFiles);
    expect(getCollection(store).draft.brunoConfig.protobuf.protoFiles).toEqual(expectedProtoFiles);
  });

  it('leaves the draft untouched when the disk write fails', async () => {
    const store = createStore();
    store.dispatch(updateCollectionRequestScript({ collectionUid: COLLECTION_UID, script: SCRIPT }));
    const { result } = renderProtoHook(store);
    writeError = new Error('disk full');

    let outcome;
    await act(async () => {
      outcome = await result.current.addProtoFileFromRequest(`${COLLECTION_PATH}/protos/new.proto`);
    });

    expect(outcome).toEqual({ success: false, error: writeError });
    expect(writtenProtobuf).toBeNull();
    const { draft } = getCollection(store);
    expect(draft.brunoConfig).toBeUndefined();
    expect(draft.root.request.script.req).toBe(SCRIPT);
  });
});
