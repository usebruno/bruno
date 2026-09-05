import store from 'providers/ReduxStore';
import { openCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { addTab, focusTab, updateRequestPaneTab, updateTabState } from 'providers/ReduxStore/slices/tabs';
import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';

const DEFINITION_SCROLL_POLL_TIMEOUT_MS = 1500;
const DEFINITION_HIGHLIGHT_DURATION_MS = 1500;

const envRowSelector = (variableName) => `[data-testid="env-var-row-${CSS.escape(variableName)}"]`;

const SELECTOR_BY_SCOPE = {
  [VARIABLE_ADD_SCOPES.REQUEST]: (variableName) =>
    `[data-testid="request-vars-req"] [data-row-name="${CSS.escape(variableName)}"]`,

  [VARIABLE_ADD_SCOPES.FOLDER]: (variableName) =>
    `[data-testid="folder-vars-req"] [data-row-name="${CSS.escape(variableName)}"]`,

  [VARIABLE_ADD_SCOPES.COLLECTION]: (variableName) =>
    `[data-testid="collection-vars-req"] [data-row-name="${CSS.escape(variableName)}"]`,

  [VARIABLE_ADD_SCOPES.ENVIRONMENT]: envRowSelector,

  [VARIABLE_ADD_SCOPES.GLOBAL]: envRowSelector
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
  const deadline = performance.now() + DEFINITION_SCROLL_POLL_TIMEOUT_MS;

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
      }, DEFINITION_HIGHLIGHT_DURATION_MS);

      return;
    }

    if (performance.now() < deadline) {
      window.requestAnimationFrame(tryScroll);
    }
  };

  window.requestAnimationFrame(tryScroll);
};

// pins the environment and the sub-tab (Variables or Secrets) to the given tab's state.
const pinEnvironmentTabState = (dispatch, tabUid, environmentUid, scopeInfo) => {
  dispatch(updateTabState({
    uid: tabUid,
    tabState: {
      ...(environmentUid ? { envUid: environmentUid } : {}),
      environment: { tab: scopeInfo.data?.variable?.secret ? 'secrets' : 'variables' }
    }
  }));
};

// Navigate to the definition of a variable based on its scope and name.
// for Environment also send the tab state to select the right sub-tab (Variables or Secrets).
export const goToVariableDefinition = (scopeInfo, collection, item, variableName) => {
  if (!scopeInfo || !collection || !variableName) {
    return;
  }

  const dispatch = store.dispatch;

  switch (scopeInfo.type) {
    case VARIABLE_ADD_SCOPES.REQUEST: {
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

    case VARIABLE_ADD_SCOPES.FOLDER: {
      const folder = scopeInfo.data?.folder;
      if (!folder?.uid) {
        return;
      }

      dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: folder.uid, tab: 'vars' }));
      dispatch(addTab({ uid: folder.uid, collectionUid: collection.uid, type: 'folder-settings', pathname: folder.pathname }));
      break;
    }

    case VARIABLE_ADD_SCOPES.COLLECTION: {
      dispatch(openCollectionSettings(collection.uid, 'vars'));
      break;
    }

    case VARIABLE_ADD_SCOPES.ENVIRONMENT: {
      const environmentTabUid = `${collection.uid}-environment-settings`;
      const environmentUid = scopeInfo.data?.environment?.uid;
      dispatch(addTab({ uid: environmentTabUid, collectionUid: collection.uid, type: 'environment-settings' }));

      pinEnvironmentTabState(dispatch, environmentTabUid, environmentUid, scopeInfo);
      break;
    }

    case VARIABLE_ADD_SCOPES.GLOBAL: {
      const state = store.getState();
      const tabsState = state.tabs || {};
      const activeTab = (tabsState.tabs || []).find((t) => t.uid === tabsState.activeTabUid);

      const matchesCollection = (tab) => !collection.uid || tab.collectionUid === collection.uid;
      const existingGlobalTab = activeTab?.type === 'global-environment-settings' && matchesCollection(activeTab)
        ? activeTab
        : (tabsState.tabs || []).find((t) => t.type === 'global-environment-settings' && matchesCollection(t));

      const fallbackCollectionUid = collection.uid || activeTab?.collectionUid;
      const globalEnvironmentTabUid = existingGlobalTab?.uid || `${fallbackCollectionUid}-global-environment-settings`;
      const environmentUid = state.globalEnvironments?.activeGlobalEnvironmentUid;

      dispatch(addTab({
        uid: globalEnvironmentTabUid,
        collectionUid: existingGlobalTab?.collectionUid || fallbackCollectionUid,
        type: 'global-environment-settings'
      }));

      pinEnvironmentTabState(dispatch, globalEnvironmentTabUid, environmentUid, scopeInfo);
      break;
    }

    default:
      return;
  }

  scrollDefinitionIntoView(scopeInfo.type, variableName);
};
