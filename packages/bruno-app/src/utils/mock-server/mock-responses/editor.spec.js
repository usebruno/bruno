import { cloneDeep } from 'lodash';
import {
  buildMockResponseEditorItem,
  getMockResponseItemUid,
  hasUnsavedMockResponseChanges,
  mockResponseFromEditorItem,
  shouldRebuildMockResponseEditor
} from './editor';

describe('mock response editor utils', () => {
  const sampleMockResponse = {
    uid: 'response-1',
    name: 'Users list',
    description: 'Returns users',
    request: {
      url: '/users',
      method: 'GET',
      headers: [{ uid: 'h1', name: 'Accept', value: 'application/json', enabled: true }],
      params: [{ uid: 'p1', name: 'page', value: '1', enabled: true }],
      body: { mode: 'none' }
    },
    response: {
      status: 200,
      statusText: 'OK',
      headers: [],
      body: { type: 'json', content: '{"users":[]}' }
    },
    rules: {
      operator: 'AND',
      conditions: []
    },
    copiedFrom: {
      exampleName: 'Users',
      requestPathname: 'users.bru'
    }
  };

  it('builds an editor item with a draft example', () => {
    const item = buildMockResponseEditorItem(sampleMockResponse);

    expect(item.uid).toBe(getMockResponseItemUid('response-1'));
    expect(item.draft.examples).toHaveLength(1);
    expect(item.draft.examples[0].request.url).toBe('/users');
    expect(item.draft.examples[0].response.body.content).toBe('{"users":[]}');
  });

  it('converts an editor item back to a mock response', () => {
    const item = buildMockResponseEditorItem(sampleMockResponse);
    item.draft.examples[0].name = 'Updated name';
    item.draft.examples[0].response.status = 404;

    const mockResponse = mockResponseFromEditorItem(
      item,
      'response-1',
      { operator: 'OR', conditions: [{ target: 'query', key: 'id', operator: 'equals', value: '1' }] },
      sampleMockResponse
    );

    expect(mockResponse.name).toBe('Updated name');
    expect(mockResponse.response.status).toBe(404);
    expect(mockResponse.rules.operator).toBe('OR');
    expect(mockResponse.copiedFrom.exampleName).toBe('Users');
  });

  it('drops the rules table row ids so they never reach the saved mock response', () => {
    const item = buildMockResponseEditorItem(sampleMockResponse);

    const mockResponse = mockResponseFromEditorItem(
      item,
      'response-1',
      {
        operator: 'AND',
        conditions: [
          { uid: 'row-1', target: 'header', key: 'x-api-key', operator: 'equals', value: 'abc' },
          { uid: 'row-2', target: 'query', key: 'page', operator: 'contains', value: '2' }
        ]
      },
      sampleMockResponse
    );

    expect(mockResponse.rules.conditions).toEqual([
      { target: 'header', key: 'x-api-key', operator: 'equals', value: 'abc' },
      { target: 'query', key: 'page', operator: 'contains', value: '2' }
    ]);
  });

  const buildEditor = (savedMockResponse) => ({
    item: buildMockResponseEditorItem(savedMockResponse),
    savedMockResponse: cloneDeep(savedMockResponse),
    rules: cloneDeep(savedMockResponse.rules || { operator: 'AND', conditions: [] })
  });

  describe('hasUnsavedMockResponseChanges', () => {
    it.each([
      ['a full URL', { url: 'https://api.example.com/users' }],
      ['a lowercase method', { method: 'get' }],
      ['a query string', { url: '/users?page=1' }],
      ['a trailing slash', { url: '/users/' }],
      ['a template variable prefix', { url: '{{baseUrl}}/users' }]
    ])('reports no changes for a freshly opened response stored with %s', (_label, requestOverrides) => {
      const saved = { ...sampleMockResponse, request: { ...sampleMockResponse.request, ...requestOverrides } };

      expect(hasUnsavedMockResponseChanges(buildEditor(saved), 'response-1')).toBe(false);
    });

    it('reports changes once the draft is edited', () => {
      const editor = buildEditor(sampleMockResponse);
      editor.item.draft.examples[0].response.status = 404;

      expect(hasUnsavedMockResponseChanges(editor, 'response-1')).toBe(true);
    });
  });

  describe('shouldRebuildMockResponseEditor', () => {
    const updatedOnDisk = { ...sampleMockResponse, response: { ...sampleMockResponse.response, status: 500 } };

    it('rebuilds when there is no editor or it belongs to another response', () => {
      expect(shouldRebuildMockResponseEditor(undefined, sampleMockResponse)).toBe(true);
      expect(shouldRebuildMockResponseEditor(buildEditor({ ...sampleMockResponse, uid: 'other' }), sampleMockResponse)).toBe(true);
    });

    it('keeps an editor that matches the stored response', () => {
      expect(shouldRebuildMockResponseEditor(buildEditor(sampleMockResponse), sampleMockResponse)).toBe(false);
    });

    it('rebuilds a clean editor when the stored response changed', () => {
      expect(shouldRebuildMockResponseEditor(buildEditor(sampleMockResponse), updatedOnDisk)).toBe(true);
    });

    it('keeps an editor with unsaved changes when the stored response changed', () => {
      const editor = buildEditor(sampleMockResponse);
      editor.item.draft.examples[0].name = 'Edited name';

      expect(shouldRebuildMockResponseEditor(editor, updatedOnDisk)).toBe(false);
    });
  });
});
