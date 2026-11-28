const http = require('node:http');
const https = require('node:https');

// Need to add test case for this

// Property set on a ClientRequest to opt that one request in; read by the patched parser setup
const ALLOW_BOTH_HEADERS_MARKER = '__allowContentLengthWithTransferEncoding';
const TRANSPORT_WRAPPED_MARKER = '__contentLengthWithTransferEncodingTransport';

let isParserPatched = false;

/**
 * Lets Node's HTTP parser accept Content-Length together with Transfer-Encoding, for marked requests only.
 * Node builds a parser for every response with a bitmask of "lenient" flags and has no public option to turn on
 * just this one (insecureHTTPParser turns on all of them), so we wrap HTTPParser.prototype.initialize from the
 * internal _http_common and add the kLenientChunkedLength bit when the request carries our marker.
 * Runs once per process; returns false, leaving every request strict, if this Node version lacks what we need.
 */
const patchHttpParser = () => {
  if (isParserPatched) {
    return true;
  }

  let HTTPParser;
  try {
    // _http_common is Node's internal module that holds the class which parses every HTTP response
    ({ HTTPParser } = require('_http_common'));
  } catch (err) {
    return false;
  }

  /*
   * kLenientChunkedLength and HTTPParser.prototype.initialize are Node internals, not public API, so they can
   * change between Node and Electron versions. If either is missing, bail out instead of wrapping a method
   * that does not exist, which would throw on every response; requests then stay strict as before.
   */
  if (
    typeof HTTPParser?.kLenientChunkedLength !== 'number'
    || typeof HTTPParser.prototype.initialize !== 'function'
  ) {
    return false;
  }

  const originalInitialize = HTTPParser.prototype.initialize;
  HTTPParser.prototype.initialize = function (type, resource, maxHeaderSize, lenientFlags, ...rest) {
    const isMarkedRequest = resource?.req?.[ALLOW_BOTH_HEADERS_MARKER] === true;
    // Marked requests also accept Content-Length with Transfer-Encoding; every other flag is unchanged
    const flagsForRequest = isMarkedRequest && typeof lenientFlags === 'number'
      ? lenientFlags | HTTPParser.kLenientChunkedLength
      : lenientFlags;
    return originalInitialize.call(this, type, resource, maxHeaderSize, flagsForRequest, ...rest);
  };

  isParserPatched = true;
  return true;
};

// Node's strict parser rejects a response with both headers (#1680); curl reads it using Transfer-Encoding, so opt this request into that
export const allowContentLengthWithTransferEncoding = (config) => {
  if (!patchHttpParser() || config.transport?.[TRANSPORT_WRAPPED_MARKER]) {
    return;
  }

  // Wraps the existing transport so it composes with omit-connection
  const existingTransport = config.transport;
  config.transport = {
    [TRANSPORT_WRAPPED_MARKER]: true,
    request(options, callback) {
      const nodeTransport = options?.protocol === 'https:' ? https : http;
      const clientRequest = (existingTransport || nodeTransport).request(options, callback);
      clientRequest[ALLOW_BOTH_HEADERS_MARKER] = true;
      return clientRequest;
    }
  };
};
