import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { IconX } from '@tabler/icons';
import WarningBanner from 'ui/WarningBanner';
import CodeSnippet from 'components/CodeSnippet';
import { getWarningSourceGroups } from 'utils/source-context';
import { getTreePathFromCollectionToItem } from 'utils/collections';
import { addTab, focusTab, updateRequestPaneTab, updateScriptPaneTab } from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const ScriptWarningCard = ({ title, paths, item, collection, scriptPhase, onClose }) => {
  const dispatch = useDispatch();
  const groups = getWarningSourceGroups(paths, item, collection, scriptPhase, getTreePathFromCollectionToItem);

  const handleNavigate = useCallback((group) => {
    const settingsTab = scriptPhase === 'test' ? 'tests' : 'script';

    if (group.sourceType === 'collection') {
      dispatch(addTab({ uid: collection.uid, collectionUid: collection.uid, type: 'collection-settings' }));
      dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: settingsTab }));
    } else if (group.sourceType === 'folder') {
      dispatch(addTab({ uid: group.sourceUid, collectionUid: collection.uid, type: 'folder-settings' }));
      dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: group.sourceUid, tab: settingsTab }));
    } else if (group.sourceType === 'request') {
      dispatch(focusTab({ uid: item.uid }));
      if (scriptPhase === 'test') {
        dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'tests' }));
      } else {
        dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: item.uid, scriptPaneTab: scriptPhase }));
      }
    }
  }, [dispatch, collection, item, scriptPhase]);

  if (!groups) {
    const bullets = paths.map((p) => `  • ${p}`).join('\n');
    const message = `The following Postman APIs were not automatically converted during import and are not supported in Bruno:\n\n${bullets}\n\nYou may need to find an alternative approach for this functionality.`;
    return <WarningBanner warnings={[{ title, message }]} onClose={onClose} />;
  }

  return (
    <StyledWrapper>
      <div className="script-warning-card">
        <div className="script-warning-header">
          <div className="warning-title">{title}</div>
          {onClose && (
            <div className="close-button flex-shrink-0 cursor-pointer" onClick={onClose}>
              <IconX size={16} strokeWidth={1.5} />
            </div>
          )}
        </div>
        {groups.map((group, idx) => {
          const apiList = group.paths.join(', ');
          return (
            <div key={idx}>
              <div className="script-warning-source-label">
                <span>{group.label}</span>
                {group.filePath && (
                  <span
                    className="script-warning-file-path"
                    onClick={() => handleNavigate(group)}
                    title={`Open ${group.filePath}`}
                  >
                    {group.filePath}
                  </span>
                )}
              </div>
              <CodeSnippet hunks={group.hunks} variant="warning" />
              <div className="script-warning-summary">
                Unsupported Postman {group.paths.length === 1 ? 'API' : 'APIs'}: {apiList}
              </div>
            </div>
          );
        })}
      </div>
    </StyledWrapper>
  );
};

const ScriptWarning = ({ item, collection, showPreRequest, showPostResponse, showTest, onClosePreRequest, onClosePostResponse, onCloseTest }) => {
  const preRequestWarnings = item?.preRequestScriptWarnings;
  const postResponseWarnings = item?.postResponseScriptWarnings;
  const testWarnings = item?.testScriptWarnings;

  if (!preRequestWarnings?.length && !postResponseWarnings?.length && !testWarnings?.length) return null;

  return (
    <div className="mt-4 mb-2 flex flex-col gap-2">
      {showPreRequest && preRequestWarnings?.length > 0 && (
        <ScriptWarningCard
          title="Pre-Request Script Warning"
          paths={preRequestWarnings}
          item={item}
          collection={collection}
          scriptPhase="pre-request"
          onClose={onClosePreRequest}
        />
      )}
      {showPostResponse && postResponseWarnings?.length > 0 && (
        <ScriptWarningCard
          title="Post-Response Script Warning"
          paths={postResponseWarnings}
          item={item}
          collection={collection}
          scriptPhase="post-response"
          onClose={onClosePostResponse}
        />
      )}
      {showTest && testWarnings?.length > 0 && (
        <ScriptWarningCard
          title="Test Script Warning"
          paths={testWarnings}
          item={item}
          collection={collection}
          scriptPhase="test"
          onClose={onCloseTest}
        />
      )}
    </div>
  );
};

export default ScriptWarning;
