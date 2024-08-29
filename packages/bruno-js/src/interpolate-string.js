const { interpolate } = require('@usebruno/common');

const interpolateString = (
  str,
  { envVariables = {}, runtimeVariables = {}, processEnvVars = {}, collectionVariables = {}, folderVariables = {}, requestVariables = {} }
) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const combinedVars = {
    ...folderVariables,
    ...requestVariables,
    ...envVariables,
    ...collectionVariables,
    process: {
      env: {
        ...processEnvVars
      }
    },
    ...runtimeVariables
  };

  return interpolate(str, combinedVars);
};

module.exports = {
  interpolateString
};
