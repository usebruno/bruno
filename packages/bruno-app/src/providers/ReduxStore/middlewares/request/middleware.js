import { collectionChangeFileEvent } from 'providers/ReduxStore/slices/collections';
import { updateVariableUsageIndex, cleanupRequestReferences } from 'providers/ReduxStore/slices/variableUsageIndex';
import { sensitiveFields } from './constants';
import _ from 'lodash';

function extractReferences(value) {
  const regex = /\{\{([^}]+)\}\}/g;
  const result = [];
  let match;
  while ((match = regex.exec(value)) !== null) {
    result.push(match[1]);
  }
  return result;
}

const updateVariableUsageIndexMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  switch (action.type) {
    case collectionChangeFileEvent.type:
      const request = action.payload.file.data;
      const { uid } = request;

      store.dispatch(cleanupRequestReferences({ requestId: uid }));

      sensitiveFields.forEach((fieldPath) => {
        const fieldValue = _.get(request, fieldPath);
        if (typeof fieldValue === 'string') {
          const references = extractReferences(fieldValue);
          references.forEach((varKey) => {
            store.dispatch(updateVariableUsageIndex({ varKey, requestId: uid, fieldPath }));
          });
        }
      });
      break;
    default:
      break;
  }

  return result;
};

export default updateVariableUsageIndexMiddleware;
