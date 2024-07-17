const { interpolate } = require('@usebruno/common');

const interpolateString = (
  str,
  { envVariables = {}, runtimeVariables = {}, processEnvVars = {}, requestVariables = {} }
) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const combinedVars = {
    ...envVariables,
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

module.exports = {
  interpolateString
};
