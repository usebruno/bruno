/**
 * Copyright (c) 2014-2016 Nick Carneiro
 * https://github.com/curlconverter/curlconverter
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import parseCurlCommand from './parse-curl';
import * as querystring from 'query-string';
import * as jsesc from 'jsesc';

function getContentType(headers = {}) {
  const contentType = Object.keys(headers).find((key) => key.toLowerCase() === 'content-type');

  return contentType ? headers[contentType] : null;
}

function repr(value, isKey) {
  return isKey ? "'" + jsesc(value, { quotes: 'single' }) + "'" : value;
}

function getQueries(request) {
  const queries = {};
  for (const paramName in request.query) {
    const rawValue = request.query[paramName];
    let paramValue;
    if (Array.isArray(rawValue)) {
      paramValue = rawValue.map(repr);
    } else {
      paramValue = repr(rawValue);
    }
    queries[repr(paramName)] = paramValue;
  }

  return queries;
}

/**
 * Converts request data to a string based on its content type.
 *
 * @param {Object} request - The request object containing data and headers.
 * @returns {Object} An object containing the data string.
 */
function getDataString(request) {
  if (typeof request.data === 'number') {
    request.data = request.data.toString();
  }

  const contentType = getContentType(request.headers);

  if (contentType && contentType.includes('application/json')) {
    try {
      const parsedData = JSON.parse(request.data);
      return { data: JSON.stringify(parsedData) };
    } catch (error) {
      console.error('Failed to parse JSON data:', error);
      return { data: request.data.toString() };
    }
  } else if (contentType && (contentType.includes('application/xml') || contentType.includes('text/plain'))) {
    return { data: request.data };
  }

  const parsedQueryString = querystring.parse(request.data, { sort: false });
  // if missing `=`, `query-string` will set value as `null`. Reset value as empty string ('') here.
  // https://github.com/sindresorhus/query-string/blob/3d8fbf2328220c06e45f166cdf58e70617c7ee68/base.js#L364-L366
  Object.keys(parsedQueryString).forEach((key) => {
    if (parsedQueryString[key] === null) {
      parsedQueryString[key] = '';
    }
  });
  const keyCount = Object.keys(parsedQueryString).length;
  const singleKeyOnly = keyCount === 1 && !parsedQueryString[Object.keys(parsedQueryString)[0]];
  const singularData = request.isDataBinary || singleKeyOnly;
  if (singularData) {
    const data = {};
    data[repr(request.data)] = '';
    return { data: data };
  } else {
    return getMultipleDataString(request, parsedQueryString);
  }
}

function getMultipleDataString(request, parsedQueryString) {
  const data = {};

  for (const key in parsedQueryString) {
    const value = parsedQueryString[key];
    if (Array.isArray(value)) {
      data[repr(key)] = value;
    } else {
      data[repr(key)] = repr(value);
    }
  }

  return { data: data };
}

function getFilesString(request) {
  const data = {};

  data.files = {};
  data.data = {};

  for (const multipartKey in request.multipartUploads) {
    const multipartValue = request.multipartUploads[multipartKey];
    if (multipartValue.startsWith('@')) {
      const fileName = multipartValue.slice(1);
      data.files[repr(multipartKey)] = repr(fileName);
    } else {
      data.data[repr(multipartKey)] = repr(multipartValue);
    }
  }

  if (Object.keys(data.files).length === 0) {
    delete data.files;
  }

  if (Object.keys(data.data).length === 0) {
    delete data.data;
  }

  return data;
}

const curlToJson = (curlCommand) => {
  const request = parseCurlCommand(curlCommand);

  const requestJson = {};

  // curl automatically prepends 'http' if the scheme is missing, but python fails and returns an error
  // we tack it on here to mimic curl
  if (!request.url.match(/https?:/)) {
    request.url = 'http://' + request.url;
  }
  if (!request.urlWithoutQuery.match(/https?:/)) {
    request.urlWithoutQuery = 'http://' + request.urlWithoutQuery;
  }

  requestJson.url = request.urlWithoutQuery;
  requestJson.raw_url = request.url;
  requestJson.method = request.method;

  if (request.cookies) {
    const cookies = {};
    for (const cookieName in request.cookies) {
      cookies[repr(cookieName)] = repr(request.cookies[cookieName]);
    }

    requestJson.cookies = cookies;
  }

  if (request.headers) {
    const headers = {};
    for (const headerName in request.headers) {
      headers[repr(headerName)] = repr(request.headers[headerName]);
    }

    requestJson.headers = headers;
  }

  if (request.query) {
    requestJson.queries = getQueries(request);
  }

  if (typeof request.data === 'string' || typeof request.data === 'number') {
    Object.assign(requestJson, getDataString(request));
  } else if (request.multipartUploads) {
    Object.assign(requestJson, getFilesString(request));
  }

  if (request.insecure) {
    requestJson.insecure = false;
  }

  if (request.auth) {
    if (request.auth.mode === 'basic') {
      requestJson.auth = {
        mode: 'basic',
        basic: {
          username: repr(request.auth.basic?.username),
          password: repr(request.auth.basic?.password)
        }
      };
    }
  }

  return Object.keys(requestJson).length ? requestJson : {};
};

export default curlToJson;
