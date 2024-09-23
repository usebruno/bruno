const { interpolate } = require('@usebruno/common');

const interpolateString = (
  str,
  { envVariables = {}, runtimeVariables = {}, processEnvVars = {}, collectionVariables = {}, folderVariables = {}, requestVariables = {} }
) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const combinedVars = {
    ...collectionVariables,
    ...envVariables,
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

module.exports = {
  interpolateString
};
