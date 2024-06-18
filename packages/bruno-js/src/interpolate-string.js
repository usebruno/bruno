const { interpolate } = require('@usebruno/common');

const interpolateString = (str, { envVariables = {}, collectionVariables = {}, processEnvVars = {} }) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const combinedVars = {
    ...envVariables,
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
