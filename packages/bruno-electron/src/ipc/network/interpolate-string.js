const { forOwn, cloneDeep } = require('lodash');
const { interpolate } = require('@usebruno/common');

const interpolateString = (str, { envVars, runtimeVariables, processEnvVars }) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  processEnvVars = processEnvVars || {};
  runtimeVariables = runtimeVariables || {};

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
    ...envVars,
    ...runtimeVariables,
    process: {
      env: {
        ...processEnvVars
      }
    }
  };

  return interpolate(str, combinedVars);
};

module.exports = {
  interpolateString
};
