const addConsoleShimToContext = (context, console) => {
  context.global.setSync('log', function (...args) {
    console.log(...args);
    return args;
  });

  context.global.setSync('debug', function (...args) {
    console.debug(...args);
    return args;
  });

  context.global.setSync('info', function (...args) {
    console.info(...args);
    return args;
  });

  context.global.setSync('warn', function (...args) {
    console.warn(...args);
    return args;
  });

  context.global.setSync('error', function (...args) {
    console.error(...args);
    return args;
  });

  context.evalSync(`
    console = {
        ...console || {},
        log: global.log,
        debug: global.debug,
        info: global.info,
        warn: global.warn,
        error: global.error
      }
  `);
};

module.exports = addConsoleShimToContext;
