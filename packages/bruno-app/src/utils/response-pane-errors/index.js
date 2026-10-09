import camelCase from 'lodash/camelCase';
import { SCRIPT_TYPES } from '@usebruno/common';
import { findItemInCollectionByPathname } from 'utils/collections';
import path, { normalizePath } from 'utils/common/path';

const toScriptErrorFields = (scriptType, label) => {
  const keyPrefix = camelCase(scriptType);
  return { scriptType, label, messageKey: `${keyPrefix}ScriptErrorMessage`, contextKey: `${keyPrefix}ScriptErrorContext` };
};

// scriptType matches the CodeEditor scriptType so the error stack navigates back to the right editor.
const SCRIPT_ERROR_FIELDS = [
  toScriptErrorFields(SCRIPT_TYPES.PRE_REQUEST, 'Pre-Request'),
  toScriptErrorFields(SCRIPT_TYPES.POST_RESPONSE, 'Post-Response'),
  toScriptErrorFields(SCRIPT_TYPES.TEST, 'Test'),
  toScriptErrorFields(SCRIPT_TYPES.BEFORE_CALL_START, 'Before Call Start'),
  toScriptErrorFields(SCRIPT_TYPES.BEFORE_MESSAGE_SEND, 'Before Message Send'),
  toScriptErrorFields(SCRIPT_TYPES.AFTER_MESSAGE_RECEIVE, 'After Message Receive'),
  toScriptErrorFields(SCRIPT_TYPES.AFTER_CALL_END, 'After Call End')
];

const collectionFileNames = ['collection.bru', 'opencollection.yml'];

// Matches a folder.bru or folder.yml at any depth: 'folder.yml', 'users/folder.bru', but not 'myfolder.bru'
const folderYmlOrBruPattern = /(?:^|\/)folder\.(?:bru|yml)$/;

export const getErrorSourceInfo = (filePath, collection) => {
  if (!filePath) return null;

  if (collectionFileNames.includes(filePath)) {
    return { sourceType: 'collection', label: 'Collection' };
  }

  if (!folderYmlOrBruPattern.test(filePath)) {
    return { sourceType: 'request', label: 'Request' };
  }

  // Located the way collectionAddFileEvent locates the folder a folder.bru or folder.yml belongs to
  const folder = findItemInCollectionByPathname(collection, path.dirname(path.join(collection.pathname, filePath)));

  if (!folder) {
    return { sourceType: 'folder', label: 'Folder' };
  }

  return { sourceType: 'folder', label: `Folder: ${folder.name}`, sourceUid: folder.uid };
};

export const getErrorSourceTabUid = (source, item, collection) => {
  if (!source || !collection?.uid) return null;
  if (source.sourceType === 'collection') return collection.uid;
  if (source.sourceType === 'folder') return source.sourceUid || null;
  if (source.sourceType === 'request') return item.uid || null;
  return null;
};

const toResponsePaneError = (item, collection, { scriptType, label, messageKey, contextKey }) => {
  const message = item[messageKey];
  const errorContext = item[contextKey];
  const entry = { scriptType, title: `${label} Script Error`, label, message };

  if (!errorContext) {
    return { ...entry, source: null, errorType: null, filePath: null, line: null, lines: null, stack: null };
  }

  const filePath = errorContext.filePath ? normalizePath(errorContext.filePath) : null;

  return {
    ...entry,
    source: getErrorSourceInfo(filePath, collection),
    errorType: errorContext.errorType || 'Error',
    filePath,
    line: typeof errorContext.errorLine === 'number' ? errorContext.errorLine : null,
    lines: errorContext.lines || null,
    stack: errorContext.stack || null
  };
};

export const getResponsePaneErrors = (item, collection) => SCRIPT_ERROR_FIELDS
  .filter(({ messageKey }) => Boolean(item[messageKey]))
  .map((fields) => toResponsePaneError(item, collection, fields));

export const extractErrorPreview = (error) => String(error.message).split('\n')[0];

export const formatResponseErrorMessage = ({ errorType, message }) => (errorType ? `${errorType}: ${message}` : message);

export const formatResponseErrorForClipboard = (error) => {
  const lineSuffix = typeof error.line === 'number' ? `:${error.line}` : '';

  return [
    error.filePath && `File: ${error.filePath}${lineSuffix}`,
    formatResponseErrorMessage(error),
    error.stack && `Stack trace:\n${error.stack}`
  ]
    .filter(Boolean)
    .join('\n\n');
};
