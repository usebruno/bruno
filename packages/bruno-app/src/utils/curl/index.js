import { forOwn } from 'lodash';
import { convertToCodeMirrorJson } from 'utils/common';
import curlToJson from './curl-to-json';

export const getRequestFromCurlCommand = (curlCommand) => {
  const parseFormData = (parsedBody) => {
    const formData = [];
    forOwn(parsedBody, (value, key) => {
      formData.push({ name: key, value, enabled: true });
    });

    return formData;
  };

  const identifyRequestType = (url, headers, body) => {
    if (url.endsWith('/graphql')) {
      return 'graphql-request';
    }

    const contentType = headers?.find((h) => h.name.toLowerCase() === 'content-type')?.value;
    if (contentType && contentType.includes('application/graphql')) {
      return 'graphql-request';
    }

    if (body.json && (body.json.query || body.json.mutation)) {
      return 'graphql-request';
    }

    return 'http-request';
  };

  try {
    if (!curlCommand || typeof curlCommand !== 'string' || curlCommand.length === 0) {
      return null;
    }

    const request = curlToJson(curlCommand);
    const parsedHeaders = request?.headers;
    const headers =
      parsedHeaders &&
      Object.keys(parsedHeaders).map((key) => ({ name: key, value: parsedHeaders[key], enabled: true }));

    const contentType = headers?.find((h) => h.name.toLowerCase() === 'content-type')?.value;
    const body = {
      mode: 'none',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      multipartForm: null,
      formUrlEncoded: null
    };
    const parsedBody = request.data;
    if (parsedBody && contentType && typeof contentType === 'string') {
      if (contentType.includes('application/json')) {
        body.mode = 'json';
        body.json = convertToCodeMirrorJson(parsedBody);
      } else if (contentType.includes('text/xml')) {
        body.mode = 'xml';
        body.xml = parsedBody;
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        body.mode = 'formUrlEncoded';
        body.formUrlEncoded = parseFormData(parsedBody);
      } else if (contentType.includes('multipart/form-data')) {
        body.mode = 'multipartForm';
        body.multipartForm = parsedBody;
      } else if (contentType.includes('text/plain')) {
        body.mode = 'text';
        body.text = parsedBody;
      }
    }

    const requestType = identifyRequestType(request.url, headers, body);

    return {
      url: request.url,
      method: request.method,
      body,
      headers: headers,
      auth: request.auth,
      type: requestType
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
