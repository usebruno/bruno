const { interpolate } = require('@usebruno/common');

const interpolateString = (
  str,
  {
    envVariables = {},
    runtimeVariables = {},
    processEnvVars = {},
    collectionVariables = {},
    folderVariables = [],
    requestVariables = {}
  }
) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const combinedVars = {
    processEnvVars: {
      process: {
        env: {
          ...processEnvVars
        }
      }
    },
    envVars: envVariables,
    collectionVariables,
    folderVariables,
    requestVariables,
    runtimeVariables
  };

  return interpolate(str, combinedVars);
};

module.exports = {
  interpolateString
};
