import path from 'path';
import { getResponsePaneErrors, formatResponseErrorForClipboard, getErrorSourceTabUid, extractErrorPreview } from './index';

jest.mock('platform', () => ({
  os: {
    family: process.platform === 'win32' ? 'Windows' : 'Linux'
  }
}));

const collectionPath = path.resolve('workspace', 'collection');

const collection = {
  uid: 'col-1',
  pathname: collectionPath,
  items: [
    {
      uid: 'folder-1',
      type: 'folder',
      name: 'users',
      pathname: path.join(collectionPath, 'users'),
      items: [
        { uid: 'req-1' },
        {
          uid: 'folder-2',
          type: 'folder',
          name: 'admin',
          pathname: path.join(collectionPath, 'users', 'admin'),
          items: []
        }
      ]
    },
    {
      uid: 'folder-3',
      type: 'folder',
      name: 'orders',
      pathname: path.join(collectionPath, 'orders'),
      items: [
        {
          uid: 'folder-4',
          type: 'folder',
          name: 'users',
          pathname: path.join(collectionPath, 'orders', 'users'),
          items: []
        }
      ]
    }
  ]
};

const errorContext = {
  errorType: 'ReferenceError',
  filePath: 'echo json.yml',
  errorLine: 4,
  lines: [
    { lineNumber: 3, content: 'const data = res.body;', isError: false },
    { lineNumber: 4, content: 'console.log(undefinedVar);', isError: true }
  ],
  stack: '    at echo json.yml:4:5'
};

const sourceOf = (filePath) =>
  getResponsePaneErrors({ preRequestScriptErrorMessage: 'token is not defined', preRequestScriptErrorContext: { ...errorContext, filePath } }, collection)[0].source;

describe('getResponsePaneErrors', () => {
  it('returns an empty list when the item has no script errors', () => {
    expect(getResponsePaneErrors({}, collection)).toEqual([]);
  });

  it('returns one entry per script that has an error message', () => {
    const errors = getResponsePaneErrors({
      preRequestScriptErrorMessage: 'pre error',
      preRequestScriptErrorContext: errorContext,
      testScriptErrorMessage: 'test error',
      testScriptErrorContext: { ...errorContext, errorType: 'TypeError' }
    }, collection);

    expect(errors.map((error) => [error.scriptType, error.errorType, error.message])).toEqual([
      ['pre-request', 'ReferenceError', 'pre error'],
      ['test', 'TypeError', 'test error']
    ]);
  });

  it('orders entries by execution order for HTTP and gRPC', () => {
    const http = getResponsePaneErrors({
      testScriptErrorMessage: 'c',
      postResponseScriptErrorMessage: 'b',
      preRequestScriptErrorMessage: 'a'
    }, collection);
    const grpc = getResponsePaneErrors({
      afterCallEndScriptErrorMessage: 'd',
      afterMessageReceiveScriptErrorMessage: 'c',
      beforeMessageSendScriptErrorMessage: 'b',
      beforeCallStartScriptErrorMessage: 'a'
    }, collection);

    expect(http.map((error) => error.label)).toEqual(['Pre-Request', 'Post-Response', 'Test']);
    expect(grpc.map((error) => error.label)).toEqual(['Before Call Start', 'Before Message Send', 'After Message Receive', 'After Call End']);
  });

  it('gives each entry its script title and row label', () => {
    const [error] = getResponsePaneErrors({ beforeMessageSendScriptErrorMessage: 'Before message send script failed' }, collection);

    expect(error.title).toBe('Before Message Send Script Error');
    expect(error.label).toBe('Before Message Send');
  });

  it('falls back to Error when a script error context has no type', () => {
    const [error] = getResponsePaneErrors({
      preRequestScriptErrorMessage: 'something went wrong',
      preRequestScriptErrorContext: { ...errorContext, errorType: undefined }
    }, collection);

    expect(error.errorType).toBe('Error');
  });

  it('keeps the message and nulls error type, file path, line, lines and stack when a script error has no context', () => {
    const [error] = getResponsePaneErrors({ postResponseScriptErrorMessage: 'Request failed with status code 401' }, collection);

    expect(error).toEqual({
      scriptType: 'post-response',
      title: 'Post-Response Script Error',
      label: 'Post-Response',
      message: 'Request failed with status code 401',
      source: null,
      errorType: null,
      filePath: null,
      line: null,
      lines: null,
      stack: null
    });
  });

  it('detects a collection-level source for collection.bru and opencollection.yml', () => {
    expect(sourceOf('collection.bru')).toEqual({ sourceType: 'collection', label: 'Collection' });
    expect(sourceOf('opencollection.yml')).toEqual({ sourceType: 'collection', label: 'Collection' });
  });

  it('detects a folder-level source for folder.bru and folder.yml and resolves the folder uid and name from its path', () => {
    expect(sourceOf('users/folder.bru')).toEqual({ sourceType: 'folder', label: 'Folder: users', sourceUid: 'folder-1' });
    expect(sourceOf('users/folder.yml')).toEqual({ sourceType: 'folder', label: 'Folder: users', sourceUid: 'folder-1' });
  });

  it('resolves a nested folder to itself rather than its parent', () => {
    expect(sourceOf('users/admin/folder.yml')).toEqual({ sourceType: 'folder', label: 'Folder: admin', sourceUid: 'folder-2' });
  });

  it('tells apart folders with the same name by their path', () => {
    expect(sourceOf('users/folder.yml')).toEqual({ sourceType: 'folder', label: 'Folder: users', sourceUid: 'folder-1' });
    expect(sourceOf('orders/users/folder.yml')).toEqual({ sourceType: 'folder', label: 'Folder: users', sourceUid: 'folder-4' });
  });

  it('resolves a Windows backslash path to the folder it names', () => {
    expect(sourceOf('users\\admin\\folder.yml')).toEqual({ sourceType: 'folder', label: 'Folder: admin', sourceUid: 'folder-2' });
  });

  it('falls back to a plain Folder label when the folder is not in the collection', () => {
    expect(sourceOf('subfolder/folder.yml')).toEqual({ sourceType: 'folder', label: 'Folder' });
  });

  it('falls back to a plain Folder label for a folder file at the collection root', () => {
    expect(sourceOf('folder.yml')).toEqual({ sourceType: 'folder', label: 'Folder' });
  });

  it('detects a request-level source from a request file path', () => {
    expect(sourceOf('my-request.yml')).toEqual({ sourceType: 'request', label: 'Request' });
  });

  it('treats a request whose name ends in folder as request-level', () => {
    expect(sourceOf('users/myfolder.yml')).toEqual({ sourceType: 'request', label: 'Request' });
  });

  it('shows a Windows backslash request path with forward slashes', () => {
    const [error] = getResponsePaneErrors({
      postResponseScriptErrorMessage: 'request error',
      postResponseScriptErrorContext: { ...errorContext, filePath: 'subfolder\\my-request.yml' }
    }, collection);

    expect(error.source).toEqual({ sourceType: 'request', label: 'Request' });
    expect(error.filePath).toBe('subfolder/my-request.yml');
  });
});

