import React, { useCallback, useMemo } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch, useSelector } from 'react-redux';
import {
  saveGlobalEnvironment,
  setGlobalEnvironmentDraft,
  clearGlobalEnvironmentDraft
} from 'providers/ReduxStore/slices/global-environments';
import EnvironmentVariablesTable from 'components/EnvironmentVariablesTable';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { ENVIRONMENT_USAGE_WARNING, findUsedGlobalEnvironmentVariableUids } from 'utils/sensitive-fields';

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
  const renderExtraValueContent = useCallback((variable) => {
    if (!variable.secret && hasSensitiveUsage(variable)) {
      return (
        <SensitiveFieldWarning
          fieldName={variable.name}
          warningMessage={ENVIRONMENT_USAGE_WARNING}
        />
      );
    }
    return null;
  }, [hasSensitiveUsage]);

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
      renderExtraValueContent={renderExtraValueContent}
      searchQuery={searchQuery}
      variableType={variableType}
    />
  );
};

export default EnvironmentVariables;
