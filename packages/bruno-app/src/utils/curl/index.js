import * as parse from 'parse-curl';
import { BrunoError } from 'utils/common/error';
import { parseQueryParams } from 'utils/url';

export const getRequestFromCurlCommand = (command) => {
  const parseFormData = (parsedBody) => {
    parseQueryParams(parsedBody);
  };
  try {
    const request = parse(command);
    const parsedHeader = request?.header;
    const headers =
      parsedHeader && Object.keys(parsedHeader).map((key) => ({ name: key, value: parsedHeader[key], enabled: true }));

    const contentType = headers?.find((h) => h.name.toLowerCase() === 'content-type');
    const body = {
      mode: 'none',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      multipartForm: null,
      formUrlEncoded: null
    };
    const parsedBody = request?.body;
    if (parsedBody && contentType) {
      switch (contentType.value.toLowerCase()) {
        case 'application/json':
          body.mode = 'json';
          body.json = parsedBody;
          break;
        case 'text/xml':
          body.mode = 'xml';
          body.xml = parsedBody;
          break;
        case 'application/x-www-form-urlencoded':
          body.mode = 'formUrlEncoded';
          body.formUrlEncoded = parseFormData(parsedBody);
          break;
        case 'multipart/form-data':
          body.mode = 'multipartForm';
          body.multipartForm = parsedBody;
          break;
        case 'text/plain':
        default:
          body.mode = 'text';
          body.text = parsedBody;
          break;
      }
    }
    return {
      url: request.url,
      method: request.method,
      body,
      headers: headers
    };
  } catch (error) {
    return null;
  }
};
