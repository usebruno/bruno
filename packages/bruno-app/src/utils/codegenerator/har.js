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
    default:
      return '';
  }
};

const createHeaders = (request, headers) => {
  const enabledHeaders = headers
    .filter((header) => header.enabled)
    .map((header) => ({
      name: header.name,
      value: header.value
    }));

  const contentType = createContentType(request.body?.mode);
  if (contentType !== '') {
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
  if (body.mode === 'formUrlEncoded' || body.mode === 'multipartForm') {
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
  } else {
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
    bodySize: 0
  };
};
