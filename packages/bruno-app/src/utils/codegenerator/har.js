const getContentType = (mode) => {
  const contentTypes = {
    json: 'application/json',
    text: 'text/plain',
    xml: 'application/xml',
    sparql: 'application/sparql-query',
    formUrlEncoded: 'application/x-www-form-urlencoded',
    graphql: 'application/json',
    multipartForm: 'multipart/form-data'
  };
  return contentTypes[mode] || '';
};

const createHeaders = (request, headers) => {
  const enabledHeaders = headers
    .filter((header) => header.enabled)
    .map((header) => ({
      name: header.name,
      value: header.value
    }));

  const contentType = getContentType(request.body?.mode);
  if (contentType) {
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

const createPostData = (body) => {
  const contentType = getContentType(body.mode);

  if (body.mode === 'graphql' && body.graphql) {
    return {
      mimeType: contentType,
      text: JSON.stringify(body[body.mode])
    };
  }

  if (body.mode === 'formUrlEncoded' || body.mode === 'multipartForm') {
    return {
      mimeType: contentType,
      params: body[body.mode]
        .filter((param) => param.enabled)
        .map(({ name, value, type }) => ({
          name,
          value,
          ...(type === 'file' && { fileName: value })
        }))
    };
  }

  return {
    mimeType: contentType,
    text: body[body.mode]
  };
};

export const buildHarRequest = ({ request, headers }) => {
  return {
    method: request.method,
    url: encodeURI(request.url),
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headers: createHeaders(request, headers),
    queryString: createQuery(request.params),
    postData: createPostData(request.body),
    headersSize: 0,
    bodySize: 0
  };
};
