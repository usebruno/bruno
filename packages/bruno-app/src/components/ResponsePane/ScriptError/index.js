import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconX, IconChevronDown, IconChevronRight } from '@tabler/icons';
import ErrorBanner from 'ui/ErrorBanner';
import CodeSnippet from 'components/CodeSnippet';
import { getTreePathFromCollectionToItem } from 'utils/collections';
import { addTab, focusTab, updateRequestPaneTab, updateScriptPaneTab } from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

/**
 * Classify the error source from errorContext.filePath.
 * Returns { sourceType, label, sourceUid? } or null if filePath is missing.
 */
const getErrorSourceInfo = (filePath, item, collection, getTreePath) => {
  if (!filePath) return null;

  // Collection level
  if (filePath === 'collection.bru' || /\.ya?ml$/.test(filePath)) {
    return { sourceType: 'collection', label: 'Collection Script' };
  }

  // Folder level
  if (filePath === 'folder.bru' || filePath.endsWith('/folder.bru')) {
    const info = { sourceType: 'folder', label: 'Folder Script' };

    // Try to find the folder UID and name from the tree path
    if (getTreePath && collection && item) {
      const collectionPathname = collection.pathname || '';
      const treePath = getTreePath(collection, item);
      if (treePath?.length) {
        for (const node of treePath) {
          if (node?.type === 'folder') {
            const folderRelPath = node.pathname
              ? (node.pathname.startsWith(collectionPathname)
                  ? node.pathname.slice(collectionPathname.length).replace(/^\//, '') + '/folder.bru'
                  : 'folder.bru')
              : 'folder.bru';
            if (folderRelPath === filePath) {
              info.sourceUid = node.uid;
              info.label = `Folder: ${node.name}`;
              break;
            }
          }
        }
      }
    }

    return info;
  }

  // Request level
  return { sourceType: 'request', label: 'Request Script' };
};

const ScriptErrorCard = ({ title, message, errorContext, item, collection, scriptPhase, onClose }) => {
  const dispatch = useDispatch();
  const [showStack, setShowStack] = useState(false);

  const sourceInfo = getErrorSourceInfo(
    errorContext?.filePath,
    item,
    collection,
    getTreePathFromCollectionToItem
  );

  const handleNavigate = () => {
    if (!sourceInfo) return;

    const settingsTab = scriptPhase === 'test' ? 'tests' : 'script';

    if (sourceInfo.sourceType === 'collection') {
      dispatch(addTab({ uid: collection.uid, collectionUid: collection.uid, type: 'collection-settings' }));
      dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: settingsTab }));
      if (settingsTab === 'script') {
        dispatch(updateScriptPaneTab({ uid: collection.uid, scriptPaneTab: scriptPhase }));
      }
    } else if (sourceInfo.sourceType === 'folder') {
      dispatch(addTab({ uid: sourceInfo.sourceUid, collectionUid: collection.uid, type: 'folder-settings' }));
      dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: sourceInfo.sourceUid, tab: settingsTab }));
      if (settingsTab === 'script') {
        dispatch(updateScriptPaneTab({ uid: sourceInfo.sourceUid, scriptPaneTab: scriptPhase }));
      }
    } else if (sourceInfo.sourceType === 'request') {
      dispatch(focusTab({ uid: item.uid }));
      if (scriptPhase === 'test') {
        dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'tests' }));
      } else {
        dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: item.uid, scriptPaneTab: scriptPhase }));
      }
    }
  };

  if (!errorContext) {
    return <ErrorBanner errors={[{ title, message }]} onClose={onClose} />;
  }

  return (
    <StyledWrapper>
      <div className="script-error-card">
        <div className="script-error-header">
          <div className="error-title">{title}</div>
          {onClose && (
            <div className="close-button flex-shrink-0 cursor-pointer" onClick={onClose}>
              <IconX size={16} strokeWidth={1.5} />
            </div>
          )}
        </div>
        {(sourceInfo || errorContext.filePath) && (
          <div className="script-error-source-label">
            {sourceInfo && <span>{sourceInfo.label}</span>}
            {errorContext.filePath && (
              <span
                className="script-error-file-path"
                onClick={sourceInfo ? handleNavigate : undefined}
                title={sourceInfo ? `Open ${errorContext.filePath}` : undefined}
              >
                {errorContext.filePath}
              </span>
            )}
          </div>
        )}
        <CodeSnippet lines={errorContext.lines} variant="error" />
        <div className="script-error-message">
          {errorContext.errorType}: {message}
        </div>
        {errorContext.stack && (
          <div>
            <div
              className="script-error-stack-toggle"
              onClick={() => setShowStack(!showStack)}
            >
              {showStack ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
              <span>{showStack ? 'Hide' : 'Show'} stack trace</span>
            </div>
            {showStack && (
              <pre className="script-error-stack">{errorContext.stack}</pre>
            )}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

const ScriptError = ({ item, collection, onClose }) => {
  const preRequestError = item?.preRequestScriptErrorMessage;
  const postResponseError = item?.postResponseScriptErrorMessage;
  const testScriptError = item?.testScriptErrorMessage;

  if (!preRequestError && !postResponseError && !testScriptError) return null;

  const preRequestContext = item?.preRequestScriptErrorContext;
  const postResponseContext = item?.postResponseScriptErrorContext;
  const testContext = item?.testScriptErrorContext;

  const hasAnyContext = preRequestContext || postResponseContext || testContext;

  // If no error context available for any error, fall back to ErrorBanner
  if (!hasAnyContext) {
    const errors = [];
    if (preRequestError) errors.push({ title: 'Pre-Request Script Error', message: preRequestError });
    if (postResponseError) errors.push({ title: 'Post-Response Script Error', message: postResponseError });
    if (testScriptError) errors.push({ title: 'Test Script Error', message: testScriptError });
    return <ErrorBanner errors={errors} onClose={onClose} className="mt-4 mb-2" />;
  }

  return (
    <div className="mt-4 mb-2 flex flex-col gap-2">
      {preRequestError && (
        <ScriptErrorCard
          title="Pre-Request Script Error"
          message={preRequestError}
          errorContext={preRequestContext}
          item={item}
          collection={collection}
          scriptPhase="pre-request"
          onClose={onClose}
        />
      )}
      {postResponseError && (
        <ScriptErrorCard
          title="Post-Response Script Error"
          message={postResponseError}
          errorContext={postResponseContext}
          item={item}
          collection={collection}
          scriptPhase="post-response"
          onClose={onClose}
        />
      )}
      {testScriptError && (
        <ScriptErrorCard
          title="Test Script Error"
          message={testScriptError}
          errorContext={testContext}
          item={item}
          collection={collection}
          scriptPhase="test"
          onClose={onClose}
        />
      )}
    </div>
  );
};

export default ScriptError;
