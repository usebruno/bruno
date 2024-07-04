const { interpolate } = require('@usebruno/common');

const interpolateString = (
  str,
  { envVariables = {}, collectionVariables = {}, processEnvVars = {}, requestVariables = {} }
) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const combinedVars = {
    ...envVariables,
    ...requestVariables,
    ...collectionVariables,
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