describe('formatResponseErrorForClipboard', () => {
  it('has the file and line, the typed message and the stack trace', () => {
    const [error] = getResponsePaneErrors({ preRequestScriptErrorMessage: 'undefinedVar is not defined', preRequestScriptErrorContext: errorContext }, collection);

    expect(formatResponseErrorForClipboard(error)).toBe(
      'File: echo json.yml:4\n\nReferenceError: undefinedVar is not defined\n\nStack trace:\n    at echo json.yml:4:5'
    );
  });

  it('leaves out what the entry lacks', () => {
    const [withoutLineOrStack] = getResponsePaneErrors({
      preRequestScriptErrorMessage: 'token is not defined',
      preRequestScriptErrorContext: { ...errorContext, errorLine: undefined, stack: undefined }
    }, collection);
    const [withoutFile] = getResponsePaneErrors({
      preRequestScriptErrorMessage: 'token is not defined',
      preRequestScriptErrorContext: { ...errorContext, filePath: undefined, stack: undefined }
    }, collection);
    const [withoutContext] = getResponsePaneErrors({ preRequestScriptErrorMessage: 'token is not defined' }, collection);

    expect(formatResponseErrorForClipboard(withoutLineOrStack)).toBe('File: echo json.yml\n\nReferenceError: token is not defined');
    expect(formatResponseErrorForClipboard(withoutFile)).toBe('ReferenceError: token is not defined');
    expect(formatResponseErrorForClipboard(withoutContext)).toBe('token is not defined');
  });
});

describe('getErrorSourceTabUid', () => {
  const item = { uid: 'req-1' };

  it('opens the collection settings for a collection-level script', () => {
    expect(getErrorSourceTabUid({ sourceType: 'collection' }, item, collection)).toBe(collection.uid);
  });

  it('opens the folder settings for a folder-level script it can resolve', () => {
    expect(getErrorSourceTabUid({ sourceType: 'folder', sourceUid: 'folder-1' }, item, collection)).toBe('folder-1');
  });

  it('opens the request for a request-level script', () => {
    expect(getErrorSourceTabUid({ sourceType: 'request' }, item, collection)).toBe('req-1');
  });

  it('has nowhere to open without a source, a resolved folder or a collection', () => {
    expect(getErrorSourceTabUid(null, item, collection)).toBeNull();
    expect(getErrorSourceTabUid({ sourceType: 'folder' }, item, collection)).toBeNull();
    expect(getErrorSourceTabUid({ sourceType: 'request' }, item, null)).toBeNull();
  });
});

describe('extractErrorPreview', () => {
  it('returns the first line of a multi-line message', () => {
    expect(extractErrorPreview({ message: 'Request failed\nat line 3' })).toBe('Request failed');
  });

  it('returns a single-line message unchanged', () => {
    expect(extractErrorPreview({ message: 'token is not defined' })).toBe('token is not defined');
  });

  it('turns a non-string message into text', () => {
    expect(extractErrorPreview({ message: 401 })).toBe('401');
  });
});
