const addBrunoRequestShimToContext = (context, req) => {
  context.global.setSync('getUrl', function () {
    return req.getUrl();
  });

  context.global.setSync('setUrl', function (url) {
    req.setUrl(url);
  });

  context.global.setSync('getMethod', function () {
    return req.getMethod();
  });

  context.global.setSync('getAuthMode', function () {
    return req.getAuthMode();
  });

  context.global.setSync('setMethod', function (method) {
    req.setMethod(method);
  });

  context.global.setSync('getHeaders', function () {
    return req.getHeaders();
  });

  context.global.setSync('setHeaders', function (headers) {
    req.setHeaders(headers);
  });

  context.global.setSync('getHeader', function (name) {
    return req.getHeader(name);
  });

  context.global.setSync('setHeader', function (name, value) {
    req.setHeader(name, value);
  });

  context.global.setSync('getBody', function () {
    return req.getBody();
  });

  context.global.setSync('setBody', function (data) {
    req.setBody(data);
  });

  context.global.setSync('setMaxRedirects', function (maxRedirects) {
    req.setMaxRedirects(maxRedirects);
  });

  context.global.setSync('getTimeout', function () {
    return req.getTimeout();
  });

  context.global.setSync('setTimeout', function (timeout) {
    req.setTimeout(timeout);
  });

  context.evalSync(`
    req = {
        ...req || {},
        getUrl: global.getUrl,
        setUrl: global.setUrl,
        getMethod: global.getMethod,
        getAuthMode: global.getAuthMode,
        setMethod: global.setMethod,
        getHeaders: global.getHeaders,
        setHeaders: global.setHeaders,
        getHeader: global.getHeader,
        setHeader: global.setHeader,
        getBody: global.getBody,
        setBody: global.setBody,
        setMaxRedirects: global.setMaxRedirects,
        getTimeout: global.getTimeout,
        setTimeout: global.setTimeout
    }
`);
};

module.exports = addBrunoRequestShimToContext;
