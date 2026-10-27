import { forOwn, cloneDeep } from 'lodash';
import { interpolate, interpolateObject as interpolateObjectCommon } from '@usebruno/common';

type VariableMap = Record<string, any>;

export type InterpolationOptions = {
  globalEnvironmentVariables?: VariableMap;
  collectionVariables?: VariableMap;
  envVars?: VariableMap;
  folderVariables?: VariableMap;
  requestVariables?: VariableMap;
  runtimeVariables?: VariableMap;
  processEnvVars?: VariableMap;
  promptVariables?: VariableMap;
  onUnresolved?: (name: string) => void;
};

/**
 * Merges every variable scope into one lookup map. Later scopes win:
 * global env < collection < env < folder < request < runtime < prompt.
 */
const buildCombinedVars = ({
  globalEnvironmentVariables,
  collectionVariables,
  envVars,
  folderVariables,
  requestVariables,
  runtimeVariables,
  processEnvVars,
  promptVariables
}: InterpolationOptions): VariableMap => {
  processEnvVars = processEnvVars || {};
  runtimeVariables = runtimeVariables || {};
  globalEnvironmentVariables = globalEnvironmentVariables || {};
  collectionVariables = collectionVariables || {};
  folderVariables = folderVariables || {};
  requestVariables = requestVariables || {};
  promptVariables = promptVariables || {};

  // we clone envVars because we don't want to modify the original object
  const clonedEnvVars: VariableMap = envVars ? cloneDeep(envVars) : {};

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(clonedEnvVars, (value, key) => {
    clonedEnvVars[key] = interpolate(value, {
      process: {
        env: {
          ...processEnvVars
        }
      }
    });
  });

  return {
    ...globalEnvironmentVariables,
    ...collectionVariables,
    ...clonedEnvVars,
    ...folderVariables,
    ...requestVariables,
    ...runtimeVariables,
    ...promptVariables,
    process: {
      env: {
        ...processEnvVars
      }
    }
  };
};

/**
 * Interpolates `{{var}}` placeholders in a string against the given variable scopes.
 * Non-string / empty input is returned unchanged.
 */
export const interpolateString = <T>(str: T, interpolationOptions: InterpolationOptions): T | string => {
  if (!str || typeof str !== 'string' || !str.length) {
    return str;
  }

  const { onUnresolved } = interpolationOptions;
  const combinedVars = buildCombinedVars(interpolationOptions);
  return interpolate(str, combinedVars, { onUnresolved });
};

/**
 * Recursively interpolates all string values in an object against the given variable scopes.
 * Unlike `interpolateObject` from `@usebruno/common`, this takes the scoped options, not a flat map.
 */
export const interpolateObject = <T>(obj: T, interpolationOptions: InterpolationOptions): T => {
  const combinedVars = buildCombinedVars(interpolationOptions);
  return interpolateObjectCommon(obj, combinedVars) as T;
};
