import { useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { importEnvironment, saveEnvironment, updateEnvironmentColor } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment, saveGlobalEnvironment, updateGlobalEnvironmentColor } from 'providers/ReduxStore/slices/global-environments';
import { normalizeEnvName } from 'utils/environments';

export const useEnvironmentTarget = (type, collection) => {
  const dispatch = useDispatch();
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const isGlobal = type === 'global';

  const existingEnvironments = useMemo(() => isGlobal ? globalEnvironments : (collection?.environments || []), [isGlobal, globalEnvironments, collection]);
  const existingNames = useMemo(() => existingEnvironments.map((e) => e.name), [existingEnvironments]);

  const saveEnv = useCallback(async (environment, existingEnv) => {
    const action = isGlobal
      ? saveGlobalEnvironment({ variables: environment.variables, environmentUid: existingEnv.uid })
      : saveEnvironment(environment.variables, existingEnv.uid, collection.uid);

    await dispatch(action);

    if (environment.color !== undefined) {
      const colorAction = isGlobal
        ? updateGlobalEnvironmentColor(existingEnv.uid, environment.color)
        : updateEnvironmentColor(existingEnv.uid, environment.color, collection.uid);
      await dispatch(colorAction);
    }
  }, [isGlobal, collection, dispatch]);

  const createEnv = useCallback(async (name, environment) => {
    const action = isGlobal
      ? addGlobalEnvironment({ name, variables: environment.variables, color: environment.color })
      : importEnvironment({ name, variables: environment.variables, color: environment.color, collectionUid: collection?.uid });
    await dispatch(action);
  }, [isGlobal, collection, dispatch]);

  const getExistingEnv = useCallback((name) => {
    return existingEnvironments.find((e) => normalizeEnvName(e.name) === normalizeEnvName(name));
  }, [existingEnvironments]);

  return {
    existingNames,
    saveEnv,
    createEnv,
    getExistingEnv
  };
};
