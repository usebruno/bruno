import camelCase from 'lodash/camelCase';
import { SCRIPT_TYPES } from '@usebruno/common';
import { findItemInCollectionByPathname } from 'utils/collections';
import path, { normalizePath } from 'utils/common/path';

export const getErrorSourceTabUid = (source, item, collection) => {
  if (!source || !collection?.uid) return null;

  if (source.sourceType === 'collection') return collection.uid;
  if (source.sourceType === 'folder') return source.sourceUid || null;
  if (source.sourceType === 'request') return item.uid || null;

  return null;
};

const collectionFileNames = ['collection.bru', 'opencollection.yml'];

// Matches a folder.bru or folder.yml at any depth: 'folder.yml', 'users/folder.bru', but not 'myfolder.bru'
const folderYmlOrBruPattern = /(?:^|\/)folder\.(?:bru|yml)$/;

const getErrorSourceInfo = (filePath, collection) => {
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

const SCRIPT_ERROR_LABELS = {
  [SCRIPT_TYPES.PRE_REQUEST]: 'Pre-Request',
  [SCRIPT_TYPES.POST_RESPONSE]: 'Post-Response',
  [SCRIPT_TYPES.TEST]: 'Test',
  [SCRIPT_TYPES.BEFORE_CALL_START]: 'Before Call Start',
  [SCRIPT_TYPES.BEFORE_MESSAGE_SEND]: 'Before Message Send',
  [SCRIPT_TYPES.AFTER_MESSAGE_RECEIVE]: 'After Message Receive',
  [SCRIPT_TYPES.AFTER_CALL_END]: 'After Call End'
};

export const ERROR_DETAILS_HEADINGS = {
  script: 'Stack trace'
};

const getScriptErrors = (item, collection) => Object.entries(SCRIPT_ERROR_LABELS)
  .map(([scriptType, label]) => {
    const keyPrefix = camelCase(scriptType);
    const message = item[`${keyPrefix}ScriptErrorMessage`];
    if (!message) return null;

    const errorContext = item[`${keyPrefix}ScriptErrorContext`];
    const entry = { id: scriptType, kind: 'script', scriptType, title: `${label} Script Error`, label, message, preview: message.split(/\r?\n/, 1)[0] };

    if (!errorContext) {
      return { ...entry, source: null, errorType: null, filePath: null, line: null, location: null, lines: null, details: null, displayMessage: message, clipboardText: message };
    }

    const filePath = errorContext.filePath ? normalizePath(errorContext.filePath) : null;
    const line = typeof errorContext.errorLine === 'number' ? errorContext.errorLine : null;
    const location = line === null ? filePath : `${filePath}:${line}`;
    const errorType = errorContext.errorType || 'Error';
    const details = errorContext.stack || null;
    const displayMessage = `${errorType}: ${message}`;

    return {
      ...entry,
      source: getErrorSourceInfo(filePath, collection),
      errorType,
      filePath,
      line,
      location,
      lines: errorContext.lines || null,
      details,
      displayMessage,
      get clipboardText() {
        return [
          filePath && `File: ${location}`,
          displayMessage,
          details && `${ERROR_DETAILS_HEADINGS.script}:\n${details}`
        ]
          .filter(Boolean)
          .join('\n\n');
      }
    };
  })
  .filter(Boolean);

const ERROR_GETTERS = [getScriptErrors];
export const getResponsePaneErrors = (item, collection) => ERROR_GETTERS.flatMap((getErrors) => getErrors(item, collection));
