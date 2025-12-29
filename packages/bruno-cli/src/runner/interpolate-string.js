const { forOwn, cloneDeep } = require('lodash');
const { interpolate } = require('@usebruno/common');

const interpolateString = (str, {
  collectionVariables,
  envVars,
  folderVariables,
  requestVariables,
  runtimeVariables,
  processEnvVars
}) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

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
  const combinedVars = {
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

  return interpolate(str, combinedVars);
};

/**
 * recursively interpolating all string values in a object
 */
const interpolateObject = (obj, interpolationOptions) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateObject(item, interpolationOptions));
  }

  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        result[key] = interpolateString(value, interpolationOptions);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = interpolateObject(value, interpolationOptions);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

module.exports = {
  interpolateString,
  interpolateObject
};
