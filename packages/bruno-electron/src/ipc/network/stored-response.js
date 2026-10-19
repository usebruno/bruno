const { parseDataFromResponse } = require('../../utils/common');

/**
 * The renderer keeps a trimmed copy of the last response: `dataBuffer` is a base64 string,
 * `duration` stands in for `responseTime` and the axios `request` is gone. Scripts expect the
 * live axios-shaped response, so rebuild it from what the renderer stored.
 *
 * @param {object} storedResponse - `item.response` as held in the renderer
 * @param {boolean} disableParsingResponseJson - same flag the original send was parsed with
 * @returns {object} a fresh response object that scripts may mutate freely
 */
const buildScriptResponse = (storedResponse, disableParsingResponseJson = false) => {
  const { status, statusText, headers, data, dataBuffer, receivedDataBuffer, duration, url } = storedResponse;

  // The stored body is what the first run's scripts left behind. `receivedDataBuffer` holds the bytes
  // as received when a script replaced them, and in-place edits of the stored `data` never reach the
  // buffer, so parsing the bytes again yields the response the way the original send saw it.
  const receivedBytes = Buffer.from(receivedDataBuffer || dataBuffer || '', 'base64');
  const received = receivedBytes.length
    ? parseDataFromResponse({ data: receivedBytes, headers }, disableParsingResponseJson)
    : { data, dataBuffer: receivedBytes };

  const response = {
    status,
    statusText,
    headers,
    data: received.data,
    dataBuffer: received.dataBuffer,
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
