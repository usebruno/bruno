const createContentType = (mode) => {
  switch (mode) {
    case 'json':
      return 'application/json';
    case 'text':
      return 'text/plain';
    case 'xml':
      return 'application/xml';
    case 'sparql':
      return 'application/sparql-query';
    case 'formUrlEncoded':
      return 'application/x-www-form-urlencoded';
    case 'graphql':
      return 'application/json';
    case 'multipartForm':
      return 'multipart/form-data';
    case 'file':
      return 'application/octet-stream';
    default:
      return '';
  }
};

/**
 * Creates a list of enabled headers for the request, ensuring no duplicate content-type headers.
 *
 * @param {Object} request - The request object.
 * @param {Object[]} headers - The array of header objects, each containing name, value, and enabled properties.
 * @returns {Object[]} - An array of enabled headers with normalized names and values.
 */
const createHeaders = (request, headers) => {
  const enabledHeaders = headers
    .filter((header) => header.enabled)
    .map((header) => ({
      name: header.name.toLowerCase(),
      value: header.value
    }));

  const contentType = createContentType(request.body?.mode);
  if (contentType !== '' && !enabledHeaders.some((header) => header.name === 'content-type')) {
    enabledHeaders.push({ name: 'content-type', value: contentType });
  }

  return enabledHeaders;
};

const createQuery = (queryParams = []) => {
  return queryParams
    .filter((param) => param.enabled && param.type === 'query')
    .map((param) => ({
      name: param.name,
      value: param.value
    }));
};

const createPostData = (body, type) => {
  if (type === 'graphql-request') {
    return {
      mimeType: 'application/json',
      text: JSON.stringify(body[body.mode])
    };
  }

  const contentType = createContentType(body.mode);

  switch (body.mode) {
    case 'formUrlEncoded':
      return {
        mimeType: contentType,
        text: new URLSearchParams(
          body[body.mode]
            .filter((param) => param.enabled)
            .reduce((acc, param) => {
              acc[param.name] = param.value;
              return acc;
            }, {})
        ).toString(),
        params: body[body.mode]
          .filter((param) => param.enabled)
          .map((param) => ({
            name: param.name,
            value: param.value
          }))
      };
    case 'multipartForm':
      return {
        mimeType: contentType,
        params: body[body.mode]
          .filter((param) => param.enabled)
          .map((param) => ({
            name: param.name,
            value: param.value,
            ...(param.type === 'file' && { fileName: param.value })
          }))
      };
    case 'file':
      return {
        mimeType: body[body.mode].filter((param) => param.enabled)[0].contentType,
        params: body[body.mode]
          .filter((param) => param.selected)
          .map((param) => ({
            value: param.filePath,
          }))
      };
    default:
      return {
        mimeType: contentType,
        text: body[body.mode]
      };
  }
};

export const buildHarRequest = ({ request, headers, type }) => {
  return {
    method: request.method,
    url: encodeURI(request.url),
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headers: createHeaders(request, headers),
    queryString: createQuery(request.params),
    postData: createPostData(request.body, type),
    headersSize: 0,
    bodySize: 0,
    binary: true
  };
};
