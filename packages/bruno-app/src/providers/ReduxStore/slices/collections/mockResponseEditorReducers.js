import { cloneDeep } from 'lodash';
import { buildMockResponseEditorItem } from 'utils/mock-server/mock-responses/editor';

export const initMockResponseEditor = (state, action) => {
  const { mockResponse, mockServerUid } = action.payload;
  const responseUid = mockResponse.uid;

  state.mockResponseEditors[responseUid] = {
    item: buildMockResponseEditorItem(mockResponse),
    savedMockResponse: cloneDeep(mockResponse),
    rules: cloneDeep(mockResponse.rules || { operator: 'AND', conditions: [] }),
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

  editor.rules = cloneDeep(rules);
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
