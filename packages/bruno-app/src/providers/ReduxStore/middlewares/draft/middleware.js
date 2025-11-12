import { handleMakeTabParmanent } from './utils';

const actionsToIntercept = [
  // Request-level actions
  'collections/requestUrlChanged',
  'collections/updateAuth',
  'collections/addQueryParam',
  'collections/moveQueryParam',
  'collections/updateQueryParam',
  'collections/deleteQueryParam',
  'collections/setQueryParams',
  'collections/updatePathParam',
  'collections/addRequestHeader',
  'collections/updateRequestHeader',
  'collections/deleteRequestHeader',
  'collections/moveRequestHeader',
  'collections/setRequestHeaders',
  'collections/addFormUrlEncodedParam',
  'collections/updateFormUrlEncodedParam',
  'collections/deleteFormUrlEncodedParam',
  'collections/moveFormUrlEncodedParam',
  'collections/setFormUrlEncodedParams',
  'collections/addMultipartFormParam',
  'collections/updateMultipartFormParam',
  'collections/deleteMultipartFormParam',
  'collections/moveMultipartFormParam',
  'collections/setMultipartFormParams',
  'collections/updateRequestAuthMode',
  'collections/updateRequestBodyMode',
  'collections/updateRequestBody',
  'collections/updateRequestGraphqlQuery',
  'collections/updateRequestGraphqlVariables',
  'collections/updateRequestScript',
  'collections/updateResponseScript',
  'collections/updateRequestHooksScript',
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
  'collections/setFolderHeaders',
  'collections/addFolderVar',
  'collections/updateFolderVar',
  'collections/deleteFolderVar',
  'collections/setFolderVars',
  'collections/updateFolderRequestScript',
  'collections/updateFolderResponseScript',
  'collections/updateFolderHooksScript',
  'collections/updateFolderTests',
  'collections/updateFolderAuth',
  'collections/updateFolderAuthMode',
  'collections/updateFolderDocs',

  // Collection-level actions
  'collections/addCollectionHeader',
  'collections/updateCollectionHeader',
  'collections/deleteCollectionHeader',
  'collections/setCollectionHeaders',
  'collections/addCollectionVar',
  'collections/updateCollectionVar',
  'collections/deleteCollectionVar',
  'collections/setCollectionVars',
  'collections/updateCollectionAuth',
  'collections/updateCollectionAuthMode',
  'collections/updateCollectionRequestScript',
  'collections/updateCollectionResponseScript',
  'collections/updateCollectionHooksScript',
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
