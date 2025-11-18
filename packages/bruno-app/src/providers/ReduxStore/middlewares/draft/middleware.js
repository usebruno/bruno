import { handleMakeTabParmanent } from "./utils";

const actionsToIntercept = [
  // Request-level actions
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
  'collections/updateRequestDocs',
  'collections/runRequestEvent', // TODO: This doesn't necessarily related to a draft state, need to rethink.

  // Folder-level actions
  'collections/addFolderHeader',
  'collections/updateFolderHeader',
  'collections/deleteFolderHeader',
  'collections/addFolderVar',
  'collections/updateFolderVar',
  'collections/deleteFolderVar',
  'collections/updateFolderRequestScript',
  'collections/updateFolderResponseScript',
  'collections/updateFolderTests',
  'collections/updateFolderAuth',
  'collections/updateFolderAuthMode',
  'collections/updateFolderDocs',

  // Collection-level actions
  'collections/addCollectionHeader',
  'collections/updateCollectionHeader',
  'collections/deleteCollectionHeader',
  'collections/addCollectionVar',
  'collections/updateCollectionVar',
  'collections/deleteCollectionVar',
  'collections/updateCollectionAuth',
  'collections/updateCollectionAuthMode',
  'collections/updateCollectionRequestScript',
  'collections/updateCollectionResponseScript',
  'collections/updateCollectionTests',
  'collections/updateCollectionDocs',
  'collections/updateCollectionClientCertificates',
  'collections/updateCollectionProtobuf',
  'collections/updateCollectionProxy'
];

export const draftDetectMiddleware = ({ dispatch, getState }) => (next) => (action) => {
  if (actionsToIntercept.includes(action.type)) {
    const state = getState();
    handleMakeTabParmanent(state, action, dispatch);
  }
  return next(action);
};
