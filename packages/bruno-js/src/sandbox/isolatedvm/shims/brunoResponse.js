const ivm = require('isolated-vm');

const addBrunoResponseShimToContext = (context, res) => {
  context.global.setSync('status', new ivm.ExternalCopy(res?.status).copyInto());
  context.global.setSync('headers', new ivm.ExternalCopy(res?.headers).copyInto());
  context.global.setSync('body', new ivm.ExternalCopy(res?.body).copyInto());
  context.global.setSync('responseTime', new ivm.ExternalCopy(res?.responseTime).copyInto());

  context.global.setSync('getStatus', function () {
    return res?.getStatus();
  });

  context.global.setSync('getHeader', function (name) {
    return res?.getHeader(name);
  });

  context.global.setSync('getHeaders', function () {
    return res?.getHeaders();
  });

  context.global.setSync('getBody', function () {
    return res?.getBody();
  });

  context.global.setSync('getResponseTime', function () {
    return res?.getResponseTime();
  });

  context.evalSync(`
    res = {
        ...res || {},
        status: global.status,
        statusText: global.statusText,
        headers: global.headers,
        body: global.body,
        responseTime: global.responseTime,
        getStatus: global.getStatus,
        getHeader: global.getHeader,
        getHeaders: global.getHeaders,
        getBody: global.getBody,
        getResponseTime: global.getResponseTime
      }
    `);
};

module.exports = addBrunoResponseShimToContext;
