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
      return 'application/json';
  }
};

const createHeaders = (headers, mode) => {
  const contentType = createContentType(mode);
  const headersArray = headers
    .filter((header) => header.enabled)
    .map((header) => {
      return {
        name: header.name,
        value: header.value
      };
    });
  const headerNames = headersArray.map((header) => header.name);
  if (!headerNames.includes('Content-Type')) {
    return [...headersArray, { name: 'Content-Type', value: contentType }];
  }
  return headersArray;
};

const createQuery = (url) => {
  const params = new URLSearchParams(url);
  return params.forEach((value, name) => {
    return {
      name,
      value
    };
  });
};

const createPostData = (body) => {
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

const createUrl = (request) => {
  let url = request.url;
  const variablePattern = /\{\{([^}]+)\}\}/g;
  const variables = request.url.match(variablePattern);
  if (variables) {
    variables.forEach((variable) => {
      const variableName = variable.replaceAll('{', '').replaceAll('}', '');
      const variableValue = request.vars.req.find((v) => v.name === variableName).value;
      url = url.replace(variable, variableValue);
    });
  }
  return url;
};

export const buildHarRequest = (request) => {
  return {
    method: request.method,
    url: createUrl(request),
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headers: createHeaders(request.headers, request.body.mode),
    queryString: createQuery(request.url),
    postData: createPostData(request.body),
    headersSize: 0,
    bodySize: 0
  };
};
