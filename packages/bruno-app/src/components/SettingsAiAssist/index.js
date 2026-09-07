import React, { useMemo } from 'react';
import find from 'lodash/find';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import AIAssist from 'components/AIAssist';
import {
  buildAiVariablesPayload,
  buildDocsContextFromCollection,
  buildDocsContextFromFolder
} from 'utils/ai';
import {
  updateCollectionTests,
  updateCollectionRequestScript,
  updateCollectionResponseScript,
  updateCollectionDocs,
  updateFolderTests,
  updateFolderRequestScript,
  updateFolderResponseScript,
  updateFolderDocs
} from 'providers/ReduxStore/slices/collections';
import { getActiveScriptTab } from 'utils/tabs';

const getCollectionValue = (collection, path) =>
  (collection.draft?.root ? get(collection, `draft.root.${path}`, '') : get(collection, `root.${path}`, ''));

const getFolderValue = (folder, path) => (folder.draft ? get(folder, `draft.${path}`, '') : get(folder, `root.${path}`, ''));

const resolveTarget = (activeTab) => {
  if (activeTab === 'script') return 'script';
  if (activeTab === 'tests' || activeTab === 'test') return 'tests';
  if (activeTab === 'docs' || activeTab === 'overview') return 'docs';
  return null;
};

const SettingsAiAssist = ({ collection, folder = null, activeTab }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isFolder = Boolean(folder);

  const docsEditing = find(tabs, (tab) => tab.uid === activeTabUid)?.docsEditing || false;

  const variables = useMemo(() => buildAiVariablesPayload(collection, folder), [collection, folder]);

  const scriptPaneTab = useMemo(() => {
    if (isFolder) {
      const focusedTab
        = find(tabs, (tab) => tab.type === 'folder-settings' && (tab.uid === folder.uid || tab.folderUid === folder.uid))
          || find(tabs, (tab) => tab.type === 'folder-settings' && tab.pathname === folder.pathname);
      return focusedTab?.scriptPaneTab;
    }
    return find(tabs, (tab) => tab.uid === collection.uid)?.scriptPaneTab;
  }, [tabs, isFolder, folder, collection.uid]);

  const config = useMemo(() => {
    const target = resolveTarget(activeTab);
    if (!target) return null;

    if (target === 'tests') {
      return {
        scriptType: 'tests',
        currentScript: isFolder ? getFolderValue(folder, 'request.tests') : getCollectionValue(collection, 'request.tests'),
        onApply: (value) =>
          dispatch(
            isFolder
              ? updateFolderTests({ tests: value, collectionUid: collection.uid, folderUid: folder.uid })
              : updateCollectionTests({ tests: value, collectionUid: collection.uid })
          )
      };
    }

    if (target === 'docs') {
      if (!docsEditing) return null;
      return {
        scriptType: 'docs',
        currentScript: isFolder ? getFolderValue(folder, 'docs') : getCollectionValue(collection, 'docs'),
        docsContext: isFolder ? buildDocsContextFromFolder(collection, folder) : buildDocsContextFromCollection(collection),
        onApply: (value) =>
          dispatch(
            isFolder
              ? updateFolderDocs({ folderUid: folder.uid, collectionUid: collection.uid, docs: value })
              : updateCollectionDocs({ collectionUid: collection.uid, docs: value })
          )
      };
    }

    const requestScript = isFolder
      ? getFolderValue(folder, 'request.script.req')
      : getCollectionValue(collection, 'request.script.req');
    const responseScript = isFolder
      ? getFolderValue(folder, 'request.script.res')
      : getCollectionValue(collection, 'request.script.res');

    if (getActiveScriptTab(scriptPaneTab, requestScript) === 'pre-request') {
      return {
        scriptType: 'pre-request',
        currentScript: requestScript,
        onApply: (value) =>
          dispatch(
            isFolder
              ? updateFolderRequestScript({ script: value, collectionUid: collection.uid, folderUid: folder.uid })
              : updateCollectionRequestScript({ script: value, collectionUid: collection.uid })
          )
      };
    }

    return {
      scriptType: 'post-response',
      currentScript: responseScript,
      onApply: (value) =>
        dispatch(
          isFolder
            ? updateFolderResponseScript({ script: value, collectionUid: collection.uid, folderUid: folder.uid })
            : updateCollectionResponseScript({ script: value, collectionUid: collection.uid })
        )
    };
  }, [activeTab, collection, folder, isFolder, scriptPaneTab, docsEditing, dispatch]);

  if (!config) return null;

  const targetUid = isFolder ? folder.uid : collection.uid;

  return (
    <AIAssist
      key={`${targetUid}-${config.scriptType}`}
      scriptType={config.scriptType}
      currentScript={config.currentScript}
      docsContext={config.docsContext}
      variables={variables}
      onApply={config.onApply}
    />
  );
};

export default SettingsAiAssist;
