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

// Encode [] and lone % for HAR (same as normalizeUrlForHar) so queryString entries pass validation
const encodeQueryParamSegment = (s) => {
  if (s == null || typeof s !== 'string') return s;
  return s
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D')
    .replace(/%(?![0-9A-Fa-f]{2})/g, BRUNO_PERCENT_SENTINEL);
};

const createQuery = (queryParams = [], request) => {
  const params = queryParams
    .filter((param) => param.enabled && param.type === 'query')
    .map((param) => ({
      name: encodeQueryParamSegment(param.name),
      value: encodeQueryParamSegment(param.value)
    }));

  if (request?.auth?.mode === 'apikey'
    && request?.auth?.apikey?.placement === 'queryparams'
    && request?.auth?.apikey?.key
    && request?.auth?.apikey?.value) {
    params.push({
      name: encodeQueryParamSegment(request.auth.apikey.key),
      value: encodeQueryParamSegment(request.auth.apikey.value)
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

// Placeholder used so {{ variable }} in URL doesn't break HAR/HTTPSnippet validation. Restored in snippet post-process.
const BRUNO_VAR_PLACEHOLDER_PREFIX = '__BRUNO_VAR__';
const BRUNO_VAR_PLACEHOLDER_SUFFIX = '__';

// Sentinel for lone '%' (not part of %XX). Restored to '%' in snippet post-process; avoids blindly decoding all %25.
export const BRUNO_PERCENT_SENTINEL = '__BRUNO_PERCENT__';

/**
 * Normalize URL for HAR/HTTPSnippet:
 * - Variables {{ }} -> replaced with placeholder (restored in snippet post-process)
 * - Brackets [] -> encode to %5B%5D
 * - Lone % (not part of %XX) -> replaced with BRUNO_PERCENT_SENTINEL (restored in snippet post-process)
 */
const normalizeUrlForHar = (url) => {
  if (!url || typeof url !== 'string') return url;

  // 1) Replace {{ variableName }} with placeholder so URL passes validation
  let out = url.replace(/\{\{\s*([^}]*?)\s*\}\}/g, (_, varName) => {
    const name = (varName || '').trim();
    return name ? `${BRUNO_VAR_PLACEHOLDER_PREFIX}${name}${BRUNO_VAR_PLACEHOLDER_SUFFIX}` : '';
  });

  // 2) Encode [] and replace lone % with sentinel (only lone % not part of %XX)
  const encodeSegment = (s) => {
    return s
      .replace(/\[/g, '%5B')
      .replace(/\]/g, '%5D')
      .replace(/%(?![0-9A-Fa-f]{2})/g, BRUNO_PERCENT_SENTINEL);
  };

  const qIndex = out.indexOf('?');
  if (qIndex === -1) {
    out = encodeSegment(out);
  } else {
    const base = out.slice(0, qIndex);
    const query = out.slice(qIndex + 1);
    out = `${encodeSegment(base)}?${encodeSegment(query)}`;
  }

  return out;
};

export const buildHarRequest = ({ request, headers }) => {
  let requestUrl = request.url || '';

  requestUrl = normalizeUrlForHar(requestUrl);

  return {
    method: request.method,
    url: requestUrl,
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
