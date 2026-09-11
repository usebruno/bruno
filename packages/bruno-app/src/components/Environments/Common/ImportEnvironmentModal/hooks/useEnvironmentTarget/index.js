import { useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { importEnvironment, saveEnvironment, saveEnvironmentExtends, updateEnvironmentColor } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment, saveGlobalEnvironment, saveGlobalEnvironmentExtends, updateGlobalEnvironmentColor } from 'providers/ReduxStore/slices/global-environments';
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

    // The replaced environment keeps its identity, so the parent named by the imported file only
    // reaches it through the dedicated extends write.
    if (environment.extends !== existingEnv.extends) {
      const extendsAction = isGlobal
        ? saveGlobalEnvironmentExtends({ environmentUid: existingEnv.uid, extends: environment.extends })
        : saveEnvironmentExtends({
            environmentUid: existingEnv.uid,
            inheritedEnvironmentName: environment.extends,
            collectionUid: collection.uid
          });
      await dispatch(extendsAction);
    }
  }, [isGlobal, collection, dispatch]);

  const createEnv = useCallback(async (name, environment) => {
    const action = isGlobal
      ? addGlobalEnvironment({ name, variables: environment.variables, color: environment.color, extends: environment.extends })
      : importEnvironment({ name, variables: environment.variables, color: environment.color, extends: environment.extends, collectionUid: collection?.uid });
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
