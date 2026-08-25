import { useDispatch, useSelector } from 'react-redux';
import { importEnvironment, saveEnvironment, updateEnvironmentColor } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment, saveGlobalEnvironment, updateGlobalEnvironmentColor } from 'providers/ReduxStore/slices/global-environments';
import { normalizeEnvName } from '../../utils';

export const useEnvironmentTarget = (type, collection) => {
  const dispatch = useDispatch();
  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const isGlobal = type === 'global';

  const existingEnvironments = isGlobal ? globalEnvironments : (collection?.environments || []);
  const existingNames = existingEnvironments.map((e) => e.name);

  const saveEnv = async (environment, existingEnv) => {
    const action = isGlobal
      ? saveGlobalEnvironment({ variables: environment.variables, environmentUid: existingEnv.uid })
      : saveEnvironment(environment.variables, existingEnv.uid, collection.uid);
    const colorAction = isGlobal
      ? updateGlobalEnvironmentColor(existingEnv.uid, environment.color)
      : updateEnvironmentColor(existingEnv.uid, environment.color, collection.uid);

    await dispatch(action);
    if (colorAction) {
      await dispatch(colorAction);
    }
  };

  const createEnv = async (name, environment) => {
    const action = isGlobal
      ? addGlobalEnvironment({ name, variables: environment.variables, color: environment.color })
      : importEnvironment({ name, variables: environment.variables, color: environment.color, collectionUid: collection?.uid });
    await dispatch(action);
  };

  const getExistingEnv = (name) => {
    return existingEnvironments.find((e) => normalizeEnvName(e.name) === normalizeEnvName(name));
  };

  return {
    isGlobal,
    existingNames,
    saveEnv,
    createEnv,
    getExistingEnv
  };
};
