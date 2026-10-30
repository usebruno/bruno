import { saveMockResponse } from 'providers/ReduxStore/slices/mock-server/index';
import { syncMockResponseEditorSaved } from 'providers/ReduxStore/slices/collections';
import { updateTabMeta } from 'providers/ReduxStore/slices/tabs';
import { resolveMockResponseLocation, getMockResponseNameError, getMockResponseDescriptionError } from 'utils/mock-server/mock-responses';
import { findMockServerInstance } from 'utils/mock-server/mock-server-instances';
import { mockResponseFromEditorItem } from 'utils/mock-server/mock-responses/editor';

export const saveMockResponseEditor = (responseUid) => async (dispatch, getState) => {
  const state = getState();
  const editor = state.collections.mockResponseEditors[responseUid];
  if (!editor) {
    throw new Error('Mock response draft not found');
  }

  const instance = findMockServerInstance(state, editor.mockServerUid);
  if (!instance) {
    throw new Error('Mock server not found');
  }

  const mockResponse = mockResponseFromEditorItem(editor.item, responseUid, editor.rules, editor.savedMockResponse);
  const validationError = getMockResponseNameError(mockResponse.name)
    || getMockResponseDescriptionError(mockResponse.description);
  if (validationError) {
    throw new Error(validationError);
  }

  const { workspaces, activeWorkspaceUid } = state.workspaces;
  const activeWorkspace = workspaces.find((workspace) => workspace.uid === activeWorkspaceUid) || null;
  const result = await dispatch(saveMockResponse({
    ...resolveMockResponseLocation(instance, workspaces, activeWorkspace),
    response: mockResponse
  })).unwrap();

  dispatch(syncMockResponseEditorSaved({
    responseUid,
    mockResponse: result.response
  }));
  dispatch(updateTabMeta({
    uid: responseUid,
    tabName: result.response.name,
    responseName: result.response.name
  }));

  return result.response;
};
