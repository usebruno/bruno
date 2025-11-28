import { forOwn } from 'lodash';
import curlToJson from './curl-to-json';
import { prettifyJsonString } from 'utils/common/index';
import { isJsonLikeContentType, isPlainTextContentType, isXmlLikeContentType } from './content-type';

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
    if (!request || !request.url) {
      return null;
    }

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
      graphql: null,
      file: null
    };

    if (parsedBody && contentType && typeof contentType === 'string') {
      const normalizedContentType = contentType.toLowerCase();

      if (requestType === 'graphql-request' && (isJsonLikeContentType(contentType) || normalizedContentType.includes('application/graphql'))) {
        body.mode = 'graphql';
        body.graphql = parseGraphQL(parsedBody);
      } else if (requestType === 'http-request' && request.isDataBinary) {
        body.mode = 'file';
        body.file = parsedBody;
      } else if (isJsonLikeContentType(contentType)) {
        body.mode = 'json';
        body.json = prettifyJsonString(parsedBody);
      } else if (isXmlLikeContentType(contentType) || normalizedContentType.includes('xml')) {
        body.mode = 'xml';
        body.xml = parsedBody;
      } else if (normalizedContentType.includes('application/x-www-form-urlencoded')) {
        body.mode = 'formUrlEncoded';
        body.formUrlEncoded = parseFormData(parsedBody);
      } else if (normalizedContentType.includes('multipart/form-data')) {
        body.mode = 'multipartForm';
        body.multipartForm = parsedBody;
      } else if (isPlainTextContentType(contentType)) {
        body.mode = 'text';
        body.text = parsedBody;
      }
    } else if (parsedBody) {
      body.mode = 'formUrlEncoded';
      body.formUrlEncoded = parseFormData(parsedBody);
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
