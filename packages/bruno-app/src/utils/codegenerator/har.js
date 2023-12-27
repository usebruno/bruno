const createContentType = (mode) => {
  switch (mode) {
    case 'json':
      return 'application/json';
    case 'xml':
      return 'application/xml';
    case 'formUrlEncoded':
      return 'application/x-www-form-urlencoded';
    case 'multipartForm':
      return 'multipart/form-data';
    default:
      return '';
  }
};

const createHeaders = (headers, type) => {
  const result = headers
    .filter((header) => header.enabled)
    .map((header) => ({
      name: header.name,
      value: header.value
    }));

  // TODO in this PR, make sure that the content type application/json is added to the headers by default
  if (type === 'graphql-request') {
    result.push({
      name: 'Content-Type',
      value: 'application/json'
    });
  }
  return result;
};

const createQuery = (queryParams = []) => {
  return queryParams
    .filter((param) => param.enabled)
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
        .map((param) => ({ name: param.name, value: param.value }))
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
    url: request.url,
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headers: createHeaders(headers, type),
    queryString: createQuery(request.params),
    postData: createPostData(request.body, type),
    headersSize: 0,
    bodySize: 0
  };
};
