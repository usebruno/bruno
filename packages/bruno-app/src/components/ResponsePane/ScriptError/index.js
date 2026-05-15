import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconX, IconChevronDown, IconChevronRight, IconExternalLink } from '@tabler/icons';
import ErrorBanner from 'ui/ErrorBanner';
import CodeSnippet from 'components/CodeSnippet';
import { getTreePathFromCollectionToItem } from 'utils/collections';
import { normalizePath } from 'utils/common/path';
import { addTab, updateRequestPaneTab, updateScriptPaneTab } from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

/**
 * Determines the source of a script error (request, folder, or collection)
 * based on the filePath from the error context.
 *
 * Bruno executes scripts at three levels in order: collection -> folder -> request.
 * When an error occurs, the filePath tells us which level it came from:
 *
 *   filePath: "echo json.bru"          -> request-level  -> { sourceType: 'request',    labelKey: 'REQUEST' }
 *   filePath: "auth/folder.bru"        -> folder-level   -> { sourceType: 'folder',     labelKey: 'FOLDER', folderName: 'auth', sourceUid: 'f1' }
 *   filePath: "collection.bru"         -> collection-level -> { sourceType: 'collection', labelKey: 'COLLECTION' }
 *
 * For folder-level errors, this function walks the tree path from collection to
 * the current item to match the folder by its relative path, resolving its UID
 * and display name. If the folder can't be matched (e.g. missing tree data),
 * it falls back to a generic "Folder" label without a sourceUid.
 *
 * @param {string|undefined} filePath - Relative path from errorContext (e.g. "subfolder/folder.bru")
 * @param {object} item - The current request item
 * @param {object} collection - The parent collection (needs .pathname for folder matching)
 * @param {function} getTreePath - Function to get the tree path from collection root to item
 * @returns {{ sourceType: string, labelKey: string, folderName?: string, sourceUid?: string } | null}
 */
