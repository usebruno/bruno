const addBrunoResponseShimToContext = (context, res) => {
  context.global.setSync('getStatus', function () {
    return res.getStatus();
  });

  context.global.setSync('getHeader', function (name) {
    return res.getHeader(name);
  });

  context.global.setSync('getHeaders', function () {
    return res.getHeaders();
  });

  context.global.setSync('getBody', function () {
    return res.getBody();
  });

  context.global.setSync('getResponseTime', function () {
    return res.getResponseTime();
  });

  context.evalSync(`
    res = {
        ...res || {},
        getStatus: global.getStatus,
        getHeader: global.getHeader,
        getHeaders: global.getHeaders,
        getBody: global.getBody,
        getResponseTime: global.getResponseTime
        }
    `);
};

module.exports = addBrunoResponseShimToContext;
