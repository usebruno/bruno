const addBruShimToContext = (context, bru) => {
  context.global.setSync('cwd', function () {
    return bru.cwd();
  });

  context.global.setSync('getEnvName', function () {
    return bru.getEnvName();
  });

  context.global.setSync('getProcessEnv', function (key) {
    return bru.getProcessEnv(key);
  });

  context.global.setSync('getEnvVar', function (key) {
    return bru.getEnvVar(key);
  });

  context.global.setSync('setEnvVar', function (key, value) {
    bru.setEnvVar(key, value);
  });

  context.global.setSync('setVar', function (key, value) {
    bru.setVar(key, value);
  });

  context.global.setSync('getVar', function (key) {
    return bru.getVar(key);
  });

  context.global.setSync('setNextRequest', function (nextRequest) {
    bru.setNextRequest(nextRequest);
  });

  context.global.setSync('visualize', function (htmlString) {
    bru.visualize(htmlString);
  });

  context.global.setSync('getSecretVar', function (key) {
    return bru.getSecretVar(key);
  });

  context.evalSync(`
      bru = {
        ...bru || {},
        cwd: global.cwd,
        getEnvName: global.getEnvName,
        getProcessEnv: global.getProcessEnv,
        getEnvVar: global.getEnvVar,
        setEnvVar: global.setEnvVar,
        setVar: global.setVar,
        getVar: global.getVar,
        setNextRequest: global.setNextRequest,
        visualize: global.visualize,
        getSecretVar: global.getSecretVar
      }
  `);
};

module.exports = addBruShimToContext;