const getErrorSourceInfo = (filePath, item, collection, getTreePath) => {
  if (!filePath) return null;

  // Normalize backslashes to forward slashes for cross-platform compatibility.
  // On Windows, path.relative() produces backslash separators, but the renderer
  // logic and regexes expect forward slashes.
  const normalizedPath = normalizePath(filePath);

  const isFolderFile = /(?:^|\/)folder\.(?:bru|yml)$/.test(normalizedPath);
  const isCollectionFile = normalizedPath === 'collection.bru' || /^opencollection\.yml$/.test(normalizedPath);

  // Folder level (check before collection to avoid folder.yml matching as collection)
  if (isFolderFile) {
    const info = { sourceType: 'folder', labelKey: 'FOLDER' };
    const folderFileName = normalizedPath.split('/').pop();

    // Try to find the folder UID and name from the tree path
    if (getTreePath && collection && item) {
      const collectionPathname = normalizePath(collection.pathname || '');
      const treePath = getTreePath(collection, item);
      if (treePath?.length) {
        for (const node of treePath) {
          if (node?.type === 'folder') {
            const nodePath = normalizePath(node.pathname || '');
            const folderRelPath = nodePath && nodePath.startsWith(collectionPathname)
              ? nodePath.slice(collectionPathname.length).replace(/^\//, '') + '/' + folderFileName
              : folderFileName;
            if (folderRelPath === normalizedPath) {
              info.sourceUid = node.uid;
              info.labelKey = 'FOLDER_WITH_NAME';
              info.folderName = node.name;
              break;
            }
          }
        }
      }
    }

    return info;
  }

  // Collection level
  if (isCollectionFile) {
    return { sourceType: 'collection', labelKey: 'COLLECTION' };
  }

  // Request level
  return { sourceType: 'request', labelKey: 'REQUEST' };
};

const ScriptErrorCard = ({ title, message, errorContext, item, collection, scriptPhase, onClose, t }) => {
  const dispatch = useDispatch();
  const [showStack, setShowStack] = useState(false);

  const displayFilePath = errorContext?.filePath ? normalizePath(errorContext.filePath) : null;

  const sourceInfo = getErrorSourceInfo(
    errorContext?.filePath,
    item,
    collection,
    getTreePathFromCollectionToItem
  );

  const getSourceLabel = () => {
    if (!sourceInfo) return null;
    if (sourceInfo.labelKey === 'FOLDER_WITH_NAME') {
      return t('RESPONSE_PANE.FOLDER_WITH_NAME', { name: sourceInfo.folderName });
    }
    return t(`RESPONSE_PANE.${sourceInfo.labelKey}`);
  };

  const canNavigate = sourceInfo
    && collection?.uid
    && (sourceInfo.sourceType === 'collection'
      || (sourceInfo.sourceType === 'folder' && sourceInfo.sourceUid)
      || (sourceInfo.sourceType === 'request' && item?.uid));

  const handleNavigateKeyDown = (e) => {
    if (!canNavigate) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate();
    }
  };

  const handleNavigate = () => {
    if (!canNavigate) return;

    // CollectionSettings expects 'tests', FolderSettings expects 'test'
    const collectionSettingsTab = scriptPhase === 'test' ? 'tests' : 'script';
    const folderSettingsTab = scriptPhase === 'test' ? 'test' : 'script';

    if (sourceInfo.sourceType === 'collection') {
      dispatch(addTab({ uid: collection.uid, collectionUid: collection.uid, type: 'collection-settings' }));
      dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: collectionSettingsTab }));
      if (collectionSettingsTab === 'script') {
        dispatch(updateScriptPaneTab({ uid: collection.uid, scriptPaneTab: scriptPhase }));
      }
    } else if (sourceInfo.sourceType === 'folder' && sourceInfo.sourceUid) {
      dispatch(addTab({ uid: sourceInfo.sourceUid, collectionUid: collection.uid, type: 'folder-settings' }));
      dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: sourceInfo.sourceUid, tab: folderSettingsTab }));
      if (folderSettingsTab === 'script') {
        dispatch(updateScriptPaneTab({ uid: sourceInfo.sourceUid, scriptPaneTab: scriptPhase }));
      }
    } else if (sourceInfo.sourceType === 'request') {
      dispatch(addTab({ uid: item.uid, collectionUid: collection.uid, type: 'request' }));
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
      <div className="script-error-card" data-testid="script-error-card">
        <div className="script-error-header">
          <div className="error-title" data-testid="script-error-title">{title}</div>
          {onClose && (
            <button className="close-button flex-shrink-0 cursor-pointer" data-testid="script-error-close" onClick={onClose} aria-label="Close error">
              <IconX size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
        {(sourceInfo || displayFilePath) && (
          <div className="script-error-source-label" data-testid="script-error-source-label">
            {sourceInfo && <span>{getSourceLabel()}</span>}
            {displayFilePath && (
              <span
                className={`script-error-file-path${canNavigate ? ' navigable' : ''}`}
                data-testid="script-error-file-path"
                role={canNavigate ? 'button' : undefined}
                tabIndex={canNavigate ? 0 : undefined}
                onClick={handleNavigate}
                onKeyDown={handleNavigateKeyDown}
                title={canNavigate ? t('RESPONSE_PANE.OPEN_FILE', { path: displayFilePath }) : undefined}
              >
                <span>{displayFilePath}</span>
                {canNavigate && <IconExternalLink size={12} className="flex-shrink-0" />}
              </span>
            )}
          </div>
        )}
        <CodeSnippet lines={errorContext.lines} variant="error" />
        <div className="script-error-message" data-testid="script-error-message">
          {errorContext.errorType || t('RESPONSE_PANE.ERROR')}: {message}
        </div>
        {errorContext.stack && (
          <div>
            <button
              className="script-error-stack-toggle"
              data-testid="script-error-stack-toggle"
              onClick={() => setShowStack(!showStack)}
              aria-expanded={showStack}
              aria-label={`${showStack ? t('RESPONSE_PANE.HIDE') : t('RESPONSE_PANE.SHOW')} ${t('RESPONSE_PANE.STACK_TRACE')}`}
            >
              {showStack ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
              <span>{showStack ? t('RESPONSE_PANE.HIDE') : t('RESPONSE_PANE.SHOW')} {t('RESPONSE_PANE.STACK_TRACE')}</span>
            </button>
            {showStack && (
              <pre className="script-error-stack" data-testid="script-error-stack">{errorContext.stack}</pre>
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
  const { t } = useTranslation();

  if (!preRequestError && !postResponseError && !testScriptError) return null;

  const preRequestContext = item?.preRequestScriptErrorContext;
  const postResponseContext = item?.postResponseScriptErrorContext;
  const testContext = item?.testScriptErrorContext;

  const hasAnyContext = preRequestContext || postResponseContext || testContext;

  // If no error context available for any error, fall back to ErrorBanner
  if (!hasAnyContext) {
    const errors = [];
    if (preRequestError) errors.push({ title: t('RESPONSE_PANE.PRE_REQUEST_SCRIPT_ERROR'), message: preRequestError });
    if (postResponseError) errors.push({ title: t('RESPONSE_PANE.POST_RESPONSE_SCRIPT_ERROR'), message: postResponseError });
    if (testScriptError) errors.push({ title: t('RESPONSE_PANE.TEST_SCRIPT_ERROR'), message: testScriptError });
    return <ErrorBanner errors={errors} onClose={onClose} className="mb-2" />;
  }

  return (
    <div className="mb-2 flex flex-col gap-2">
      {preRequestError && (
        <ScriptErrorCard
          title={t('RESPONSE_PANE.PRE_REQUEST_SCRIPT_ERROR')}
          message={preRequestError}
          errorContext={preRequestContext}
          item={item}
          collection={collection}
          scriptPhase="pre-request"
          onClose={onClose}
          t={t}
        />
      )}
      {postResponseError && (
        <ScriptErrorCard
          title={t('RESPONSE_PANE.POST_RESPONSE_SCRIPT_ERROR')}
          message={postResponseError}
          errorContext={postResponseContext}
          item={item}
          collection={collection}
          scriptPhase="post-response"
          onClose={onClose}
          t={t}
        />
      )}
      {testScriptError && (
        <ScriptErrorCard
          title={t('RESPONSE_PANE.TEST_SCRIPT_ERROR')}
          message={testScriptError}
          errorContext={testContext}
          item={item}
          collection={collection}
          scriptPhase="test"
          onClose={onClose}
          t={t}
        />
      )}
    </div>
  );
};

export default ScriptError;
