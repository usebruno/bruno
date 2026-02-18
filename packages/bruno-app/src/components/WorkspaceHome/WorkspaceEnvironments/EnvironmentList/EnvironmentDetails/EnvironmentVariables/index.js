import React, { useCallback, useRef, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch, useSelector } from 'react-redux';
import {
  saveGlobalEnvironment,
  setGlobalEnvironmentDraft,
  clearGlobalEnvironmentDraft
} from 'providers/ReduxStore/slices/global-environments';
import EnvironmentVariablesTable from 'components/EnvironmentVariablesTable';

const EnvironmentVariables = ({ environment, setIsModified, collection, searchQuery = '' }) => {
  const dispatch = useDispatch();
  const { globalEnvironmentDraft } = useSelector((state) => state.globalEnvironments);

  const hasDraftForThisEnv = globalEnvironmentDraft?.environmentUid === environment.uid;

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
      environment={environment}
      collection={collection}
      onSave={handleSave}
      draft={hasDraftForThisEnv ? globalEnvironmentDraft : null}
      onDraftChange={handleDraftChange}
      onDraftClear={handleDraftClear}
      setIsModified={setIsModified}
      searchQuery={searchQuery}
    />
  );
};

export default EnvironmentVariables;
