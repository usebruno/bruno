import store from 'providers/ReduxStore';
import { openCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { addTab, focusTab, updateRequestPaneTab, updateTabState } from 'providers/ReduxStore/slices/tabs';

const SELECTOR_BY_SCOPE = {
  request: (variableName) =>
    `[data-testid="request-vars-req"] [data-row-name="${CSS.escape(variableName)}"]`,

  folder: (variableName) =>
    `[data-testid="folder-vars-req"] [data-row-name="${CSS.escape(variableName)}"]`,

  collection: (variableName) =>
    `[data-testid="collection-vars-req"] [data-row-name="${CSS.escape(variableName)}"]`,

  environment: (variableName) =>
    `[data-testid="env-var-row-${CSS.escape(variableName)}"]`,

  global: (variableName) =>
    `[data-testid="env-var-row-${CSS.escape(variableName)}"]`
};

const scrollDefinitionIntoView = (scopeType, variableName) => {
  if (typeof document === 'undefined') {
    return;
  }

  const getSelector = SELECTOR_BY_SCOPE[scopeType];

  if (!getSelector) {
    return;
  }

  const selector = getSelector(variableName);
  const deadline = performance.now() + 1500;

  // scroll the definition row into view, if it exists. If it doesn't exist yet, keep trying until the deadline is reached.
  const tryScroll = () => {
    const definitionRow = document.querySelector(selector);

    if (definitionRow) {
      definitionRow.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      definitionRow.classList.add('bruno-var-definition-target');

      window.setTimeout(() => {
        definitionRow.classList.remove('bruno-var-definition-target');
      }, 1500);

      return;
    }

    if (performance.now() < deadline) {
      window.requestAnimationFrame(tryScroll);
    }
  };

  window.requestAnimationFrame(tryScroll);
};

// Navigate to the definition of a variable based on its scope and name.
// for Environment also send the tab state to select the right sub-tab (Variables or Secrets).
export const goToVariableDefinition = (scopeInfo, collection, item, variableName) => {
  if (!scopeInfo || !collection || !variableName) {
    return;
  }

  const dispatch = store.dispatch;

  switch (scopeInfo.type) {
    case 'request': {
      const targetItem = scopeInfo.data?.item || item;
      if (!targetItem?.uid) {
        return;
      }

      dispatch(addTab({
        uid: targetItem.uid,
        collectionUid: collection.uid,
        type: targetItem.type,
        pathname: targetItem.pathname,
        requestPaneTab: 'vars'
      }));
      dispatch(updateRequestPaneTab({ uid: targetItem.uid, requestPaneTab: 'vars' }));
      dispatch(focusTab({ uid: targetItem.uid }));
      break;
    }

    case 'folder': {
      const folder = scopeInfo.data?.folder;
      if (!folder?.uid) {
        return;
      }

      dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: folder.uid, tab: 'vars' }));
      dispatch(addTab({ uid: folder.uid, collectionUid: collection.uid, type: 'folder-settings', pathname: folder.pathname }));
      break;
    }

    case 'collection': {
      dispatch(openCollectionSettings(collection.uid, 'vars'));
      break;
    }

    case 'environment': {
      const environmentTabUid = `${collection.uid}-environment-settings`;
      const environmentUid = scopeInfo.data?.environment?.uid;
      dispatch(addTab({ uid: environmentTabUid, collectionUid: collection.uid, type: 'environment-settings' }));

      // pin the environment and the sub-tab(variables or secrets) to tab state.
      dispatch(updateTabState({
        uid: environmentTabUid,
        tabState: {
          ...(environmentUid ? { envUid: environmentUid } : {}),
          environment: { tab: scopeInfo.data?.variable?.secret ? 'secrets' : 'variables' }
        }
      }));
      break;
    }

    case 'global': {
      const globalEnvironmentTabUid = `${collection.uid}-global-environment-settings`;
      const environmentUid = store.getState().globalEnvironments?.activeGlobalEnvironmentUid;
      dispatch(addTab({ uid: globalEnvironmentTabUid, collectionUid: collection.uid, type: 'global-environment-settings' }));

      // pin the environment and the sub-tab(variables or secrets) to tab state.
      dispatch(updateTabState({
        uid: globalEnvironmentTabUid,
        tabState: {
          ...(environmentUid ? { envUid: environmentUid } : {}),
          environment: { tab: scopeInfo.data?.variable?.secret ? 'secrets' : 'variables' }
        }
      }));
      break;
    }

    default:
      return;
  }

  scrollDefinitionIntoView(scopeInfo.type, variableName);
};
