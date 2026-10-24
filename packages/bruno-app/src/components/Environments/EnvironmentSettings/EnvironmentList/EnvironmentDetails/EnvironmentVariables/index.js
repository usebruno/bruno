import React, { useMemo, useCallback } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { setEnvironmentsDraft, clearEnvironmentsDraft } from 'providers/ReduxStore/slices/collections';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import EnvironmentVariablesTable from 'components/EnvironmentVariablesTable';
import { ENVIRONMENT_USAGE_WARNING, findUsedEnvironmentVariableUids } from 'utils/sensitive-fields';

const EnvironmentVariables = ({ environment, setIsModified, collection, inheritedEnvironmentVariables, searchQuery = '', variableType = 'variables' }) => {
  const dispatch = useDispatch();

  const environmentsDraft = collection?.environmentsDraft;
  const hasDraftForThisEnv = environmentsDraft?.environmentUid === environment.uid;

  const liveEnvironment = useMemo(() => (
    hasDraftForThisEnv ? { ...environment, variables: environmentsDraft.variables } : environment
  ), [environment, environmentsDraft, hasDraftForThisEnv]);

  const usedVariableUids = useMemo(
    () => findUsedEnvironmentVariableUids(collection, liveEnvironment),
    [collection, liveEnvironment]
  );

  const hasSensitiveUsage = useCallback((variable) => (
    !!variable?.uid && usedVariableUids.has(variable.uid)
  ), [usedVariableUids]);

  const handleSave = useCallback(
    (variables) => {
      return dispatch(saveEnvironment(cloneDeep(variables), environment.uid, collection.uid));
    },
    [dispatch, environment.uid, collection.uid]
  );

  const handleDraftChange = useCallback(
    (variables) => {
      dispatch(
        setEnvironmentsDraft({
          collectionUid: collection.uid,
          environmentUid: environment.uid,
          variables
        })
      );
    },
    [dispatch, collection.uid, environment.uid]
  );

  const handleDraftClear = useCallback(() => {
    dispatch(clearEnvironmentsDraft({ collectionUid: collection.uid }));
  }, [dispatch, collection.uid]);

  const renderSensitiveWarning = useCallback(
    (variable) => {
      if (!variable.secret && hasSensitiveUsage(variable)) {
        return (
          <SensitiveFieldWarning
            fieldName={variable.name}
            warningMessage={ENVIRONMENT_USAGE_WARNING}
          />
        );
      }
      return null;
    },
    [hasSensitiveUsage]
  );

  return (
    <EnvironmentVariablesTable
      key={environment?.uid}
      environment={environment}
      inheritedEnvironmentVariables={inheritedEnvironmentVariables}
      collection={collection}
      onSave={handleSave}
      draft={hasDraftForThisEnv ? environmentsDraft : null}
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
