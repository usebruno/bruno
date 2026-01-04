import { forOwn, cloneDeep } from 'lodash';
import { interpolate } from '@usebruno/common';

export interface InterpolationContext {
  globalEnvironmentVariables?: Record<string, any>;
  collectionVariables?: Record<string, any>;
  envVars?: Record<string, any>;
  folderVariables?: Record<string, any>;
  requestVariables?: Record<string, any>;
  runtimeVariables?: Record<string, any>;
  processEnvVars?: Record<string, string>;
  promptVariables?: Record<string, any>;
}

export const interpolateString = (
  str: string | null | undefined,
  context: InterpolationContext
): string | null | undefined => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const {
    globalEnvironmentVariables = {},
    collectionVariables = {},
    folderVariables = {},
    requestVariables = {},
    runtimeVariables = {},
    processEnvVars = {},
    promptVariables = {}
  } = context;

  let envVars = context.envVars ? cloneDeep(context.envVars) : {};

  forOwn(envVars, (value, key) => {
    envVars[key] = interpolate(value, {
      process: {
        env: {
          ...processEnvVars
        }
      }
    });
  });

  const combinedVars = {
    ...globalEnvironmentVariables,
    ...collectionVariables,
    ...envVars,
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

  return interpolate(str, combinedVars);
};
