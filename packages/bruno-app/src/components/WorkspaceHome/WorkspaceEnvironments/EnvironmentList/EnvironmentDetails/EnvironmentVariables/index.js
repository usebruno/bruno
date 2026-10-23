import React, { useCallback, useMemo } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch, useSelector } from 'react-redux';
import {
  saveGlobalEnvironment,
  setGlobalEnvironmentDraft,
  clearGlobalEnvironmentDraft
} from 'providers/ReduxStore/slices/global-environments';
import { markEnvironmentVariableAsSecret } from 'providers/ReduxStore/slices/collections/actions';
import EnvironmentVariablesTable from 'components/EnvironmentVariablesTable';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { SENSITIVE_FIELD_WARNING, findUsedGlobalEnvironmentVariableUids } from 'utils/sensitive-fields';
import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';

const EnvironmentVariables = ({ environment, setIsModified, collection, inheritedEnvironmentVariables, searchQuery = '', variableType = 'variables' }) => {
  const dispatch = useDispatch();
  const globalEnvironmentDraft = useSelector((state) => state.globalEnvironments.globalEnvironmentDraft);
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const collections = useSelector((state) => state.collections.collections);

  const hasDraftForThisEnv = globalEnvironmentDraft?.environmentUid === environment.uid;
  const liveEnvironment = useMemo(() => (
    hasDraftForThisEnv ? { ...environment, variables: globalEnvironmentDraft.variables } : environment
  ), [environment, globalEnvironmentDraft, hasDraftForThisEnv]);
  const usedVariableUids = useMemo(
    () => findUsedGlobalEnvironmentVariableUids(collections, globalEnvironments, liveEnvironment),
    [collections, globalEnvironments, liveEnvironment]
  );
  const hasSensitiveUsage = useCallback((variable) => (
    !!variable?.uid && usedVariableUids.has(variable.uid)
  ), [usedVariableUids]);
  const renderSensitiveWarning = useCallback((variable, markOwnVariableAsSecret) => {
    if (!variable.secret && hasSensitiveUsage(variable)) {
      const markAsSecret = markOwnVariableAsSecret ?? (() => dispatch(markEnvironmentVariableAsSecret({
        environmentScope: VARIABLE_ADD_SCOPES.GLOBAL,
        environmentUid: variable.inheritedFrom.uid,
        variableUid: variable.uid
      })));
      return (
        <SensitiveFieldWarning
          fieldName={variable.name}
          warningMessage={SENSITIVE_FIELD_WARNING.USED_IN_SENSITIVE_FIELD}
          scope={VARIABLE_ADD_SCOPES.GLOBAL}
          variableName={variable.name}
          onMarkAsSecret={markAsSecret}
        />
      );
    }
    return null;
  }, [hasSensitiveUsage, dispatch]);

  const handleSave = useCallback(
    (variables) => {
      return dispatch(saveGlobalEnvironment({ environmentUid: environment.uid, variables: cloneDeep(variables) }));
    },
    [dispatch, environment.uid]
  );

  const handleDraftChange = useCallback(
    (variables) => {
      dispatch(
        setGlobalEnvironmentDraft({
          environmentUid: environment.uid,
          variables
        })
      );
    },
    [dispatch, environment.uid]
  );

  const handleDraftClear = useCallback(() => {
    dispatch(clearGlobalEnvironmentDraft());
  }, [dispatch]);

  return (
    <EnvironmentVariablesTable
      key={environment?.uid}
      environment={environment}
      inheritedEnvironmentVariables={inheritedEnvironmentVariables}
      collection={collection}
      onSave={handleSave}
      draft={hasDraftForThisEnv ? globalEnvironmentDraft : null}
      onDraftChange={handleDraftChange}
      onDraftClear={handleDraftClear}
      setIsModified={setIsModified}
      renderSensitiveWarning={renderSensitiveWarning}
      searchQuery={searchQuery}
      variableType={variableType}
    />
  );
};

export default EnvironmentVariables;
