const { forOwn, cloneDeep } = require('lodash');
const { interpolate, interpolateObject: interpolateObjectCommon } = require('@usebruno/common');

const buildCombinedVars = ({
  collectionVariables,
  envVars,
  folderVariables,
  requestVariables,
  runtimeVariables,
  processEnvVars
}) => {
  processEnvVars = processEnvVars || {};
  runtimeVariables = runtimeVariables || {};
  collectionVariables = collectionVariables || {};
  folderVariables = folderVariables || {};
  requestVariables = requestVariables || {};

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

  // runtimeVariables take precedence over envVars
  return {
    ...collectionVariables,
    ...envVars,
    ...folderVariables,
    ...requestVariables,
    ...runtimeVariables,
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
 * recursively interpolating all string values in a object
 */
const interpolateObject = (obj, interpolationOptions) => {
  const combinedVars = buildCombinedVars(interpolationOptions);
  return interpolateObjectCommon(obj, combinedVars);
};

module.exports = {
  interpolateString,
  interpolateObject
};
