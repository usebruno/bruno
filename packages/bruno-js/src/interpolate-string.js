const { interpolate } = require('@usebruno/common');

const interpolateString = (
  str,
  { envVariables = {}, runtimeVariables = {}, processEnvVars = {}, resolvedRequestVariables = {} }
) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const combinedVars = {
    process: {
      env: {
        ...processEnvVars
      }
    },
    ...envVariables,
    ...resolvedRequestVariables,
    ...runtimeVariables
  };

  return interpolate(str, combinedVars);
};

module.exports = {
  interpolateString
};
