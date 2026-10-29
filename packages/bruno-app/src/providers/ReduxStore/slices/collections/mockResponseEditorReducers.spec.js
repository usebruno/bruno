import reducer, {
  initMockResponseEditor,
  cancelMockResponseEditorEdit,
  setMockResponseEditMode,
  updateResponseExampleName
} from 'providers/ReduxStore/slices/collections';
import { closeTabs, closeAllCollectionTabs } from 'providers/ReduxStore/slices/tabs';
import { getMockResponseItemUid, hasUnsavedMockResponseChanges } from 'utils/mock-server/mock-responses/editor';

const makeMockResponse = (uid) => ({
  uid,
  name: 'create user admin',
  description: '',
  request: {
    url: '/users',
    method: 'POST',
    headers: [],
    params: [],
    body: { mode: 'none' }
  },
  response: {
    status: 201,
    statusText: 'Created',
    headers: [],
    body: { type: 'json', content: '{"role":"admin"}' }
  },
  rules: {
    operator: 'AND',
    conditions: [{ target: 'body', key: 'role', operator: 'equals', value: 'admin' }]
  }
});

const initEditors = (...uids) => uids.reduce(
  (state, uid) => reducer(state, initMockResponseEditor({ mockResponse: makeMockResponse(uid), mockServerUid: 'server-1' })),
  reducer(undefined, { type: '@@INIT' })
);

const renameResponse = (state, uid, name) => reducer(state, updateResponseExampleName({
  itemUid: getMockResponseItemUid(uid),
  exampleUid: uid,
  name
}));

describe('mock response editor reducers', () => {
  it('reports no unsaved changes for a freshly opened editor', () => {
    const state = initEditors('response-1');

    expect(hasUnsavedMockResponseChanges(state.mockResponseEditors['response-1'], 'response-1')).toBe(false);
  });

  it('reports unsaved changes after an edit and none after cancel', () => {
    const edited = renameResponse(initEditors('response-1'), 'response-1', 'create user adminnnnn');

    expect(hasUnsavedMockResponseChanges(edited.mockResponseEditors['response-1'], 'response-1')).toBe(true);

    const cancelled = reducer(edited, cancelMockResponseEditorEdit({ responseUid: 'response-1' }));

    expect(hasUnsavedMockResponseChanges(cancelled.mockResponseEditors['response-1'], 'response-1')).toBe(false);
  });

  it('starts in view mode and keeps edit mode without any unsaved changes', () => {
    const opened = initEditors('response-1');

    expect(opened.mockResponseEditors['response-1'].editMode).toBe(false);

    const editing = reducer(opened, setMockResponseEditMode({ responseUid: 'response-1', editMode: true }));

    expect(editing.mockResponseEditors['response-1'].editMode).toBe(true);
    expect(hasUnsavedMockResponseChanges(editing.mockResponseEditors['response-1'], 'response-1')).toBe(false);
  });

  it('keeps edit mode when the editor is rebuilt from the stored response', () => {
    const editing = reducer(initEditors('response-1'), setMockResponseEditMode({ responseUid: 'response-1', editMode: true }));

    const rebuilt = reducer(editing, initMockResponseEditor({ mockResponse: makeMockResponse('response-1'), mockServerUid: 'server-1' }));

    expect(rebuilt.mockResponseEditors['response-1'].editMode).toBe(true);
  });

  it('leaves edit mode on cancel', () => {
    const editing = reducer(initEditors('response-1'), setMockResponseEditMode({ responseUid: 'response-1', editMode: true }));

    const cancelled = reducer(editing, cancelMockResponseEditorEdit({ responseUid: 'response-1' }));

    expect(cancelled.mockResponseEditors['response-1'].editMode).toBe(false);
  });

  it('removes only the editors whose tabs are closed', () => {
    const edited = renameResponse(initEditors('response-1', 'response-2'), 'response-2', 'renamed');

    const state = reducer(edited, closeTabs({ tabUids: ['response-1', 'unrelated-tab'] }));

    expect(state.mockResponseEditors['response-1']).toBeUndefined();
    expect(state.mockResponseEditors['response-2']).toBeDefined();
    expect(hasUnsavedMockResponseChanges(state.mockResponseEditors['response-2'], 'response-2')).toBe(true);
  });

  it('removes only the editors belonging to a closed collection', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    const withEditors = ['response-1', 'response-2', 'response-3'].reduce((state, uid, index) => reducer(state, initMockResponseEditor({
      mockResponse: makeMockResponse(uid),
      mockServerUid: 'server-1',
      collectionUid: index === 2 ? 'collection-b' : 'collection-a'
    })), initial);

    const state = reducer(withEditors, closeAllCollectionTabs({ collectionUid: 'collection-a' }));

    expect(state.mockResponseEditors['response-1']).toBeUndefined();
    expect(state.mockResponseEditors['response-2']).toBeUndefined();
    expect(state.mockResponseEditors['response-3']).toBeDefined();
  });
});
