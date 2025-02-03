import { makeTabPermanent } from "providers/ReduxStore/slices/tabs";
import { findCollectionByUid, findItemInCollection } from "utils/collections/index";
import find from 'lodash/find';

const actionsToIntercept = [
  'collections/requestUrlChanged',
  'collections/updateAuth',
  'collections/addQueryParam',
  'collections/moveQueryParam',
  'collections/updateQueryParam',
  'collections/deleteQueryParam',
  'collections/updatePathParam',
  'collections/addRequestHeader',
  'collections/updateRequestHeader',
  'collections/deleteRequestHeader',
  'collections/moveRequestHeader',
  'collections/addFormUrlEncodedParam',
  'collections/updateFormUrlEncodedParam',
  'collections/deleteFormUrlEncodedParam',
  'collections/moveFormUrlEncodedParam',
  'collections/addMultipartFormParam',
  'collections/updateMultipartFormParam',
  'collections/deleteMultipartFormParam',
  'collections/moveMultipartFormParam',
  'collections/updateRequestAuthMode',
  'collections/updateRequestBodyMode',
  'collections/updateRequestBody',
  'collections/updateRequestGraphqlQuery',
  'collections/updateRequestGraphqlVariables',
  'collections/updateRequestScript',
  'collections/updateResponseScript',
  'collections/updateRequestTests',
  'collections/updateRequestMethod',
  'collections/addAssertion',
  'collections/updateAssertion',
  'collections/deleteAssertion',
  'collections/moveAssertion',
  'collections/addVar',
  'collections/updateVar',
  'collections/deleteVar',
  'collections/moveVar',
  'collections/addFolderHeader',
  'collections/updateFolderHeader',
  'collections/deleteFolderHeader',
  'collections/addFolderVar',
  'collections/updateFolderVar',
  'collections/deleteFolderVar',
  'collections/updateRequestDocs'
];

function handleMakeTabParmanent(state, action, dispatch) {
  const tabs = state.tabs.tabs;
  const activeTabUid = state.tabs.activeTabUid;
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const itemUid = action.payload.itemUid || action.payload.folderUid
  const collection = findCollectionByUid(state.collections.collections, action.payload.collectionUid);
  console.log("got here")
  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && focusedTab.preview == true) {
      dispatch(makeTabPermanent({ uid: itemUid }));
    }
  }
}

export {
  actionsToIntercept,
  handleMakeTabParmanent
}

