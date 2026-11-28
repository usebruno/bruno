import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import toast from 'react-hot-toast';
import { parseValueByDataType } from '@usebruno/common/utils';
import { updateVariableInScope } from 'providers/ReduxStore/slices/collections/actions';
import { appSetRuntimeVariable, deleteRuntimeVariable } from 'providers/ReduxStore/slices/collections';
import { buildScopeInfo, inferDataTypeFromText } from 'utils/variables';
import { SCOPES } from '../constants';

const buildRowScopeInfo = (section, row, collection, dataType) => {
  switch (section.scope) {
    case SCOPES.REQUEST:
      return { type: 'request', data: { item: section.owner, variable: row.variable, dataType } };
    case SCOPES.FOLDER:
      return { type: 'folder', data: { folder: section.owner, variable: row.variable, dataType } };
    case SCOPES.COLLECTION:
      return { type: 'collection', data: { collection, variable: row.variable, dataType } };
    case SCOPES.ENVIRONMENT:
      return { type: 'environment', data: { environment: section.owner, secret: row.variable.secret, dataType } };
    case SCOPES.GLOBAL:
      return { type: 'global', data: { secret: row.variable.secret, dataType } };
    default:
      return null;
  }
};

const useVariableActions = ({ collection, item }) => {
  const dispatch = useDispatch();
  const store = useStore();

  const persist = useCallback((name, text, scopeInfo) => (
    dispatch(updateVariableInScope(name, text, scopeInfo, collection.uid)).catch((error) => {
      toast.error(error?.message || 'Failed to save the variable');
    })
  ), [dispatch, collection.uid]);

  const saveValue = useCallback((section, row, text, dataType) => {
    if (section.scope === SCOPES.RUNTIME) {
      dispatch(appSetRuntimeVariable({ collectionUid: collection.uid, key: row.name, value: parseValueByDataType(text, dataType) }));
      return;
    }
    persist(row.name, text, buildRowScopeInfo(section, row, collection, dataType));
  }, [dispatch, persist, collection]);

  const clearValue = useCallback((section, row) => {
    if (section.scope === SCOPES.RUNTIME) {
      dispatch(deleteRuntimeVariable({ collectionUid: collection.uid, key: row.name }));
      return;
    }
    persist(row.name, '', buildRowScopeInfo(section, row, collection, undefined));
  }, [dispatch, persist, collection]);

  const defineVariable = useCallback((name, text, scopeType) => {
    const scopeInfo = buildScopeInfo({
      scopeType,
      state: store.getState(),
      collection,
      item,
      variableName: name,
      dataType: inferDataTypeFromText(text)
    });
    persist(name, text, scopeInfo);
  }, [store, persist, collection, item]);

  return { saveValue, clearValue, defineVariable };
};

export default useVariableActions;
