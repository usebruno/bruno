import { cloneDeep } from 'lodash';
import {
  buildMockResponseEditorItem,
  getMockResponseItemUid
} from 'utils/mock-server/mock-responses/editor';

const buildEditorCollection = (collection, mockServerUid, responseUid) => {
  if (collection?.uid) {
    return {
      uid: collection.uid,
      pathname: collection.pathname || null,
      name: collection.name || 'Collection',
      activeEnvironmentUid: collection.activeEnvironmentUid || null,
      environments: collection.environments || [],
      globalEnvironmentVariables: collection.globalEnvironmentVariables || {},
      globalEnvSecrets: collection.globalEnvSecrets || [],
      workspaceProcessEnvVariables: collection.workspaceProcessEnvVariables || {},
      root: collection.root,
      draft: collection.draft,
      runtimeVariables: collection.runtimeVariables || {},
      processEnvVariables: collection.processEnvVariables || {},
      promptVariables: collection.promptVariables || {},
      oauth2Credentials: collection.oauth2Credentials
    };
  }

  return {
    uid: `mock-server-collection-${mockServerUid || responseUid}`,
    pathname: null,
    name: 'Mock Server'
  };
};

export const initMockResponseEditor = (state, action) => {
  const { mockResponse, collection, mockServerUid } = action.payload;
  const responseUid = mockResponse.uid;

  state.mockResponseEditors[responseUid] = {
    item: buildMockResponseEditorItem(mockResponse),
    savedMockResponse: cloneDeep(mockResponse),
    rules: cloneDeep(mockResponse.rules || { operator: 'AND', conditions: [] }),
    collection: buildEditorCollection(collection, mockServerUid, responseUid),
    mockServerUid: mockServerUid || null
  };
};

export const syncMockResponseEditorSaved = (state, action) => {
  const { responseUid, mockResponse } = action.payload;
  const editor = state.mockResponseEditors[responseUid];

  if (!editor) {
    return;
  }

  editor.savedMockResponse = cloneDeep(mockResponse);
  editor.item = buildMockResponseEditorItem(mockResponse);
  editor.rules = cloneDeep(mockResponse.rules || { operator: 'AND', conditions: [] });
};

export const updateMockResponseRules = (state, action) => {
  const { responseUid, rules } = action.payload;
  const editor = state.mockResponseEditors[responseUid];

  if (!editor) {
    return;
  }

  editor.rules = rules;
};

export const cancelMockResponseEditorEdit = (state, action) => {
  const { responseUid } = action.payload;
  const editor = state.mockResponseEditors[responseUid];

  if (!editor?.savedMockResponse) {
    return;
  }

  editor.item = buildMockResponseEditorItem(editor.savedMockResponse);
  editor.rules = cloneDeep(editor.savedMockResponse.rules || { operator: 'AND', conditions: [] });
};

export const removeMockResponseEditor = (state, action) => {
  delete state.mockResponseEditors[action.payload.responseUid];
};

export const getMockResponseEditorItemUid = (responseUid) => getMockResponseItemUid(responseUid);
