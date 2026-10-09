import { useDispatch } from 'react-redux';
import { addTab, updateRequestPaneTab, updateScriptPaneTab, setFocusErrorLine } from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { getErrorSourceTabUid } from 'utils/response-pane-errors';

const useOpenErrorSource = (error, item, collection) => {
  const dispatch = useDispatch();
  const { scriptType, source, line } = error;
  const tabUid = getErrorSourceTabUid(source, item, collection);
  const isTestScript = scriptType === 'test';

  const showScriptAtErrorLine = () => {
    if (!isTestScript) {
      dispatch(updateScriptPaneTab({ uid: tabUid, scriptPaneTab: scriptType }));
    }
    if (typeof line === 'number') {
      dispatch(setFocusErrorLine({ uid: tabUid, scriptPhase: scriptType, line, requestedAt: Date.now() }));
    }
  };

  // Collection settings call the tests tab 'tests', folder settings call it 'test'.
  const openSourceBySourceType = {
    collection: () => {
      dispatch(addTab({ uid: tabUid, collectionUid: collection.uid, type: 'collection-settings' }));
      dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: isTestScript ? 'tests' : 'script' }));
      showScriptAtErrorLine();
    },
    folder: () => {
      dispatch(addTab({ uid: tabUid, collectionUid: collection.uid, type: 'folder-settings' }));
      dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: tabUid, tab: isTestScript ? 'test' : 'script' }));
      showScriptAtErrorLine();
    },
    request: () => {
      dispatch(addTab({ uid: tabUid, collectionUid: collection.uid, type: 'request' }));
      dispatch(updateRequestPaneTab({ uid: tabUid, requestPaneTab: isTestScript ? 'tests' : 'script' }));
      showScriptAtErrorLine();
    }
  };

  return { canOpenSource: Boolean(tabUid), openSource: () => openSourceBySourceType[source.sourceType]() };
};

export default useOpenErrorSource;
