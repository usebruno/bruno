import { forOwn } from 'lodash';
import { convertToCodeMirrorJson } from 'utils/common';
import curlToJson from './curl-to-json';

export const getRequestFromCurlCommand = (curlCommand, requestType = 'http-request') => {
  const parseFormData = (parsedBody) => {
    const formData = [];
    forOwn(parsedBody, (value, key) => {
      formData.push({ name: key, value, enabled: true });
    });

    return formData;
  };

  const parseGraphQL = (text) => {
    try {
      const graphql = JSON.parse(text);

      return {
        query: graphql.query,
        variables: JSON.stringify(graphql.variables, null, 2)
      };
    } catch (e) {
      return {
        query: '',
        variables: ''
      };
    }
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
    const parsedBody = request.data;

    const body = {
      mode: 'none',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      multipartForm: null,
      formUrlEncoded: null,
      graphql: null
    };

    if (parsedBody && contentType && typeof contentType === 'string') {
      if (requestType === 'graphql-request' && (contentType.includes('application/json') || contentType.includes('application/graphql'))) {
        body.mode = 'graphql';
        body.graphql = parseGraphQL(parsedBody);
      } else if (contentType.includes('application/json')) {
        body.mode = 'json';
        body.json = convertToCodeMirrorJson(parsedBody);
      } else if (contentType.includes('xml')) {
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
    return {
      url: request.url,
      method: request.method,
      body,
      headers: headers,
      auth: request.auth
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
