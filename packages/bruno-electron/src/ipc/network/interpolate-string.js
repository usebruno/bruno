const { forOwn, cloneDeep } = require('lodash');
const { interpolate, interpolateObject: interpolateObjectCommon } = require('@usebruno/common');

const buildCombinedVars = ({
  globalEnvironmentVariables,
  collectionVariables,
  envVars,
  folderVariables,
  requestVariables,
  runtimeVariables,
  processEnvVars,
  promptVariables
}) => {
  processEnvVars = processEnvVars || {};
  runtimeVariables = runtimeVariables || {};
  globalEnvironmentVariables = globalEnvironmentVariables || {};
  collectionVariables = collectionVariables || {};
  folderVariables = folderVariables || {};
  requestVariables = requestVariables || {};
  promptVariables = promptVariables || {};

  // we clone envVars because we don't want to modify the original object
  envVars = envVars ? cloneDeep(envVars) : {};

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVars, (value, key) => {
    envVars[key] = interpolate(value, {
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
};

const interpolateString = (str, interpolationOptions) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const combinedVars = buildCombinedVars(interpolationOptions);
  return interpolate(str, combinedVars);
};

/**
 * Recursively interpolates all string values in an object
 */
const interpolateObject = (obj, interpolationOptions) => {
  const combinedVars = buildCombinedVars(interpolationOptions);
  return interpolateObjectCommon(obj, combinedVars);
};

module.exports = {
  interpolateString,
  interpolateObject
};
