import url from 'url';

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

const createQuery = (queryParams = [], request) => {
  const params = queryParams
    .filter((param) => param.enabled && param.type === 'query')
    .map((param) => ({
      name: param.name,
      value: param.value
    }));

  if (
    request?.auth?.mode === 'apikey'
    && request?.auth?.apikey?.placement === 'queryparams'
    && request?.auth?.apikey?.key
    && request?.auth?.apikey?.value
  ) {
    params.push({
      name: request.auth.apikey.key,
      value: request.auth.apikey.value
    });
  }

  return params;
};

const createPostData = (body) => {
  const contentType = createContentType(body.mode);

  switch (body.mode) {
    case 'formUrlEncoded':
      return {
        mimeType: contentType,
        text: new URLSearchParams(
          (Array.isArray(body[body.mode]) ? body[body.mode] : [])
            .filter((param) => param?.enabled)
            .reduce((acc, param) => {
              acc[param.name] = param.value;
              return acc;
            }, {})
        ).toString(),
        params: (Array.isArray(body[body.mode]) ? body[body.mode] : [])
          .filter((param) => param?.enabled)
          .map((param) => ({
            name: param.name,
            value: param.value
          }))
      };
    case 'multipartForm':
      return {
        mimeType: contentType,
        params: (Array.isArray(body[body.mode]) ? body[body.mode] : [])
          .filter((param) => param?.enabled)
          .map((param) => ({
            name: param.name,
            value: param.value,
            ...(param.type === 'file' && { fileName: param.value })
          }))
      };
    case 'file': {
      const files = Array.isArray(body[body.mode]) ? body[body.mode] : [];
      const selectedFile = files.find((param) => param.selected) || files[0];
      const filePath = selectedFile?.filePath || '';
      return {
        mimeType: selectedFile?.contentType || 'application/octet-stream',
        text: filePath,
        params: filePath
          ? [
              {
                name: selectedFile?.name || 'file',
                value: filePath,
                fileName: filePath,
                contentType: selectedFile?.contentType || 'application/octet-stream'
              }
            ]
          : []
      };
    }
    case 'graphql':
      return {
        mimeType: contentType,
        text: JSON.stringify(body[body.mode])
      };
    default:
      return {
        mimeType: contentType,
        text: body[body.mode]
      };
  }
};

export const buildHarRequest = ({ request, headers }) => {
  // NOTE:
  // This is just a safety check.
  // The interpolateUrlPathParams method validates the url, but it does not throw
  if (!url.parse(request.url)) {
    throw new Error('invalid request url');
  }

  return {
    method: request.method,
    url: request.url,
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headers: createHeaders(request, headers),
    queryString: createQuery(request.params, request),
    postData: createPostData(request.body),
    headersSize: 0,
    bodySize: 0,
    binary: true
  };
};
