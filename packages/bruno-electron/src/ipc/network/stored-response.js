/**
 * The renderer keeps a trimmed copy of the last response: `dataBuffer` is a base64 string,
 * `duration` stands in for `responseTime` and the axios `request` is gone. Scripts expect the
 * live axios-shaped response, so rebuild it from what the renderer stored.
 *
 * @param {object} storedResponse - `item.response` as held in the renderer
 * @returns {object} a fresh response object that scripts may mutate freely
 */
const buildScriptResponse = (storedResponse) => {
  const { status, statusText, headers, data, dataBuffer, duration, url } = storedResponse;

  const response = {
    status,
    statusText,
    headers,
    data,
    dataBuffer: Buffer.from(dataBuffer || '', 'base64'),
    responseTime: duration
  };

  // BrunoResponse derives `res.getUrl()` from the axios ClientRequest fields. A stored url that
  // does not parse only costs `res.getUrl()`, it must not stop the script from running.
  try {
    const { protocol, hostname, pathname, search } = new URL(url);
    response.request = { protocol, host: hostname, path: `${pathname}${search}` };
  } catch (error) {
    response.request = undefined;
  }

  return response;
};

/**
 * Overlays what was actually sent onto the request that was prepared from the current item, so
 * `req` in the script reflects the request that produced the stored response instead of the
 * uninterpolated definition.
 *
 * @param {object} request - request built by prepareRequest
 * @param {object} requestSent - `item.requestSent` as held in the renderer
 */
const applyRequestSent = (request, requestSent) => {
  if (!requestSent) {
    return;
  }

  request.url = requestSent.url;
  request.method = requestSent.method;
  request.headers = requestSent.headers;
  request.data = requestSent.data;
};

module.exports = {
  buildScriptResponse,
  applyRequestSent
};
