import React, { useMemo } from 'react';
import find from 'lodash/find';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import AIAssist from 'components/AIAssist';
import { buildAiContextPayload } from 'utils/ai';
import {
  updateRequestTests,
  updateRequestScript,
  updateResponseScript,
  updateRequestDocs,
  updateAppCode
} from 'providers/ReduxStore/slices/collections';
import { getActiveScriptTab } from 'utils/tabs';

const getFromItem = (item, path) => (item.draft ? get(item, `draft.${path}`) : get(item, path));

const TabBarAiAssist = ({ item, collection, activeTab }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const scriptPaneTab = focusedTab?.scriptPaneTab;
  const docsEditing = focusedTab?.docsEditing || false;

  const { requestContext, variables } = useMemo(
    () => buildAiContextPayload(item, collection),
    [item, collection]
  );

  const config = useMemo(() => {
    switch (activeTab) {
      case 'tests':
        return {
          scriptType: 'tests',
          currentScript: getFromItem(item, 'request.tests') || '',
          onApply: (value) =>
            dispatch(updateRequestTests({ tests: value, itemUid: item.uid, collectionUid: collection.uid }))
        };
      case 'docs':
        if (!docsEditing) return null;
        return {
          scriptType: 'docs',
          currentScript: getFromItem(item, 'request.docs') || '',
          onApply: (value) =>
            dispatch(updateRequestDocs({ docs: value, itemUid: item.uid, collectionUid: collection.uid }))
        };
      case 'app':
        return {
          scriptType: 'app-request',
          currentScript: getFromItem(item, 'app.code') || '',
          onApply: (value) =>
            dispatch(updateAppCode({ code: value, itemUid: item.uid, collectionUid: collection.uid }))
        };
      case 'script': {
        const requestScript = getFromItem(item, 'request.script.req') || '';
        const responseScript = getFromItem(item, 'request.script.res') || '';
        if (getActiveScriptTab(scriptPaneTab, requestScript) === 'pre-request') {
          return {
            scriptType: 'pre-request',
            currentScript: requestScript,
            onApply: (value) =>
              dispatch(updateRequestScript({ script: value, itemUid: item.uid, collectionUid: collection.uid }))
          };
        }
        return {
          scriptType: 'post-response',
          currentScript: responseScript,
          onApply: (value) =>
            dispatch(updateResponseScript({ script: value, itemUid: item.uid, collectionUid: collection.uid }))
        };
      }
      default:
        return null;
    }
  }, [activeTab, item, collection, scriptPaneTab, docsEditing, dispatch]);

  if (!config) return null;

  return (
    <AIAssist
      key={`${item.uid}-${config.scriptType}`}
      scriptType={config.scriptType}
      currentScript={config.currentScript}
      requestContext={requestContext}
      variables={variables}
      onApply={config.onApply}
    />
  );
};

export default TabBarAiAssist;
