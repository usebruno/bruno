const { VIEW_MAX_BYTES } = require('./constants');
const { BodyTooLargeForScriptError } = require('./errors');

/**
 * Fill response.data / dataBuffer for post-response scripts from the dual-writer RAM buffer.
 * Bodies larger than VIEW_MAX_BYTES stay file-backed only: RAM is discarded and
 * response.scriptBodyError is set so res.getBody() can throw a clear error.
 */
const populateResponseDataForScripts = (store, response, parseDataFromResponse, disableParsingResponseJson) => {
  if (typeof response.size === 'number' && response.size > VIEW_MAX_BYTES) {
    store.discardBuffer(response.bodyRef);
    response.data = undefined;
    response.dataBuffer = undefined;
    response.scriptBodyError = new BodyTooLargeForScriptError(
      response.bodyRef,
      response.size,
      VIEW_MAX_BYTES
    ).message;
    return;
  }

  const buffer = store.getBufferForScripts(response.bodyRef);
  response.data = buffer;
  const parsed = parseDataFromResponse(response, disableParsingResponseJson);
  response.data = parsed.data;
  response.dataBuffer = parsed.dataBuffer;
};

module.exports = {
  populateResponseDataForScripts
};
